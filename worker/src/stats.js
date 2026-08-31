// Слой 4: статистика — стрик, недельный и месячный отчёты.

import {
  TRACK_ORDER, TRACK_TITLES, TRACK_EGE, UNDERPERFORM_RATIO,
} from "./config.js";
import { localInfo } from "./scheduling.js";
import * as db from "./db.js";

function localDate(ms, tz) {
  return localInfo(ms, tz).dateStr;
}

// Прибавить дни к строке даты YYYY-MM-DD.
function addDaysStr(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const nd = new Date(Date.UTC(y, m - 1, d) + days * 86400000);
  const p = (n) => String(n).padStart(2, "0");
  return `${nd.getUTCFullYear()}-${p(nd.getUTCMonth() + 1)}-${p(nd.getUTCDate())}`;
}

export async function computeStreak(env, userId, tz) {
  const rows = await db.allHistory(env, userId);
  const doneDays = new Set();
  for (const r of rows) if (r.status === "done") doneDays.add(localDate(r.sent_at, tz));
  if (!doneDays.size) return 0;

  const today = localInfo(Date.now(), tz).dateStr;
  let cursor;
  if (doneDays.has(today)) cursor = today;
  else if (doneDays.has(addDaysStr(today, -1))) cursor = addDaysStr(today, -1);
  else return 0;

  let streak = 0;
  while (doneDays.has(cursor)) {
    streak += 1;
    cursor = addDaysStr(cursor, -1);
  }
  return streak;
}

function count(rows, trackId, status) {
  return rows.filter((r) => r.track_id === trackId && r.status === status).length;
}
function sent(rows, trackId) {
  return rows.filter((r) => r.track_id === trackId).length;
}

export async function weeklyReport(env, userId, tz) {
  const now = Date.now();
  const rows = await db.historyBetween(env, userId, now - 7 * 86400000, now);
  const streak = await computeStreak(env, userId, tz);

  const lines = ["📊 *Недельный отчёт*", ""];
  for (const tid of TRACK_ORDER) {
    const track = await db.getTrack(env, userId, tid);
    if (!track || !track.enabled) continue;
    const done = count(rows, tid, "done");
    const planned = sent(rows, tid);
    const title = TRACK_TITLES[tid];
    if (tid === TRACK_EGE) {
      lines.push(`• *${title}*: ${done ? "✅ сделал" : "— не сделал"}`);
    } else {
      lines.push(`• *${title}*: сделано ${done} из ${planned || "—"}`);
    }
  }
  lines.push("");
  lines.push(`${streak ? "🔥" : "•"} Стрик: *${streak}* дн. подряд`);
  if (!streak) lines.push("_Один день — и стрик снова живой. Начни сегодня._");
  return lines.join("\n");
}

export async function monthlyReport(env, userId, tz) {
  const now = Date.now();
  const rows = await db.historyBetween(env, userId, now - 30 * 86400000, now);

  const body = [];
  let totalDone = 0, totalPlanned = 0;
  let worst = null; // {ratio, tid}
  for (const tid of TRACK_ORDER) {
    const track = await db.getTrack(env, userId, tid);
    if (!track || !track.enabled) continue;
    const done = count(rows, tid, "done");
    const planned = sent(rows, tid);
    totalDone += done;
    totalPlanned += planned;
    const ratio = planned ? done / planned : null;
    const pct = ratio === null ? "нет данных" : `${Math.round(ratio * 100)}%`;
    body.push(`• *${TRACK_TITLES[tid]}*: ${done}/${planned || "—"} (${pct})`);
    if (ratio !== null && planned >= 3 && (!worst || ratio < worst.ratio)) {
      worst = { ratio, tid };
    }
  }
  const overall = totalPlanned ? totalDone / totalPlanned : 0;

  const lines = ["🗓 *Месячный отчёт*", "",
    `Общий процент выполнения: *${Math.round(overall * 100)}%*`, "", ...body];

  let suggestion = null;
  if (worst && worst.ratio < UNDERPERFORM_RATIO) {
    const track = await db.getTrack(env, userId, worst.tid);
    const title = TRACK_TITLES[worst.tid];
    lines.push("");
    if (track.cadence === "every_n_days") {
      const newN = track.n_days + 2;
      lines.push(`⚠️ *${title}* проседает (${Math.round(worst.ratio * 100)}%). Может, реже — раз в ${newN} дня вместо ${track.n_days}? Так проще держать ритм.`);
      suggestion = { tid: worst.tid, newN };
    } else {
      lines.push(`⚠️ *${title}* проседает (${Math.round(worst.ratio * 100)}%). Стоит вернуться к нему или пересмотреть формат.`);
    }
  }
  return { text: lines.join("\n"), suggestion };
}
