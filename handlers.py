"""Обработчики команд и нажатий кнопок.

Доступ только у владельца (OWNER_ID). Команды:
  /start   — регистрация и приветствие
  /status  — план на сегодня, треки, стрик
  /tracks  — список треков, включить/выключить, поменять время
  /pause N — пауза на N дней (кнопка «на паузу»)
  /resume  — снять паузу
  /tz Zone — сменить часовой пояс
  /report  — недельный отчёт по запросу
  /csca    — ресурсы CSCA
  /help
"""

from datetime import timedelta
from zoneinfo import ZoneInfo, available_timezones

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.constants import ParseMode
from telegram.ext import ContextTypes

import config
import content
import reminders
import scheduling
import stats
from db import from_iso, to_iso, utcnow


def _store(context):
    return context.application.bot_data["store"]


def _authorized(update: Update) -> bool:
    if not config.OWNER_ID:
        return True  # OWNER_ID не задан — не ограничиваем (dev-режим)
    user = update.effective_user
    return user and user.id == config.OWNER_ID


async def _guard(update: Update) -> bool:
    if not _authorized(update):
        if update.message:
            await update.message.reply_text("Это личный бот. Доступа нет.")
        elif update.callback_query:
            await update.callback_query.answer("Нет доступа", show_alert=True)
        return False
    return True


# --- команды ---------------------------------------------------------------
async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await _guard(update):
        return
    store = _store(context)
    uid = update.effective_user.id
    is_new = store.ensure_user(uid, update.effective_chat.id)
    # Догоняем треки до актуальных дефолтов (новый Duolingo, новые кадентности).
    store.sync_tracks(uid)

    # Инициализируем next_fire для треков, если ещё не заданы.
    prof = store.get_profile(uid)
    for track in store.get_tracks(uid):
        if track["next_fire_at"] is None and track["enabled"]:
            first = scheduling.compute_first_fire(track, prof["tz"])
            store.set_next_fire(uid, track["track_id"], first)

    hello = "Привет! " if is_new else "С возвращением! "
    text = (
        f"{hello}Я держу твой ритм по четырём трекам:\n\n"
        "🎧 *6 Minute English* — раз в 2 дня, 10 мин\n"
        "🦉 *Duolingo Test* — раз в 2 дня, ~20 мин (для вузов Китая)\n"
        "📐 *CSCA Math* — раз в 3 дня, подробный урок EN→RU + практика\n"
        "🧮 *Пробник ЕГЭ* — раз в неделю, ~2 ч\n\n"
        "Воскресенье — выходной, напоминаний нет.\n\n"
        "Команды: /status /tracks /pause /report /csca /duo /help"
    )
    await update.message.reply_text(text, parse_mode=ParseMode.MARKDOWN)


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await _guard(update):
        return
    await update.message.reply_text(
        "*Команды*\n"
        "/status — план на сегодня и стрик\n"
        "/tracks — треки: вкл/выкл и расписание\n"
        "/pause N — пауза на N дней (по умолчанию 1)\n"
        "/resume — снять паузу\n"
        "/tz Asia/Yekaterinburg — часовой пояс\n"
        "/report — недельный отчёт сейчас\n"
        "/csca — ресурсы по математике\n"
        "/duo — про Duolingo Test и ресурсы\n\n"
        "В каждом напоминании: [🔗 ссылка] [✅ Готово] [🕑 Позже] [⏭ Пропустить].",
        parse_mode=ParseMode.MARKDOWN,
    )


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await _guard(update):
        return
    store = _store(context)
    uid = update.effective_user.id
    prof = store.get_profile(uid)
    if not prof:
        await update.message.reply_text("Напиши /start сначала.")
        return
    tz = prof["tz"]
    now_local = scheduling.local_now(tz)
    streak = stats.compute_streak(store, uid, tz)

    lines = [f"📍 *Сегодня* ({now_local:%a %d.%m}, {tz})", ""]
    if not prof["active"]:
        pu = from_iso(prof["paused_until"])
        when = pu.astimezone(ZoneInfo(tz)).strftime("%d.%m %H:%M") if pu else "?"
        lines.append(f"⏸ На паузе до {when}. /resume чтобы включить.")
        await update.message.reply_text("\n".join(lines),
                                        parse_mode=ParseMode.MARKDOWN)
        return

    if scheduling.is_quiet_day(now_local):
        lines.append("🌙 Воскресенье — выходной. Напоминаний не будет.")
    for track in scheduling.order_due([t["track_id"] for t in store.get_tracks(uid)]):
        tr = store.get_track(uid, track)
        if not tr["enabled"]:
            continue
        nf = from_iso(tr["next_fire_at"])
        title = config.TRACK_TITLES[track]
        if nf:
            loc = nf.astimezone(ZoneInfo(tz))
            when = loc.strftime("%d.%m %H:%M")
            lines.append(f"• {title}: → {when}")
        else:
            lines.append(f"• {title}: не запланирован")

    lines.append("")
    fire = "🔥" if streak else "•"
    lines.append(f"{fire} Стрик: *{streak}* дн.")
    await update.message.reply_text("\n".join(lines), parse_mode=ParseMode.MARKDOWN)


async def cmd_tracks(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await _guard(update):
        return
    store = _store(context)
    uid = update.effective_user.id
    if not store.get_profile(uid):
        await update.message.reply_text("Напиши /start сначала.")
        return
    await update.message.reply_text("*Треки*", parse_mode=ParseMode.MARKDOWN,
                                    reply_markup=_tracks_keyboard(store, uid))


def _cadence_human(track):
    if track["cadence"] == "daily":
        base = "каждый день"
    elif track["cadence"] == "weekly":
        wd = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][track["weekday"]]
        base = f"раз в неделю ({wd})"
    else:
        base = f"раз в {track['n_days']} дн."
    return f"{base}, {track['hour']:02d}:{track['minute']:02d}"


def _tracks_keyboard(store, uid):
    rows = []
    for tid in config.TRACK_ORDER:
        tr = store.get_track(uid, tid)
        if not tr:
            continue
        mark = "🟢" if tr["enabled"] else "⚪️"
        title = config.TRACK_TITLES[tid]
        rows.append([InlineKeyboardButton(
            f"{mark} {title} — {_cadence_human(tr)}",
            callback_data=f"trk:{tid}")])
        rows.append([
            InlineKeyboardButton(
                "Выключить" if tr["enabled"] else "Включить",
                callback_data=f"toggle:{tid}"),
            InlineKeyboardButton("−1 ч", callback_data=f"hour:{tid}:-1"),
            InlineKeyboardButton("+1 ч", callback_data=f"hour:{tid}:1"),
        ])
    return InlineKeyboardMarkup(rows)


async def cmd_pause(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await _guard(update):
        return
    store = _store(context)
    uid = update.effective_user.id
    days = 1
    if context.args:
        try:
            days = max(1, int(context.args[0]))
        except ValueError:
            pass
    until = utcnow() + timedelta(days=days)
    store.set_active(uid, 0, until)
    prof = store.get_profile(uid)
    loc = until.astimezone(ZoneInfo(prof["tz"])).strftime("%d.%m %H:%M")
    await update.message.reply_text(
        f"⏸ Пауза на {days} дн. — до {loc}. Включу сам, или /resume раньше."
    )


async def cmd_resume(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await _guard(update):
        return
    store = _store(context)
    uid = update.effective_user.id
    store.set_active(uid, 1, None)
    # Пересчитываем ближайшие срабатывания от «сейчас».
    prof = store.get_profile(uid)
    for track in store.get_tracks(uid):
        if track["enabled"]:
            store.set_next_fire(uid, track["track_id"],
                                scheduling.compute_first_fire(track, prof["tz"]))
    await update.message.reply_text("▶️ Погнали. Напоминания снова включены.")


async def cmd_tz(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await _guard(update):
        return
    store = _store(context)
    uid = update.effective_user.id
    if not context.args:
        prof = store.get_profile(uid)
        await update.message.reply_text(
            f"Часовой пояс: {prof['tz']}\nСменить: /tz Asia/Yekaterinburg")
        return
    tz = context.args[0]
    if tz not in available_timezones():
        await update.message.reply_text("Не знаю такой пояс. Пример: /tz Asia/Yekaterinburg")
        return
    store.set_tz(uid, tz)
    for track in store.get_tracks(uid):
        if track["enabled"]:
            store.set_next_fire(uid, track["track_id"],
                                scheduling.compute_first_fire(track, tz))
    await update.message.reply_text(f"Ок, часовой пояс: {tz}. Расписание пересчитал.")


async def cmd_report(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await _guard(update):
        return
    store = _store(context)
    uid = update.effective_user.id
    prof = store.get_profile(uid)
    if not prof:
        await update.message.reply_text("Напиши /start сначала.")
        return
    text = stats.weekly_report(store, uid, prof["tz"])
    await update.message.reply_text(text, parse_mode=ParseMode.MARKDOWN)


async def cmd_csca(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await _guard(update):
        return
    lines = ["📐 *CSCA Math — ресурсы*", ""]
    for name, url, note in content.CSCA_RESOURCES:
        lines.append(f"• [{name}]({url}) — {note}")
    lines.append("")
    lines.append("_Правило: сначала прогоняй пробники и лови слабые темы, "
                 "потом добивай именно их._")
    await update.message.reply_text("\n".join(lines), parse_mode=ParseMode.MARKDOWN,
                                    disable_web_page_preview=True)


async def cmd_duo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await _guard(update):
        return
    lines = ["🦉 *Duolingo English Test — для поступления в Китай*", ""]
    lines.append("Адаптивный тест ~1 ч, балл 10–160. *Твоя цель — 110–120* "
                 "(этого хватает большинству программ; топовые вузы иногда просят "
                 "120+). Проверь минимум своих вузов заранее.")
    lines.append("")
    for name, url, note in content.DET_RESOURCES:
        lines.append(f"• [{name}]({url}) — {note}")
    lines.append("")
    lines.append("_План: раз в 2 дня бот присылает конкретный тип задания DET "
                 "с подсказкой. Раз в пару недель — полный пробный тест по кнопке._")
    await update.message.reply_text("\n".join(lines), parse_mode=ParseMode.MARKDOWN,
                                    disable_web_page_preview=True)


# --- callbacks -------------------------------------------------------------
async def on_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await _guard(update):
        return
    q = update.callback_query
    store = _store(context)
    uid = update.effective_user.id
    data = q.data or ""
    parts = data.split(":")
    action = parts[0]

    if action in ("done", "skip"):
        hid = int(parts[1])
        h = store.get_history(hid)
        if not h:
            await q.answer("Уже неактуально")
            return
        if action == "done":
            store.set_history_status(hid, "done")
            streak = stats.compute_streak(store, uid, store.get_profile(uid)["tz"])
            await q.answer("Готово 🎯")
            suffix = f"\n\n✅ Готово. 🔥 Стрик: {streak} дн."
        else:
            store.set_history_status(hid, "skipped")
            await q.answer("Пропущено")
            suffix = "\n\n⏭ Пропущено. Ничего, завтра новый заход."
        await _finalize(q, suffix)
        return

    if action == "later":
        hid = int(parts[1])
        await q.answer()
        await q.edit_message_reply_markup(reply_markup=reminders.later_keyboard(hid))
        return

    if action == "back":
        hid = int(parts[1])
        h = store.get_history(hid)
        if h:
            await q.edit_message_reply_markup(
                reply_markup=reminders.action_keyboard(hid, h["content_ref"]))
        await q.answer()
        return

    if action in ("post2h", "posttom"):
        hid = int(parts[1])
        h = store.get_history(hid)
        if not h:
            await q.answer("Уже неактуально")
            return
        store.set_history_status(hid, "postponed")
        prof = store.get_profile(uid)
        now_local = scheduling.local_now(prof["tz"])
        kind = "2h" if action == "post2h" else "tomorrow"
        new_local = scheduling.postpone(now_local, kind, prof["tz"])
        # Ставим next_fire трека на момент переноса, чтобы напоминание пришло снова.
        store.set_next_fire(uid, h["track_id"], new_local)
        when = new_local.strftime("%d.%m %H:%M")
        await q.answer("Перенёс")
        await _finalize(q, f"\n\n🕑 Перенесено на {when}.")
        return

    if action == "why":
        hid = int(parts[1])
        reason = parts[2]
        h = store.get_history(hid)
        if not h:
            await q.answer("Уже неактуально")
            return
        store.set_history_status(hid, "skipped", feedback=reason)
        # На «надоел формат» — двигаем контент и даём паузу треку на пару дней.
        if reason == "bored":
            store.bump_content_index(uid, h["track_id"])
            tr = store.get_track(uid, h["track_id"])
            new_local = scheduling.local_now(store.get_profile(uid)["tz"]) + timedelta(days=2)
            store.set_next_fire(uid, h["track_id"], new_local)
        await q.answer("Принял")
        await _finalize(q, "\n\n" + reminders.why_response(h["track_id"], reason))
        return

    if action == "toggle":
        tid = parts[1]
        tr = store.get_track(uid, tid)
        new_state = 0 if tr["enabled"] else 1
        store.update_track(uid, tid, enabled=new_state)
        if new_state:
            prof = store.get_profile(uid)
            store.set_next_fire(uid, tid,
                                scheduling.compute_first_fire(
                                    store.get_track(uid, tid), prof["tz"]))
        else:
            store.set_next_fire(uid, tid, None)
        await q.answer("Ок")
        await q.edit_message_reply_markup(reply_markup=_tracks_keyboard(store, uid))
        return

    if action == "hour":
        tid = parts[1]
        delta = int(parts[2])
        tr = store.get_track(uid, tid)
        new_hour = (tr["hour"] + delta) % 24
        store.update_track(uid, tid, hour=new_hour)
        prof = store.get_profile(uid)
        if tr["enabled"]:
            store.set_next_fire(uid, tid,
                                scheduling.compute_first_fire(
                                    store.get_track(uid, tid), prof["tz"]))
        await q.answer(f"{new_hour:02d}:00")
        await q.edit_message_reply_markup(reply_markup=_tracks_keyboard(store, uid))
        return

    if action == "adapt":
        if parts[1] == "none":
            await q.answer("Оставил как есть")
            await _finalize(q, "\n\nОк, расписание без изменений.")
            return
        tid = parts[1]
        new_n = int(parts[2])
        store.update_track(uid, tid, n_days=new_n)
        prof = store.get_profile(uid)
        store.set_next_fire(uid, tid,
                            scheduling.compute_first_fire(
                                store.get_track(uid, tid), prof["tz"]))
        await q.answer("Сделал реже")
        await _finalize(q, f"\n\n✅ {config.TRACK_TITLES[tid]}: теперь раз в {new_n} дн.")
        return

    await q.answer()


async def _finalize(q, suffix: str):
    """Гасим кнопки и дописываем результат к тексту напоминания."""
    try:
        base = q.message.text or ""
        await q.edit_message_text(base + suffix, parse_mode=ParseMode.MARKDOWN)
    except Exception:
        try:
            await q.edit_message_reply_markup(reply_markup=None)
        except Exception:
            pass
