// Движок: scheduled() дёргает runTick раз в минуту. Идемпотентен —
// состояние в D1, повторный тик ничего не задваивает.

import {
  TRACK_ORDER, QUIET_WEEKDAY, SKIP_STREAK_THRESHOLD,
  WEEKLY_REPORT_WEEKDAY, WEEKLY_REPORT_HOUR,
  MONTHLY_REPORT_DAY, MONTHLY_REPORT_HOUR, TRACK_TITLES,
} from "./config.js";
import * as db from "./db.js";
import * as sched from "./scheduling.js";
import * as rem from "./reminders.js";
import * as stats from "./stats.js";
import { sendMessage } from "./telegram.js";

export async function runTick(env) {
  const users = await db.allUsers(env);
  for (const user of users) {
    try {
      await processUser(env, user);
    } catch (e) {
      console.log(`tick user ${user.user_id} error: ${e && e.stack || e}`);
    }
  }
}

async function resumeIfPauseOver(env, user) {
  if (user.active) return true;
  if (user.paused_until && Date.now() >= user.paused_until) {
    await db.setActive(env, user.user_id, 1, null);
    return true;
  }
  return false;
}

async function processUser(env, user) {
  const uid = user.user_id;
  const tz = user.tz;
  const now = Date.now();

  const active = await resumeIfPauseOver(env, user);
  if (!active) return;

  await maybeReports(env, user, now);

  if (sched.isQuietDay(now, tz)) return; // воскресенье — тишина

  const tracks = await db.getTracks(env, uid);
  const due = [];
  for (const track of tracks) {
    if (!track.enabled) continue;
    if (track.next_fire_at == null) {
      await db.setNextFire(env, uid, track.track_id, sched.computeFirstFire(track, tz, now));
      continue;
    }
    if (now >= track.next_fire_at) due.push(track);
  }
  if (!due.length) return;

  due.sort((a, b) => {
    const ia = TRACK_ORDER.indexOf(a.track_id), ib = TRACK_ORDER.indexOf(b.track_id);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  // Не больше одного за тик — «не оба разом».
  await sendReminder(env, user, due[0], now);
}

async function sendReminder(env, user, track, now) {
  const uid = user.user_id;
  const tid = track.track_id;
  const tz = user.tz;
  const dateStr = sched.localInfo(now, tz).dateStr;

  const existing = await db.pendingToday(env, uid, tid, dateStr);
  if (existing) {
    await db.setNextFire(env, uid, tid, sched.computeNextFire(track, tz, now));
    return;
  }

  const last = await db.lastTerminal(env, uid, tid, SKIP_STREAK_THRESHOLD);
  const skipStreak = last.length >= SKIP_STREAK_THRESHOLD
    && last.every((r) => r.status === "skipped");

  if (skipStreak) {
    const hid = await db.addHistory(env, uid, tid, dateStr, "[вопрос: что случилось]", "", "sent");
    const { text, kb } = rem.buildSkipQuestion(tid, hid);
    await sendMessage(env, user.chat_id, text, { replyMarkup: kb });
  } else {
    const { text, link, title } = rem.buildReminder(tid, track.content_index);
    const hid = await db.addHistory(env, uid, tid, dateStr, title, link, "sent");
    await sendMessage(env, user.chat_id, text, { replyMarkup: rem.actionKeyboard(hid, link) });
    await db.bumpContentIndex(env, uid, tid);
  }

  await db.setNextFire(env, uid, tid, sched.computeNextFire(track, tz, now));
}

async function maybeReports(env, user, now) {
  const uid = user.user_id;
  const tz = user.tz;
  const info = sched.localInfo(now, tz);

  if (info.weekday === WEEKLY_REPORT_WEEKDAY && info.hh >= WEEKLY_REPORT_HOUR) {
    const tag = isoWeekTag(info);
    if ((await db.getMeta(env, uid, "last_weekly")) !== tag) {
      const text = await stats.weeklyReport(env, uid, tz);
      await sendMessage(env, user.chat_id, text);
      await db.setMeta(env, uid, "last_weekly", tag);
    }
  }

  if (info.d === MONTHLY_REPORT_DAY && info.hh >= MONTHLY_REPORT_HOUR) {
    const tag = `${info.y}-${String(info.m).padStart(2, "0")}`;
    if ((await db.getMeta(env, uid, "last_monthly")) !== tag) {
      const { text, suggestion } = await stats.monthlyReport(env, uid, tz);
      let replyMarkup;
      if (suggestion) {
        replyMarkup = {
          inline_keyboard: [[
            { text: `✅ Да, реже (раз в ${suggestion.newN} дн.)`, callback_data: `adapt:${suggestion.tid}:${suggestion.newN}` },
            { text: "Оставить", callback_data: "adapt:none:0" },
          ]],
        };
      }
      await sendMessage(env, user.chat_id, text, { replyMarkup });
      await db.setMeta(env, uid, "last_monthly", tag);
    }
  }
}

// Тег ISO-недели (год + номер недели) для дедупликации недельного отчёта.
function isoWeekTag(info) {
  const d = new Date(Date.UTC(info.y, info.m - 1, info.d));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(
    ((d - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7
  );
  return `${d.getUTCFullYear()}-W${week}`;
}
