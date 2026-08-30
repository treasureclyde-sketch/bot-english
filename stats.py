"""Слой 4: обратная связь и статистика.

Недельный отчёт, месячный отчёт, стрик. Работает поверх history.
"""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import config
from db import from_iso, to_iso


def _local_date(iso_sent_at: str, tz: str):
    dt = from_iso(iso_sent_at)
    if dt is None:
        return None
    return dt.astimezone(ZoneInfo(tz)).date()


def compute_streak(store, user_id: int, tz: str) -> int:
    """Стрик: сколько дней подряд (считая от сегодня/вчера назад) было хотя бы
    одно выполненное задание ('done'). Пропущенный день обрывает стрик.
    Сегодня без активности стрик не обрывает, если вчера была — даём день добить.
    """
    rows = store.all_history(user_id)
    done_days = set()
    for r in rows:
        if r["status"] == "done":
            d = _local_date(r["sent_at"], tz)
            if d:
                done_days.add(d)
    if not done_days:
        return 0

    today = datetime.now(ZoneInfo(tz)).date()
    # Стартуем с сегодня, если есть done; иначе со вчера (день ещё не кончился).
    if today in done_days:
        cursor = today
    elif (today - timedelta(days=1)) in done_days:
        cursor = today - timedelta(days=1)
    else:
        return 0

    streak = 0
    while cursor in done_days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def _count(rows, track_id, status):
    return sum(1 for r in rows if r["track_id"] == track_id and r["status"] == status)


def _sent(rows, track_id):
    # Сколько раз трек реально просили (любой финальный или отправленный статус).
    return sum(1 for r in rows if r["track_id"] == track_id)


def weekly_report(store, user_id: int, tz: str) -> str:
    now = datetime.now(ZoneInfo(tz))
    start_local = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0,
                                                     microsecond=0)
    rows = store.history_between(
        user_id, to_iso(start_local.astimezone(ZoneInfo("UTC"))),
        to_iso(now.astimezone(ZoneInfo("UTC"))),
    )
    streak = compute_streak(store, user_id, tz)

    lines = ["📊 *Недельный отчёт*", ""]
    for tid in config.TRACK_ORDER:
        track = store.get_track(user_id, tid)
        if not track or not track["enabled"]:
            continue
        done = _count(rows, tid, "done")
        planned = _sent(rows, tid)
        title = config.TRACK_TITLES[tid]
        if tid == config.TRACK_EGE:
            mark = "✅ сделал" if done else "— не сделал"
            lines.append(f"• *{title}*: {mark}")
        else:
            lines.append(f"• *{title}*: сделано {done} из {planned or '—'}")

    lines.append("")
    fire = "🔥" if streak > 0 else "•"
    lines.append(f"{fire} Стрик: *{streak}* дн. подряд")
    if streak == 0:
        lines.append("_Один день — и стрик снова живой. Начни сегодня._")
    return "\n".join(lines)


def monthly_report(store, user_id: int, tz: str):
    """Возвращает (текст, предложение_адаптации|None).

    Предложение — (track_id, новый_n_days) если трек проседает.
    """
    now = datetime.now(ZoneInfo(tz))
    start_local = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0,
                                                     microsecond=0)
    rows = store.history_between(
        user_id, to_iso(start_local.astimezone(ZoneInfo("UTC"))),
        to_iso(now.astimezone(ZoneInfo("UTC"))),
    )

    lines = ["🗓 *Месячный отчёт*", ""]
    total_done = total_planned = 0
    worst = None  # (ratio, track_id)
    for tid in config.TRACK_ORDER:
        track = store.get_track(user_id, tid)
        if not track or not track["enabled"]:
            continue
        done = _count(rows, tid, "done")
        planned = _sent(rows, tid)
        total_done += done
        total_planned += planned
        ratio = (done / planned) if planned else None
        title = config.TRACK_TITLES[tid]
        pct = f"{round(ratio * 100)}%" if ratio is not None else "нет данных"
        lines.append(f"• *{title}*: {done}/{planned or '—'} ({pct})")
        if ratio is not None and planned >= 3:
            if worst is None or ratio < worst[0]:
                worst = (ratio, tid)

    overall = (total_done / total_planned) if total_planned else 0
    lines.insert(2, f"Общий процент выполнения: *{round(overall * 100)}%*")
    lines.insert(3, "")

    suggestion = None
    if worst and worst[0] < config.UNDERPERFORM_RATIO:
        ratio, tid = worst
        track = store.get_track(user_id, tid)
        title = config.TRACK_TITLES[tid]
        lines.append("")
        if track["cadence"] == "every_n_days":
            new_n = track["n_days"] + 2
            lines.append(
                f"⚠️ *{title}* проседает ({round(ratio*100)}%). Может, реже —"
                f" раз в {new_n} дня вместо {track['n_days']}? Так проще держать ритм."
            )
            suggestion = (tid, new_n)
        else:
            lines.append(
                f"⚠️ *{title}* проседает ({round(ratio*100)}%). Стоит вернуться"
                " к нему или пересмотреть формат."
            )
    return "\n".join(lines), suggestion
