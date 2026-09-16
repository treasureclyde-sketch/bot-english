// Слой доступа к D1. Каждая функция принимает env (env.DB — база).

import { DEFAULT_TZ, MORNING_HOUR, EVENING_HOUR, HISTORY_LIMIT } from "./config.js";

// --- профиль ----------------------------------------------------------------
export async function ensureUser(env, userId, chatId) {
  const existing = await env.DB.prepare("SELECT user_id FROM profile WHERE user_id=?")
    .bind(userId).first();
  if (existing) {
    await env.DB.prepare("UPDATE profile SET chat_id=? WHERE user_id=?")
      .bind(chatId, userId).run();
    return false;
  }
  await env.DB.prepare(
    "INSERT INTO profile (user_id, chat_id, tz, morning_hour, evening_hour, active, created_at)" +
    " VALUES (?,?,?,?,?,1,?)"
  ).bind(userId, chatId, DEFAULT_TZ, MORNING_HOUR, EVENING_HOUR, Date.now()).run();
  return true;
}

export async function getProfile(env, userId) {
  return env.DB.prepare("SELECT * FROM profile WHERE user_id=?").bind(userId).first();
}

export async function allUsers(env) {
  const r = await env.DB.prepare("SELECT * FROM profile").all();
  return r.results || [];
}

export async function setTz(env, userId, tz) {
  await env.DB.prepare("UPDATE profile SET tz=? WHERE user_id=?").bind(tz, userId).run();
}

export async function setActive(env, userId, active, pausedUntil) {
  await env.DB.prepare("UPDATE profile SET active=?, paused_until=? WHERE user_id=?")
    .bind(active, pausedUntil ?? null, userId).run();
}

// --- Telegram Business -------------------------------------------------------
export async function setAway(env, userId, away) {
  await env.DB.prepare("UPDATE profile SET away=? WHERE user_id=?").bind(away ? 1 : 0, userId).run();
}

export async function setBusinessConnection(env, userId, connId, canReply) {
  await env.DB.prepare("UPDATE profile SET biz_conn_id=?, biz_can_reply=? WHERE user_id=?")
    .bind(connId ?? null, canReply ? 1 : 0, userId).run();
}

export async function addBizMessage(env, userId, chatId, role, content) {
  await env.DB.prepare(
    "INSERT INTO biz_messages (user_id, chat_id, role, content, created_at) VALUES (?,?,?,?,?)"
  ).bind(userId, chatId, role, content, Date.now()).run();
}

export async function recentBizMessages(env, userId, chatId, limit = 10) {
  const r = await env.DB.prepare(
    "SELECT role, content FROM biz_messages WHERE user_id=? AND chat_id=? ORDER BY id DESC LIMIT ?"
  ).bind(userId, chatId, limit).all();
  return (r.results || []).reverse();
}

export async function trimBizMessages(env, userId, chatId, keep = 30) {
  await env.DB.prepare(
    "DELETE FROM biz_messages WHERE user_id=? AND chat_id=? AND id NOT IN " +
    "(SELECT id FROM biz_messages WHERE user_id=? AND chat_id=? ORDER BY id DESC LIMIT ?)"
  ).bind(userId, chatId, userId, chatId, keep).run();
}

// --- заметки ----------------------------------------------------------------
export async function addNote(env, userId, text, tags) {
  const r = await env.DB.prepare(
    "INSERT INTO notes (user_id, text, tags, created_at) VALUES (?,?,?,?)"
  ).bind(userId, text, tags ?? null, Date.now()).run();
  return r.meta.last_row_id;
}

export async function searchNotes(env, userId, query, limit = 20) {
  if (query) {
    const like = `%${query}%`;
    const r = await env.DB.prepare(
      "SELECT * FROM notes WHERE user_id=? AND (text LIKE ? OR IFNULL(tags,'') LIKE ?)" +
      " ORDER BY id DESC LIMIT ?"
    ).bind(userId, like, like, limit).all();
    return r.results || [];
  }
  const r = await env.DB.prepare(
    "SELECT * FROM notes WHERE user_id=? ORDER BY id DESC LIMIT ?"
  ).bind(userId, limit).all();
  return r.results || [];
}

export async function deleteNote(env, userId, id) {
  const r = await env.DB.prepare("DELETE FROM notes WHERE user_id=? AND id=?")
    .bind(userId, id).run();
  return r.meta.changes > 0;
}

// --- задачи -----------------------------------------------------------------
export async function addTask(env, userId, title, subject, dueAt) {
  const r = await env.DB.prepare(
    "INSERT INTO tasks (user_id, title, subject, due_at, status, created_at)" +
    " VALUES (?,?,?,?,'open',?)"
  ).bind(userId, title, subject ?? null, dueAt ?? null, Date.now()).run();
  return r.meta.last_row_id;
}

export async function listTasks(env, userId, status = "open", limit = 50) {
  let sql = "SELECT * FROM tasks WHERE user_id=?";
  const args = [userId];
  if (status && status !== "all") { sql += " AND status=?"; args.push(status); }
  // Сначала с дедлайном (по возрастанию), потом без.
  sql += " ORDER BY (due_at IS NULL), due_at ASC, id DESC LIMIT ?";
  args.push(limit);
  const r = await env.DB.prepare(sql).bind(...args).all();
  return r.results || [];
}

export async function getTask(env, userId, id) {
  return env.DB.prepare("SELECT * FROM tasks WHERE user_id=? AND id=?")
    .bind(userId, id).first();
}

export async function completeTask(env, userId, id) {
  const r = await env.DB.prepare(
    "UPDATE tasks SET status='done', done_at=? WHERE user_id=? AND id=? AND status='open'"
  ).bind(Date.now(), userId, id).run();
  return r.meta.changes > 0;
}

export async function reopenTask(env, userId, id) {
  const r = await env.DB.prepare(
    "UPDATE tasks SET status='open', done_at=NULL WHERE user_id=? AND id=?"
  ).bind(userId, id).run();
  return r.meta.changes > 0;
}

export async function deleteTask(env, userId, id) {
  const r = await env.DB.prepare("DELETE FROM tasks WHERE user_id=? AND id=?")
    .bind(userId, id).run();
  return r.meta.changes > 0;
}

export async function doneToday(env, userId, sinceMs) {
  const r = await env.DB.prepare(
    "SELECT * FROM tasks WHERE user_id=? AND status='done' AND done_at>=? ORDER BY done_at"
  ).bind(userId, sinceMs).all();
  return r.results || [];
}

// --- напоминания ------------------------------------------------------------
export async function addReminder(env, userId, text, kind, nextFireAt, recurrence) {
  const r = await env.DB.prepare(
    "INSERT INTO reminders (user_id, text, kind, next_fire_at, recurrence, active, created_at)" +
    " VALUES (?,?,?,?,?,1,?)"
  ).bind(userId, text, kind, nextFireAt, recurrence ? JSON.stringify(recurrence) : null, Date.now()).run();
  return r.meta.last_row_id;
}

export async function listReminders(env, userId) {
  const r = await env.DB.prepare(
    "SELECT * FROM reminders WHERE user_id=? AND active=1 ORDER BY next_fire_at ASC"
  ).bind(userId).all();
  return r.results || [];
}

export async function dueReminders(env, userId, nowMs) {
  const r = await env.DB.prepare(
    "SELECT * FROM reminders WHERE user_id=? AND active=1 AND next_fire_at<=? ORDER BY next_fire_at"
  ).bind(userId, nowMs).all();
  return r.results || [];
}

export async function rescheduleReminder(env, id, nextFireAt) {
  await env.DB.prepare("UPDATE reminders SET next_fire_at=? WHERE id=?")
    .bind(nextFireAt, id).run();
}

export async function deactivateReminder(env, userId, id) {
  const r = await env.DB.prepare(
    "UPDATE reminders SET active=0 WHERE user_id=? AND id=?"
  ).bind(userId, id).run();
  return r.meta.changes > 0;
}

// --- память диалога ---------------------------------------------------------
export async function addMessage(env, userId, role, content) {
  await env.DB.prepare(
    "INSERT INTO messages (user_id, role, content, created_at) VALUES (?,?,?,?)"
  ).bind(userId, role, content, Date.now()).run();
}

export async function recentMessages(env, userId, limit = HISTORY_LIMIT) {
  const r = await env.DB.prepare(
    "SELECT role, content FROM messages WHERE user_id=? ORDER BY id DESC LIMIT ?"
  ).bind(userId, limit).all();
  return (r.results || []).reverse();
}

export async function trimMessages(env, userId, keep = 40) {
  // Держим таблицу небольшой: оставляем последние `keep` сообщений.
  await env.DB.prepare(
    "DELETE FROM messages WHERE user_id=? AND id NOT IN " +
    "(SELECT id FROM messages WHERE user_id=? ORDER BY id DESC LIMIT ?)"
  ).bind(userId, userId, keep).run();
}

// --- meta -------------------------------------------------------------------
export async function getMeta(env, userId, key, def = null) {
  const row = await env.DB.prepare("SELECT value FROM meta WHERE user_id=? AND key=?")
    .bind(userId, key).first();
  return row ? row.value : def;
}

export async function setMeta(env, userId, key, value) {
  await env.DB.prepare(
    "INSERT INTO meta (user_id, key, value) VALUES (?,?,?) " +
    "ON CONFLICT(user_id, key) DO UPDATE SET value=excluded.value"
  ).bind(userId, key, String(value)).run();
}
