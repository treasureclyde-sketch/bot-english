// Оркестрация: собрать контекст, прогнать цикл tool-use, вернуть ответ.

import * as db from "./db.js";
import { anthropicMessages, extractText, toolUses } from "./llm.js";
import { TOOLS, executeTool } from "./tools.js";
import { localInfo, fmtLocal } from "./time.js";
import { MAX_TOOL_ITERS, HISTORY_LIMIT } from "./config.js";

const WD_RU = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];

// Стабильная часть промпта — НЕ меняется между запросами, поэтому кэшируется
// (вместе с каталогом инструментов). Никакого изменчивого контента здесь быть
// не должно, иначе кэш будет промахиваться.
const STABLE_SYSTEM =
  "Ты — личный ассистент в Telegram. Помогаешь пользователю помнить заметки, вести " +
  "домашку и задачи, и напоминаешь о делах. Отвечай по-русски, коротко и по делу, без воды. " +
  "На фактические вопросы (объяснить тему, сделать доклад и т.п.) отвечай нормально, " +
  "настолько подробно, насколько просят.\n\n" +
  "Как действовать:\n" +
  "- Что-то сказали запомнить — сам реши: это заметка (add_note) или задача с делом/сроком " +
  "(add_task). Лишний раз не переспрашивай.\n" +
  "- Пишут, что сделали дело — найди подходящую открытую задачу в блоке состояния и вызови " +
  "complete_task с её id.\n" +
  "- Просят напомнить — add_reminder (разовое 'at' или повторяющееся 'recurrence').\n" +
  "- Даты/время считай от текущего момента из блока состояния. Не выдумывай сроки, " +
  "которых не называли.\n" +
  "- Вопрос без действия («что по домашке», «какие заметки») — отвечай из блока состояния; " +
  "инструменты list_*/search_notes зови только если нужны свежие/полные данные.\n" +
  "- Если под запрос подходит инструмент — вызывай его, а не описывай вызов словами. " +
  "Если ни один инструмент не подходит — просто ответь текстом. Не добавляй служебные " +
  "XML-теги в ответ.\n" +
  "- После действия подтверждай кратко: что записал, поставил, отметил. Без лишних слов.";

// Изменчивая часть — текущее время и состояние. Идёт ПОСЛЕ кэш-брейкпоинта,
// поэтому меняется свободно и не ломает кэш стабильного префикса.
async function buildState(env, userId, tz) {
  const now = Date.now();
  const i = localInfo(now, tz);
  const openTasks = await db.listTasks(env, userId, "open", 50);
  const reminders = await db.listReminders(env, userId);

  const tasksBlock = openTasks.length
    ? openTasks.map((t) => {
        const due = t.due_at ? ` — до ${fmtLocal(t.due_at, tz)}` : "";
        const subj = t.subject ? ` [${t.subject}]` : "";
        return `#${t.id} ${t.title}${subj}${due}`;
      }).join("\n")
    : "(пусто)";

  const remBlock = reminders.length
    ? reminders.map((r) => `#${r.id} ${r.kind === "recurring" ? "🔁" : "⏰"} ${r.text} — ${fmtLocal(r.next_fire_at, tz)}`).join("\n")
    : "(пусто)";

  return (
    `[СОСТОЯНИЕ]\nТекущее время: ${fmtLocal(now, tz)} (${tz}), сегодня ${i.dateStr}, ${WD_RU[i.weekday]}.\n\n` +
    `Открытые задачи:\n${tasksBlock}\n\nАктивные напоминания:\n${remBlock}`
  );
}

// Обработать входящее текстовое сообщение пользователя. Возвращает текст ответа.
export async function handleUserText(env, userId, tz, text) {
  await db.addMessage(env, userId, "user", text);

  const history = await db.recentMessages(env, userId, HISTORY_LIMIT);
  const messages = history.map((m) => ({ role: m.role, content: m.content }));
  while (messages.length && messages[0].role === "assistant") messages.shift();

  // Кэшируем стабильный префикс (инструкции + каталог инструментов); изменчивое
  // состояние идёт отдельным блоком после брейкпоинта.
  const state = await buildState(env, userId, tz);
  const system = [
    { type: "text", text: STABLE_SYSTEM, cache_control: { type: "ephemeral" } },
    { type: "text", text: state },
  ];

  let finalText = "";
  for (let iter = 0; iter < MAX_TOOL_ITERS; iter++) {
    const resp = await anthropicMessages(env, { system, messages, tools: TOOLS });
    const u = resp.usage || {};
    console.log(`llm iter ${iter}: in=${u.input_tokens} cache_read=${u.cache_read_input_tokens || 0} ` +
      `cache_write=${u.cache_creation_input_tokens || 0} out=${u.output_tokens} stop=${resp.stop_reason}`);

    if (resp.stop_reason === "tool_use") {
      // Сохраняем ход ассистента целиком (с thinking/tool_use) — та же модель продолжает.
      messages.push({ role: "assistant", content: resp.content });
      const results = [];
      for (const tu of toolUses(resp.content)) {
        const out = await executeTool(env, userId, tz, tu.name, tu.input);
        results.push({ type: "tool_result", tool_use_id: tu.id, content: out });
      }
      messages.push({ role: "user", content: results });
      continue;
    }

    finalText = extractText(resp.content);
    break;
  }

  if (!finalText) finalText = "Готово.";
  await db.addMessage(env, userId, "assistant", finalText);
  await db.trimMessages(env, userId, 40);
  return finalText;
}
