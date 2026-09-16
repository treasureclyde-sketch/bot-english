// Обработка апдейтов Telegram. Доступ только у владельца (env.OWNER_ID).
// Команды обслуживаются напрямую (без LLM, бесплатно); свободный текст идёт ассистенту.

import * as db from "./db.js";
import * as tg from "./telegram.js";
import { handleUserText } from "./assistant.js";
import { awayReply } from "./away.js";
import { fmtLocal, validTz } from "./time.js";
import { taskKeyboard } from "./ui.js";
import { DEFAULT_TZ } from "./config.js";

function authorized(env, userId) {
  const owner = Number(env.OWNER_ID || 0);
  return !owner || userId === owner;
}

export async function handleUpdate(env, update) {
  if (update.message) return handleMessage(env, update.message);
  if (update.callback_query) return handleCallback(env, update.callback_query);
  if (update.business_connection) return handleBusinessConnection(env, update.business_connection);
  if (update.business_message) return handleBusinessMessage(env, update.business_message);
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
    case "/away": return cmdAway(env, uid, chatId, args);
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
    "Утром пришлю план, вечером — итоги дня.\n\n" +
    "А ещё умею отвечать за тебя в переписках, когда ты недоступен " +
    "(Telegram Business) — команда /away. Подробнее в /help.\n\n" +
    "Команды: /tasks /notes /reminders /tz /away /pause /help");
}

function cmdHelp(env, chatId) {
  return tg.sendMessage(env, chatId,
    "Пиши свободным текстом — я сам разберу на заметки, задачи и напоминания.\n\n" +
    "Команды:\n" +
    "/tasks — открытые задачи\n" +
    "/notes — последние заметки\n" +
    "/reminders — активные напоминания\n" +
    "/tz Asia/Yekaterinburg — часовой пояс\n" +
    "/away on|off — автоответ в бизнес-чатах от твоего лица\n" +
    "/pause N — пауза на N дней\n" +
    "/resume — снять паузу");
}

// Текст + клавиатура открытых задач (используется в /tasks и при нажатии кнопки).
async function renderTaskList(env, uid, tz) {
  const rows = await db.listTasks(env, uid, "open", 100);
  if (!rows.length) return { text: "Открытых задач нет. 🙌", keyboard: { inline_keyboard: [] } };
  const lines = ["📋 Открытые задачи (жми ✅, когда сделал):"];
  rows.forEach((t) => {
    const due = t.due_at ? ` — до ${fmtLocal(t.due_at, tz)}` : "";
    const subj = t.subject ? ` [${t.subject}]` : "";
    lines.push(`• #${t.id} ${t.title}${subj}${due}`);
  });
  return { text: lines.join("\n"), keyboard: taskKeyboard(rows) };
}

async function cmdTasks(env, uid, chatId) {
  const prof = await db.getProfile(env, uid);
  if (!prof) return tg.sendMessage(env, chatId, "Напиши /start сначала.");
  const { text, keyboard } = await renderTaskList(env, uid, prof.tz);
  await tg.sendMessage(env, chatId, text, { replyMarkup: keyboard });
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

// --- Telegram Business: автоответ от лица владельца --------------------------
async function cmdAway(env, uid, chatId, args) {
  await db.ensureUser(env, uid, chatId);
  const arg = (args[0] || "").toLowerCase();
  const on = ["on", "вкл", "1", "да"].includes(arg);
  const off = ["off", "выкл", "0", "нет", "стоп"].includes(arg);
  const prof = await db.getProfile(env, uid);

  if (!on && !off) {
    const state = prof && prof.away ? "включён 🟢" : "выключен ⚪️";
    return tg.sendMessage(env, chatId,
      `Автоответ от твоего лица: ${state}.\nВключить: /away on · выключить: /away off.`);
  }
  if (off) {
    await db.setAway(env, uid, 0);
    return tg.sendMessage(env, chatId, "⏹ Автоответ выключен — снова отвечаешь сам.");
  }
  // on
  if (!prof.biz_conn_id || !prof.biz_can_reply) {
    return tg.sendMessage(env, chatId,
      "Сначала подключи меня как бизнес-бота:\nTelegram → Настройки → «Telegram для бизнеса» → Чат-боты → выбери этого бота, дай право «Отвечать на сообщения» и укажи нужные чаты вручную.\nПотом снова /away on.");
  }
  await db.setAway(env, uid, 1);
  return tg.sendMessage(env, chatId,
    "✅ Автоответ включён — отвечаю в выбранных чатах от твоего лица, коротко и в твоём стиле. " +
    "Политику и рискованные темы обхожу, обязательств за тебя не даю. /away off — выключить.");
}

async function handleBusinessConnection(env, conn) {
  const ownerId = conn.user && conn.user.id;
  if (!ownerId) return;
  const owner = Number(env.OWNER_ID || 0);
  if (owner && ownerId !== owner) return; // чужой аккаунт — игнор
  await db.ensureUser(env, ownerId, conn.user_chat_id || ownerId);

  const rights = conn.rights || {};
  const canReply = (conn.can_reply ?? rights.can_reply) ? 1 : 0;
  const enabled = conn.is_enabled === false ? 0 : 1;
  await db.setBusinessConnection(env, ownerId, enabled ? conn.id : null, enabled ? canReply : 0);

  const prof = await db.getProfile(env, ownerId);
  const to = (prof && prof.chat_id) || conn.user_chat_id;
  if (!to) return;
  let note;
  if (!enabled) note = "🔌 Бизнес-бот отключён.";
  else if (!canReply) note = "🔗 Подключён, но без права отвечать. Дай право «Отвечать на сообщения» в настройках, потом /away on.";
  else note = "🔗 Бизнес-бот подключён и может отвечать. Когда будешь недоступен — включай /away on.";
  await tg.sendMessage(env, to, note);
}

async function handleBusinessMessage(env, msg) {
  const owner = Number(env.OWNER_ID || 0);
  if (!owner) return;
  const prof = await db.getProfile(env, owner);
  if (!prof || !prof.biz_conn_id || prof.biz_conn_id !== msg.business_connection_id) return;

  const fromId = msg.from && msg.from.id;
  const chatId = msg.chat && msg.chat.id;
  const text = msg.text;
  if (!chatId) return;

  // Сообщение самого владельца (печатает вручную) — запоминаем как контекст, не отвечаем.
  if (fromId === owner) {
    if (text) await db.addBizMessage(env, owner, chatId, "me", text);
    return;
  }

  // Входящее от собеседника.
  if (!text) return; // на не-текст (стикеры/медиа) не отвечаем
  await db.addBizMessage(env, owner, chatId, "them", text);

  if (!prof.away || !prof.biz_can_reply) return; // автоответ выключен

  const reply = await awayReply(env, owner, chatId);
  if (!reply) return; // модель решила промолчать (скользкая тема / реакция)
  await tg.sendMessage(env, chatId, reply, { businessConnectionId: prof.biz_conn_id });
  await db.addBizMessage(env, owner, chatId, "me", reply);
  await db.trimBizMessages(env, owner, chatId, 30);
}

async function handleCallback(env, q) {
  const from = q.from;
  if (!from || !authorized(env, from.id)) {
    return tg.answerCallbackQuery(env, q.id, "Нет доступа");
  }
  const uid = from.id;
  const chatId = q.message.chat.id;
  const messageId = q.message.message_id;
  const [action, idStr] = (q.data || "").split(":");

  if (action === "done") {
    const id = Number(idStr);
    const task = await db.getTask(env, uid, id);
    if (!task) return tg.answerCallbackQuery(env, q.id, "Задача уже неактуальна");
    if (task.status !== "done") await db.completeTask(env, uid, id);
    await tg.answerCallbackQuery(env, q.id, `✅ ${task.title.slice(0, 60)}`);
    // Перерисовываем сообщение под актуальный список открытых задач.
    const prof = await db.getProfile(env, uid);
    const { text, keyboard } = await renderTaskList(env, uid, prof.tz);
    await tg.editMessageText(env, chatId, messageId, text, { replyMarkup: keyboard });
    return;
  }

  await tg.answerCallbackQuery(env, q.id);
}
