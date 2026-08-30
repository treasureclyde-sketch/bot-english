"""Движок: периодический «тик», который решает, что и когда отправить.

Запускается раз в минуту из job_queue. Идемпотентен — состояние (что уже
отправлено, когда слали отчёты) держится в базе, поэтому повторный тик в ту же
минуту ничего не задваивает.

Реализует правила слоя 2 поверх хранилища:
  * кадентность и next_fire_at по треку;
  * тишина в воскресенье (кроме отчётов);
  * приоритет: не больше одного напоминания за тик (6min раньше CSCA раньше ЕГЭ),
    чтобы не приходило «оба разом»;
  * правило пропусков: 2 пропуска подряд -> вместо напоминания вопрос «что случилось».
"""

from telegram.constants import ParseMode

import config
import reminders
import scheduling
import stats
from db import from_iso, utcnow


async def run_tick(bot, store):
    for user in store.all_users():
        try:
            await _process_user(bot, store, user)
        except Exception as e:  # один пользователь не должен ронять цикл
            print(f"[tick] user {user['user_id']} error: {e}")


async def _resume_if_pause_over(store, user):
    if user["active"]:
        return True
    pu = user["paused_until"]
    if pu and utcnow() >= from_iso(pu):
        store.set_active(user["user_id"], 1, None)
        return True
    return False


async def _process_user(bot, store, user):
    uid = user["user_id"]
    tz = user["tz"]
    now_local = scheduling.local_now(tz)

    active = await _resume_if_pause_over(store, user)

    # Отчёты идут даже в воскресенье и на паузе? На паузе — молчим совсем.
    if not active:
        return

    await _maybe_reports(bot, store, user, now_local)

    # Правило воскресенья: напоминаний нет.
    if scheduling.is_quiet_day(now_local):
        return

    # Собираем сработавшие треки в порядке приоритета.
    due_tracks = []
    for track in store.get_tracks(uid):
        if not track["enabled"]:
            continue
        nf = from_iso(track["next_fire_at"])
        if nf is None:
            first = scheduling.compute_first_fire(track, tz)
            store.set_next_fire(uid, track["track_id"], first)
            continue
        if utcnow() >= nf:
            due_tracks.append(track)

    if not due_tracks:
        return

    ordered = sorted(
        due_tracks,
        key=lambda t: config.TRACK_ORDER.index(t["track_id"])
        if t["track_id"] in config.TRACK_ORDER else 99,
    )

    # Не больше одного за тик — «не оба разом».
    track = ordered[0]
    await _send_reminder(bot, store, user, track, now_local)


async def _send_reminder(bot, store, user, track, now_local):
    uid = user["user_id"]
    tid = track["track_id"]
    sched_date = now_local.date().isoformat()

    # Уже слали сегодня по этому треку? Тогда просто сдвигаем next_fire вперёд.
    existing = store.pending_today(uid, tid, sched_date)
    if existing:
        nxt = scheduling.compute_next_fire(track, user["tz"],
                                           scheduling.local_now(user["tz"]))
        store.set_next_fire(uid, tid, nxt)
        return

    idx = track["content_index"]

    # Правило пропусков: 2 подряд 'skipped' -> вопрос вместо напоминания.
    last = store.last_terminal(uid, tid, limit=config.SKIP_STREAK_THRESHOLD)
    skip_streak = (
        len(last) >= config.SKIP_STREAK_THRESHOLD
        and all(r["status"] == "skipped" for r in last)
    )

    if skip_streak:
        hid = store.add_history(uid, tid, sched_date, utcnow(),
                                "[вопрос: что случилось]", "", "sent")
        text, kb = reminders.build_skip_question(tid, hid)
        await bot.send_message(user["chat_id"], text, parse_mode=ParseMode.MARKDOWN,
                               reply_markup=kb)
    else:
        text, link, title, minutes = reminders.build_reminder(tid, idx)
        hid = store.add_history(uid, tid, sched_date, utcnow(), title, link, "sent")
        kb = reminders.action_keyboard(hid, link)
        await bot.send_message(user["chat_id"], text, parse_mode=ParseMode.MARKDOWN,
                               reply_markup=kb, disable_web_page_preview=False)
        store.bump_content_index(uid, tid)

    # Двигаем следующее срабатывание по кадентности.
    nxt = scheduling.compute_next_fire(track, user["tz"], now_local)
    store.set_next_fire(uid, tid, nxt)


async def _maybe_reports(bot, store, user, now_local):
    uid = user["user_id"]
    tz = user["tz"]

    # Недельный: воскресенье, вечер, один раз в неделю.
    if (now_local.weekday() == config.WEEKLY_REPORT_WEEKDAY
            and now_local.hour >= config.WEEKLY_REPORT_HOUR):
        wk = now_local.isocalendar()
        tag = f"{wk[0]}-W{wk[1]}"
        if store.get_meta(uid, "last_weekly") != tag:
            text = stats.weekly_report(store, uid, tz)
            await bot.send_message(user["chat_id"], text,
                                   parse_mode=ParseMode.MARKDOWN)
            store.set_meta(uid, "last_weekly", tag)

    # Месячный: 1-е число, утро, один раз в месяц.
    if (now_local.day == config.MONTHLY_REPORT_DAY
            and now_local.hour >= config.MONTHLY_REPORT_HOUR):
        tag = f"{now_local.year}-{now_local.month:02d}"
        if store.get_meta(uid, "last_monthly") != tag:
            text, suggestion = stats.monthly_report(store, uid, tz)
            kb = None
            if suggestion:
                from telegram import InlineKeyboardButton, InlineKeyboardMarkup
                sid, new_n = suggestion
                kb = InlineKeyboardMarkup([[
                    InlineKeyboardButton(
                        f"✅ Да, реже (раз в {new_n} дн.)",
                        callback_data=f"adapt:{sid}:{new_n}"),
                    InlineKeyboardButton("Оставить", callback_data="adapt:none:0"),
                ]])
            await bot.send_message(user["chat_id"], text,
                                   parse_mode=ParseMode.MARKDOWN, reply_markup=kb)
            store.set_meta(uid, "last_monthly", tag)
