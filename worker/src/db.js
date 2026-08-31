// Слой 1: доступ к D1. Каждая функция принимает env (в env.DB — база).

import { DEFAULT_TZ, DEFAULT_TRACKS } from "./config.js";

export async function ensureUser(env, userId, chatId) {
  const existing = await env.DB.prepare("SELECT user_id FROM profile WHERE user_id=?")
    .bind(userId).first();
  if (existing) {
    await env.DB.prepare("UPDATE profile SET chat_id=? WHERE user_id=?")
      .bind(chatId, userId).run();
    return false;
  }
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO profile (user_id, chat_id, tz, active, paused_until, created_at) VALUES (?,?,?,?,?,?)"
  ).bind(userId, chatId, DEFAULT_TZ, 1, null, now).run();

  const stmts = [];
  for (const [tid, c] of Object.entries(DEFAULT_TRACKS)) {
    stmts.push(env.DB.prepare(
      "INSERT INTO tracks (user_id, track_id, enabled, cadence, n_days, weekday, hour, minute, duration_min, next_fire_at, content_index) VALUES (?,?,?,?,?,?,?,?,?,?,0)"
    ).bind(userId, tid, c.enabled, c.cadence, c.n_days, c.weekday, c.hour, c.minute, c.duration_min, null));
  }
  await env.DB.batch(stmts);
  return true;
}

export async function getProfile(env, userId) {
  return env.DB.prepare("SELECT * FROM profile WHERE user_id=?").bind(userId).first();
}

export async function allUsers(env) {
  const r = await env.DB.prepare("SELECT * FROM profile").all();
  return r.results || [];
}

export async function setActive(env, userId, active, pausedUntil) {
  await env.DB.prepare("UPDATE profile SET active=?, paused_until=? WHERE user_id=?")
    .bind(active, pausedUntil ?? null, userId).run();
}

export async function setTz(env, userId, tz) {
  await env.DB.prepare("UPDATE profile SET tz=? WHERE user_id=?").bind(tz, userId).run();
}

export async function getTracks(env, userId) {
  const r = await env.DB.prepare("SELECT * FROM tracks WHERE user_id=?").bind(userId).all();
  return r.results || [];
}

export async function getTrack(env, userId, trackId) {
  return env.DB.prepare("SELECT * FROM tracks WHERE user_id=? AND track_id=?")
    .bind(userId, trackId).first();
}

export async function updateTrack(env, userId, trackId, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const setSql = keys.map((k) => `${k}=?`).join(", ");
  const vals = keys.map((k) => fields[k]);
  await env.DB.prepare(`UPDATE tracks SET ${setSql} WHERE user_id=? AND track_id=?`)
    .bind(...vals, userId, trackId).run();
}

export async function setNextFire(env, userId, trackId, ms) {
  await env.DB.prepare("UPDATE tracks SET next_fire_at=? WHERE user_id=? AND track_id=?")
    .bind(ms ?? null, userId, trackId).run();
}

export async function bumpContentIndex(env, userId, trackId) {
  await env.DB.prepare("UPDATE tracks SET content_index=content_index+1 WHERE user_id=? AND track_id=?")
    .bind(userId, trackId).run();
}

export async function addHistory(env, userId, trackId, scheduledDate, title, ref, status) {
  const r = await env.DB.prepare(
    "INSERT INTO history (user_id, track_id, scheduled_date, sent_at, content_title, content_ref, status) VALUES (?,?,?,?,?,?,?)"
  ).bind(userId, trackId, scheduledDate, Date.now(), title, ref, status).run();
  return r.meta.last_row_id;
}

export async function getHistory(env, hid) {
  return env.DB.prepare("SELECT * FROM history WHERE id=?").bind(hid).first();
}

export async function setHistoryStatus(env, hid, status, feedback) {
  await env.DB.prepare(
    "UPDATE history SET status=?, acted_at=?, feedback=COALESCE(?, feedback) WHERE id=?"
  ).bind(status, Date.now(), feedback ?? null, hid).run();
}

export async function pendingToday(env, userId, trackId, scheduledDate) {
  return env.DB.prepare(
    "SELECT * FROM history WHERE user_id=? AND track_id=? AND scheduled_date=? ORDER BY id DESC LIMIT 1"
  ).bind(userId, trackId, scheduledDate).first();
}

export async function lastTerminal(env, userId, trackId, limit) {
  const r = await env.DB.prepare(
    "SELECT * FROM history WHERE user_id=? AND track_id=? AND status IN ('done','skipped') ORDER BY id DESC LIMIT ?"
  ).bind(userId, trackId, limit).all();
  return r.results || [];
}

export async function historyBetween(env, userId, startMs, endMs) {
  const r = await env.DB.prepare(
    "SELECT * FROM history WHERE user_id=? AND sent_at>=? AND sent_at<? ORDER BY id"
  ).bind(userId, startMs, endMs).all();
  return r.results || [];
}

export async function allHistory(env, userId) {
  const r = await env.DB.prepare("SELECT * FROM history WHERE user_id=? ORDER BY id")
    .bind(userId).all();
  return r.results || [];
}

export async function getMeta(env, userId, key, def = null) {
  const row = await env.DB.prepare("SELECT value FROM meta WHERE user_id=? AND key=?")
    .bind(userId, key).first();
  return row ? row.value : def;
}

export async function setMeta(env, userId, key, value) {
  await env.DB.prepare(
    "INSERT INTO meta (user_id, key, value) VALUES (?,?,?) ON CONFLICT(user_id, key) DO UPDATE SET value=excluded.value"
  ).bind(userId, key, String(value)).run();
}
