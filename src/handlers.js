// Обработка апдейтов Telegram. Доступ только у владельца (env.OWNER_ID).
// Команды обслуживаются напрямую (без LLM, бесплатно); свободный текст идёт ассистенту.

import * as db from "./db.js";
import * as tg from "./telegram.js";
import { handleUserText } from "./assistant.js";
import { fmtLocal, validTz } from "./time.js";
import { DEFAULT_TZ } from "./config.js";

function authorized(env, userId) {
  const owner = Number(env.OWNER_ID || 0);
  return !owner || userId === owner;
}

export async function handleUpdate(env, update) {
  if (update.message) return handleMessage(env, update.message);
  if (update.callback_query) return handleCallback(env, update.callback_query);
}

async function handleMessage(env, msg) {
  const from = msg.from;
  const text = (msg.text || "").trim();
  if (!from || !text) return;
  const uid = from.id;
  const chatId = msg.chat.id;
  if (!authorized(env, uid)) {
    await tg.sendMessage(env, chatId, "Это личный ассистент. Доступа нет.");
    return;
  }

  if (text.startsWith("/")) return handleCommand(env, uid, chatId, text);

  // Свободный текст -> ассистент (LLM).
  await db.ensureUser(env, uid, chatId);
  const prof = await db.getProfile(env, uid);
  await tg.sendChatAction(env, chatId, "typing");
  try {
    const reply = await handleUserText(env, uid, prof.tz, text);
    await tg.sendMessage(env, chatId, reply);
  } catch (e) {
    console.log("assistant error:", e && e.stack || e);
    await tg.sendMessage(env, chatId, "Упс, не смог обработать: " + (e && e.message || e));
  }
}

async function handleCommand(env, uid, chatId, text) {
  const [cmdRaw, ...args] = text.split(/\s+/);
  const cmd = cmdRaw.split("@")[0].toLowerCase();

  switch (cmd) {
    case "/start": return cmdStart(env, uid, chatId);
    case "/help": return cmdHelp(env, chatId);
    case "/tasks": return cmdTasks(env, uid, chatId);
    case "/notes": return cmdNotes(env, uid, chatId);
    case "/reminders": return cmdReminders(env, uid, chatId);
    case "/tz": return cmdTz(env, uid, chatId, args);
    case "/pause": return cmdPause(env, uid, chatId, args);
    case "/resume": return cmdResume(env, uid, chatId);
    default: return tg.sendMessage(env, chatId, "Не знаю команду. /help");
  }
}

async function cmdStart(env, uid, chatId) {
  const isNew = await db.ensureUser(env, uid, chatId);
  const hi = isNew ? "Привет! " : "С возвращением! ";
  await tg.sendMessage(env, chatId,
    hi + "Я твой личный ассистент. Просто пиши мне обычным текстом:\n\n" +
    "• «запиши, что пароль от вайфая 1234» — запомню заметку\n" +
    "• «задали физику §12 к пятнице» — заведу задачу со сроком\n" +
    "• «сделал физику» — отмечу выполненной\n" +
    "• «что по домашке?» — покажу, что открыто\n" +
    "• «напоминай каждый вечер в 20:00 про английский» — поставлю напоминание\n\n" +
    "Утром пришлю план, вечером — итоги дня.\n" +
    "Команды: /tasks /notes /reminders /tz /pause /help");
}

function cmdHelp(env, chatId) {
  return tg.sendMessage(env, chatId,
    "Пиши свободным текстом — я сам разберу на заметки, задачи и напоминания.\n\n" +
    "Команды:\n" +
    "/tasks — открытые задачи\n" +
    "/notes — последние заметки\n" +
    "/reminders — активные напоминания\n" +
    "/tz Asia/Yekaterinburg — часовой пояс\n" +
    "/pause N — пауза на N дней\n" +
    "/resume — снять паузу");
}

async function cmdTasks(env, uid, chatId) {
  const prof = await db.getProfile(env, uid);
  if (!prof) return tg.sendMessage(env, chatId, "Напиши /start сначала.");
  const rows = await db.listTasks(env, uid, "open", 100);
  if (!rows.length) return tg.sendMessage(env, chatId, "Открытых задач нет. 🙌");
  const lines = ["📋 Открытые задачи:"];
  rows.forEach((t) => {
    const due = t.due_at ? ` — до ${fmtLocal(t.due_at, prof.tz)}` : "";
    const subj = t.subject ? ` [${t.subject}]` : "";
    lines.push(`• #${t.id} ${t.title}${subj}${due}`);
  });
  await tg.sendMessage(env, chatId, lines.join("\n"));
}

async function cmdNotes(env, uid, chatId) {
  const rows = await db.searchNotes(env, uid, "", 20);
  if (!rows.length) return tg.sendMessage(env, chatId, "Заметок пока нет.");
  const lines = ["🗒 Последние заметки:"];
  rows.forEach((n) => lines.push(`• #${n.id} ${n.text}${n.tags ? " [" + n.tags + "]" : ""}`));
  await tg.sendMessage(env, chatId, lines.join("\n"));
}

async function cmdReminders(env, uid, chatId) {
  const prof = await db.getProfile(env, uid);
  const rows = await db.listReminders(env, uid);
  if (!rows.length) return tg.sendMessage(env, chatId, "Активных напоминаний нет.");
  const lines = ["⏰ Напоминания:"];
  rows.forEach((r) => lines.push(`• #${r.id} ${r.kind === "recurring" ? "🔁" : "⏰"} ${r.text} — ${fmtLocal(r.next_fire_at, prof.tz)}`));
  await tg.sendMessage(env, chatId, lines.join("\n"));
}

async function cmdTz(env, uid, chatId, args) {
  const prof = await db.getProfile(env, uid);
  if (!args[0]) return tg.sendMessage(env, chatId, `Часовой пояс: ${prof ? prof.tz : DEFAULT_TZ}\nСменить: /tz Asia/Yekaterinburg`);
  if (!validTz(args[0])) return tg.sendMessage(env, chatId, "Не знаю такой пояс. Пример: /tz Asia/Yekaterinburg");
  await db.ensureUser(env, uid, chatId);
  await db.setTz(env, uid, args[0]);
  await tg.sendMessage(env, chatId, `Ок, часовой пояс: ${args[0]}.`);
}

async function cmdPause(env, uid, chatId, args) {
  let days = 1;
  if (args[0] && /^\d+$/.test(args[0])) days = Math.max(1, parseInt(args[0], 10));
  const until = Date.now() + days * 86400000;
  await db.ensureUser(env, uid, chatId);
  await db.setActive(env, uid, 0, until);
  const prof = await db.getProfile(env, uid);
  await tg.sendMessage(env, chatId, `⏸ Пауза на ${days} дн. — до ${fmtLocal(until, prof.tz)}. Напоминания и обзоры молчат. /resume раньше.`);
}

async function cmdResume(env, uid, chatId) {
  await db.setActive(env, uid, 1, null);
  await tg.sendMessage(env, chatId, "▶️ Снова на связи.");
}

async function handleCallback(env, q) {
  // Пока инлайн-кнопок нет — просто подтверждаем.
  await tg.answerCallbackQuery(env, q.id);
}
