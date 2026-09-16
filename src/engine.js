// Крон-тик раз в минуту: срабатывания напоминаний, утренний план, вечерний обзор.
// Идемпотентно: обзоры дедуплицируются по локальной дате в meta.

import * as db from "./db.js";
import { sendMessage } from "./telegram.js";
import { taskKeyboard } from "./ui.js";
import { localInfo, fmtLocal, wallToUtc, nextRecurring } from "./time.js";

export async function runTick(env) {
  const users = await db.allUsers(env);
  for (const u of users) {
    try { await processUser(env, u); }
    catch (e) { console.log(`tick user ${u.user_id} error:`, e && e.stack || e); }
  }
}

async function processUser(env, user) {
  const uid = user.user_id;
  const tz = user.tz;
  const now = Date.now();

  // Снять паузу, если срок вышел.
  if (!user.active) {
    if (user.paused_until && now >= user.paused_until) {
      await db.setActive(env, uid, 1, null);
    } else {
      return; // на паузе — молчим
    }
  }

  await fireReminders(env, user, now);
  await maybeDigests(env, user, now);
}

async function fireReminders(env, user, now) {
  const uid = user.user_id, tz = user.tz;
  const due = await db.dueReminders(env, uid, now);
  for (const r of due) {
    await sendMessage(env, user.chat_id, `⏰ Напоминание: ${r.text}`);
    if (r.kind === "recurring" && r.recurrence) {
      let rec;
      try { rec = JSON.parse(r.recurrence); } catch { rec = null; }
      if (rec) {
        const next = nextRecurring(rec, tz, now);
        await db.rescheduleReminder(env, r.id, next);
      } else {
        await db.deactivateReminder(env, uid, r.id);
      }
    } else {
      await db.deactivateReminder(env, uid, r.id);
    }
  }
}

function startOfLocalDay(now, tz) {
  const i = localInfo(now, tz);
  return wallToUtc(i.y, i.m, i.d, 0, 0, tz);
}

async function maybeDigests(env, user, now) {
  const uid = user.user_id, tz = user.tz;
  const i = localInfo(now, tz);
  const dayStart = startOfLocalDay(now, tz);
  const dayEnd = dayStart + 86400000;

  // Утренний план.
  if (i.hh >= (user.morning_hour ?? 8) && (await db.getMeta(env, uid, "last_morning")) !== i.dateStr) {
    const open = await db.listTasks(env, uid, "open", 100);
    const overdue = open.filter((t) => t.due_at && t.due_at < dayStart);
    const today = open.filter((t) => t.due_at && t.due_at >= dayStart && t.due_at < dayEnd);
    const lines = [`☀️ Доброе утро! План на ${String(i.d).padStart(2, "0")}.${String(i.m).padStart(2, "0")}:`];
    if (overdue.length) {
      lines.push("", "🔴 Просрочено:");
      overdue.forEach((t) => lines.push(`• #${t.id} ${t.title}${t.due_at ? " (до " + fmtLocal(t.due_at, tz) + ")" : ""}`));
    }
    if (today.length) {
      lines.push("", "📌 На сегодня:");
      today.forEach((t) => lines.push(`• #${t.id} ${t.title}`));
    }
    if (!overdue.length && !today.length) {
      lines.push("", open.length ? `Дедлайнов на сегодня нет. Открытых задач: ${open.length}.` : "Задач нет — чистый день. 🙌");
    }
    const focus = [...overdue, ...today];
    await sendMessage(env, user.chat_id, lines.join("\n"),
      focus.length ? { replyMarkup: taskKeyboard(focus) } : {});
    await db.setMeta(env, uid, "last_morning", i.dateStr);
  }

  // Вечерний обзор.
  if (i.hh >= (user.evening_hour ?? 21) && (await db.getMeta(env, uid, "last_evening")) !== i.dateStr) {
    const done = await db.doneToday(env, uid, dayStart);
    const open = await db.listTasks(env, uid, "open", 100);
    const stillDue = open.filter((t) => t.due_at && t.due_at < dayEnd);
    const lines = ["🌙 Итоги дня:"];
    lines.push(done.length ? `✅ Сделано сегодня: ${done.length}` : "Сегодня ничего не отмечено как сделано.");
    if (stillDue.length) {
      lines.push("", "⚠️ Ещё висит (срок сегодня или раньше):");
      stillDue.forEach((t) => lines.push(`• #${t.id} ${t.title}`));
    }
    await sendMessage(env, user.chat_id, lines.join("\n"),
      stillDue.length ? { replyMarkup: taskKeyboard(stillDue) } : {});
    await db.setMeta(env, uid, "last_evening", i.dateStr);
  }
}
