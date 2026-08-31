// Обработка входящих Telegram-апдейтов (команды и нажатия кнопок).
// Доступ только у владельца (env.OWNER_ID).

import {
  TRACK_ORDER, TRACK_TITLES, TRACK_CSCA, DEFAULT_TZ,
} from "./config.js";
import { CSCA_RESOURCES } from "./content.js";
import * as db from "./db.js";
import * as sched from "./scheduling.js";
import * as rem from "./reminders.js";
import * as stats from "./stats.js";
import * as tg from "./telegram.js";

function authorized(env, userId) {
  const owner = Number(env.OWNER_ID || 0);
  return !owner || userId === owner;
}

// Проверка корректности пояса через попытку форматирования.
function validTz(tz) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function handleUpdate(env, update) {
  if (update.message) return handleMessage(env, update.message);
  if (update.callback_query) return handleCallback(env, update.callback_query);
}

// --- команды ---------------------------------------------------------------
async function handleMessage(env, msg) {
  const from = msg.from;
  const text = (msg.text || "").trim();
  if (!from || !text.startsWith("/")) return;
  if (!authorized(env, from.id)) {
    await tg.sendMessage(env, msg.chat.id, "Это личный бот. Доступа нет.");
    return;
  }

  const [cmdRaw, ...args] = text.split(/\s+/);
  const cmd = cmdRaw.split("@")[0].toLowerCase();
  const uid = from.id;
  const chatId = msg.chat.id;

  switch (cmd) {
    case "/start": return cmdStart(env, uid, chatId);
    case "/help": return cmdHelp(env, chatId);
    case "/status": return cmdStatus(env, uid, chatId);
    case "/tracks": return cmdTracks(env, uid, chatId);
    case "/pause": return cmdPause(env, uid, chatId, args);
    case "/resume": return cmdResume(env, uid, chatId);
    case "/tz": return cmdTz(env, uid, chatId, args);
    case "/report": return cmdReport(env, uid, chatId);
    case "/csca": return cmdCsca(env, chatId);
    default: return tg.sendMessage(env, chatId, "Не знаю такую команду. /help");
  }
}

async function initFires(env, uid, tz) {
  for (const track of await db.getTracks(env, uid)) {
    if (track.next_fire_at == null && track.enabled) {
      await db.setNextFire(env, uid, track.track_id, sched.computeFirstFire(track, tz));
    }
  }
}

async function cmdStart(env, uid, chatId) {
  const isNew = await db.ensureUser(env, uid, chatId);
  const prof = await db.getProfile(env, uid);
  await initFires(env, uid, prof.tz);
  const hello = isNew ? "Привет! " : "С возвращением! ";
  const text = `${hello}Я держу твой ритм по трём трекам:\n\n` +
    "🎧 *6 Minute English* — каждый день, 10 мин\n" +
    "📐 *CSCA Math* — раз в 2 дня, ~40 мин\n" +
    "🧮 *Пробник ЕГЭ* — раз в неделю, ~2 ч\n\n" +
    "Воскресенье — выходной, напоминаний нет.\n\n" +
    "Команды: /status /tracks /pause /report /csca /help";
  await tg.sendMessage(env, chatId, text);
}

function cmdHelp(env, chatId) {
  return tg.sendMessage(env, chatId,
    "*Команды*\n" +
    "/status — план на сегодня и стрик\n" +
    "/tracks — треки: вкл/выкл и расписание\n" +
    "/pause N — пауза на N дней (по умолчанию 1)\n" +
    "/resume — снять паузу\n" +
    "/tz Asia/Yekaterinburg — часовой пояс\n" +
    "/report — недельный отчёт сейчас\n" +
    "/csca — ресурсы по математике\n\n" +
    "В каждом напоминании: [🔗 ссылка] [✅ Готово] [🕑 Позже] [⏭ Пропустить].");
}

async function cmdStatus(env, uid, chatId) {
  const prof = await db.getProfile(env, uid);
  if (!prof) return tg.sendMessage(env, chatId, "Напиши /start сначала.");
  const tz = prof.tz;
  const now = Date.now();
  const info = sched.localInfo(now, tz);
  const streak = await stats.computeStreak(env, uid, tz);

  const lines = [`📍 *Сегодня* (${info.dateStr}, ${tz})`, ""];
  if (!prof.active) {
    const when = prof.paused_until ? sched.localInfo(prof.paused_until, tz).dateStr : "?";
    lines.push(`⏸ На паузе до ${when}. /resume чтобы включить.`);
    return tg.sendMessage(env, chatId, lines.join("\n"));
  }
  if (sched.isQuietDay(now, tz)) lines.push("🌙 Воскресенье — выходной. Напоминаний не будет.");

  const tracks = await db.getTracks(env, uid);
  const byId = Object.fromEntries(tracks.map((t) => [t.track_id, t]));
  for (const tid of sched.orderTracks(tracks.map((t) => t.track_id))) {
    const tr = byId[tid];
    if (!tr.enabled) continue;
    const title = TRACK_TITLES[tid];
    if (tr.next_fire_at) {
      const i = sched.localInfo(tr.next_fire_at, tz);
      lines.push(`• ${title}: → ${i.dateStr} ${String(i.hh).padStart(2, "0")}:${String(i.mm).padStart(2, "0")}`);
    } else {
      lines.push(`• ${title}: не запланирован`);
    }
  }
  lines.push("");
  lines.push(`${streak ? "🔥" : "•"} Стрик: *${streak}* дн.`);
  await tg.sendMessage(env, chatId, lines.join("\n"));
}

function cadenceHuman(track) {
  let base;
  if (track.cadence === "daily") base = "каждый день";
  else if (track.cadence === "weekly") {
    const wd = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][track.weekday];
    base = `раз в неделю (${wd})`;
  } else base = `раз в ${track.n_days} дн.`;
  return `${base}, ${String(track.hour).padStart(2, "0")}:${String(track.minute).padStart(2, "0")}`;
}

async function tracksKeyboard(env, uid) {
  const rows = [];
  for (const tid of TRACK_ORDER) {
    const tr = await db.getTrack(env, uid, tid);
    if (!tr) continue;
    const mark = tr.enabled ? "🟢" : "⚪️";
    rows.push([{ text: `${mark} ${TRACK_TITLES[tid]} — ${cadenceHuman(tr)}`, callback_data: `noop:${tid}` }]);
    rows.push([
      { text: tr.enabled ? "Выключить" : "Включить", callback_data: `toggle:${tid}` },
      { text: "−1 ч", callback_data: `hour:${tid}:-1` },
      { text: "+1 ч", callback_data: `hour:${tid}:1` },
    ]);
  }
  return { inline_keyboard: rows };
}

async function cmdTracks(env, uid, chatId) {
  if (!(await db.getProfile(env, uid))) return tg.sendMessage(env, chatId, "Напиши /start сначала.");
  await tg.sendMessage(env, chatId, "*Треки*", { replyMarkup: await tracksKeyboard(env, uid) });
}

async function cmdPause(env, uid, chatId, args) {
  let days = 1;
  if (args[0] && /^\d+$/.test(args[0])) days = Math.max(1, parseInt(args[0], 10));
  const until = Date.now() + days * 86400000;
  await db.setActive(env, uid, 0, until);
  const prof = await db.getProfile(env, uid);
  const i = sched.localInfo(until, prof.tz);
  await tg.sendMessage(env, chatId,
    `⏸ Пауза на ${days} дн. — до ${i.dateStr} ${String(i.hh).padStart(2, "0")}:${String(i.mm).padStart(2, "0")}. Включу сам, или /resume раньше.`);
}

async function cmdResume(env, uid, chatId) {
  await db.setActive(env, uid, 1, null);
  const prof = await db.getProfile(env, uid);
  for (const track of await db.getTracks(env, uid)) {
    if (track.enabled) await db.setNextFire(env, uid, track.track_id, sched.computeFirstFire(track, prof.tz));
  }
  await tg.sendMessage(env, chatId, "▶️ Погнали. Напоминания снова включены.");
}

async function cmdTz(env, uid, chatId, args) {
  if (!args[0]) {
    const prof = await db.getProfile(env, uid);
    return tg.sendMessage(env, chatId, `Часовой пояс: ${prof ? prof.tz : DEFAULT_TZ}\nСменить: /tz Asia/Yekaterinburg`);
  }
  const tz = args[0];
  if (!validTz(tz)) return tg.sendMessage(env, chatId, "Не знаю такой пояс. Пример: /tz Asia/Yekaterinburg");
  await db.setTz(env, uid, tz);
  for (const track of await db.getTracks(env, uid)) {
    if (track.enabled) await db.setNextFire(env, uid, track.track_id, sched.computeFirstFire(track, tz));
  }
  await tg.sendMessage(env, chatId, `Ок, часовой пояс: ${tz}. Расписание пересчитал.`);
}

async function cmdReport(env, uid, chatId) {
  const prof = await db.getProfile(env, uid);
  if (!prof) return tg.sendMessage(env, chatId, "Напиши /start сначала.");
  await tg.sendMessage(env, chatId, await stats.weeklyReport(env, uid, prof.tz));
}

function cmdCsca(env, chatId) {
  const lines = ["📐 *CSCA Math — ресурсы*", ""];
  for (const [name, url, note] of CSCA_RESOURCES) lines.push(`• [${name}](${url}) — ${note}`);
  lines.push("");
  lines.push("_Правило: сначала прогоняй пробники и лови слабые темы, потом добивай именно их._");
  return tg.sendMessage(env, chatId, lines.join("\n"), { disablePreview: true });
}

// --- callbacks -------------------------------------------------------------
async function handleCallback(env, q) {
  const from = q.from;
  if (!authorized(env, from.id)) {
    await tg.answerCallbackQuery(env, q.id, "Нет доступа");
    return;
  }
  const uid = from.id;
  const chatId = q.message.chat.id;
  const messageId = q.message.message_id;
  const baseText = q.message.text || "";
  const parts = (q.data || "").split(":");
  const action = parts[0];

  if (action === "noop") return tg.answerCallbackQuery(env, q.id);

  if (action === "done" || action === "skip") {
    const hid = Number(parts[1]);
    const h = await db.getHistory(env, hid);
    if (!h) return tg.answerCallbackQuery(env, q.id, "Уже неактуально");
    if (action === "done") {
      await db.setHistoryStatus(env, hid, "done");
      const prof = await db.getProfile(env, uid);
      const streak = await stats.computeStreak(env, uid, prof.tz);
      await tg.answerCallbackQuery(env, q.id, "Готово 🎯");
      await finalize(env, chatId, messageId, baseText, `\n\n✅ Готово. 🔥 Стрик: ${streak} дн.`);
    } else {
      await db.setHistoryStatus(env, hid, "skipped");
      await tg.answerCallbackQuery(env, q.id, "Пропущено");
      await finalize(env, chatId, messageId, baseText, "\n\n⏭ Пропущено. Ничего, завтра новый заход.");
    }
    return;
  }

  if (action === "later") {
    const hid = Number(parts[1]);
    await tg.answerCallbackQuery(env, q.id);
    return tg.editMessageReplyMarkup(env, chatId, messageId, rem.laterKeyboard(hid));
  }

  if (action === "back") {
    const hid = Number(parts[1]);
    const h = await db.getHistory(env, hid);
    await tg.answerCallbackQuery(env, q.id);
    if (h) return tg.editMessageReplyMarkup(env, chatId, messageId, rem.actionKeyboard(hid, h.content_ref));
    return;
  }

  if (action === "post2h" || action === "posttom") {
    const hid = Number(parts[1]);
    const h = await db.getHistory(env, hid);
    if (!h) return tg.answerCallbackQuery(env, q.id, "Уже неактуально");
    await db.setHistoryStatus(env, hid, "postponed");
    const prof = await db.getProfile(env, uid);
    const kind = action === "post2h" ? "2h" : "tomorrow";
    const newMs = sched.postpone(kind, prof.tz, Date.now());
    await db.setNextFire(env, uid, h.track_id, newMs);
    const i = sched.localInfo(newMs, prof.tz);
    await tg.answerCallbackQuery(env, q.id, "Перенёс");
    await finalize(env, chatId, messageId, baseText,
      `\n\n🕑 Перенесено на ${i.dateStr} ${String(i.hh).padStart(2, "0")}:${String(i.mm).padStart(2, "0")}.`);
    return;
  }

  if (action === "why") {
    const hid = Number(parts[1]);
    const reason = parts[2];
    const h = await db.getHistory(env, hid);
    if (!h) return tg.answerCallbackQuery(env, q.id, "Уже неактуально");
    await db.setHistoryStatus(env, hid, "skipped", reason);
    if (reason === "bored") {
      await db.bumpContentIndex(env, uid, h.track_id);
      const prof = await db.getProfile(env, uid);
      await db.setNextFire(env, uid, h.track_id, Date.now() + 2 * 86400000);
    }
    await tg.answerCallbackQuery(env, q.id, "Принял");
    await finalize(env, chatId, messageId, baseText, "\n\n" + rem.whyResponse(h.track_id, reason));
    return;
  }

  if (action === "toggle") {
    const tid = parts[1];
    const tr = await db.getTrack(env, uid, tid);
    const newState = tr.enabled ? 0 : 1;
    await db.updateTrack(env, uid, tid, { enabled: newState });
    const prof = await db.getProfile(env, uid);
    if (newState) {
      await db.setNextFire(env, uid, tid, sched.computeFirstFire(await db.getTrack(env, uid, tid), prof.tz));
    } else {
      await db.setNextFire(env, uid, tid, null);
    }
    await tg.answerCallbackQuery(env, q.id, "Ок");
    return tg.editMessageReplyMarkup(env, chatId, messageId, await tracksKeyboard(env, uid));
  }

  if (action === "hour") {
    const tid = parts[1];
    const delta = parseInt(parts[2], 10);
    const tr = await db.getTrack(env, uid, tid);
    const newHour = ((tr.hour + delta) % 24 + 24) % 24;
    await db.updateTrack(env, uid, tid, { hour: newHour });
    const prof = await db.getProfile(env, uid);
    if (tr.enabled) await db.setNextFire(env, uid, tid, sched.computeFirstFire(await db.getTrack(env, uid, tid), prof.tz));
    await tg.answerCallbackQuery(env, q.id, `${String(newHour).padStart(2, "0")}:00`);
    return tg.editMessageReplyMarkup(env, chatId, messageId, await tracksKeyboard(env, uid));
  }

  if (action === "adapt") {
    if (parts[1] === "none") {
      await tg.answerCallbackQuery(env, q.id, "Оставил как есть");
      return finalize(env, chatId, messageId, baseText, "\n\nОк, расписание без изменений.");
    }
    const tid = parts[1];
    const newN = parseInt(parts[2], 10);
    await db.updateTrack(env, uid, tid, { n_days: newN });
    const prof = await db.getProfile(env, uid);
    await db.setNextFire(env, uid, tid, sched.computeFirstFire(await db.getTrack(env, uid, tid), prof.tz));
    await tg.answerCallbackQuery(env, q.id, "Сделал реже");
    return finalize(env, chatId, messageId, baseText, `\n\n✅ ${TRACK_TITLES[tid]}: теперь раз в ${newN} дн.`);
  }

  await tg.answerCallbackQuery(env, q.id);
}

async function finalize(env, chatId, messageId, baseText, suffix) {
  const r = await tg.editMessageText(env, chatId, messageId, baseText + suffix);
  if (!r.ok) await tg.editMessageReplyMarkup(env, chatId, messageId, { inline_keyboard: [] });
}
