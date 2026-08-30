"""Слой 2: логика напоминаний (чистые функции, без Telegram).

Отвечает на вопрос «когда трек должен сработать в следующий раз» с учётом:
  * кадентности трека (каждый день / раз в N дней / раз в неделю);
  * правила воскресенья — в воскресенье напоминаний нет, переносим на понедельник;
  * правила приоритета — 6min утром, CSCA вечером (обеспечивается разным
    временем в конфиге; здесь мы это не ломаем).
"""

from datetime import datetime, timedelta, time
from zoneinfo import ZoneInfo

import config


def local_now(tz: str) -> datetime:
    return datetime.now(ZoneInfo(tz))


def _at(dt_date, hour, minute, tz):
    return datetime.combine(
        dt_date, time(hour=hour, minute=minute), tzinfo=ZoneInfo(tz)
    )


def _skip_sunday(dt: datetime) -> datetime:
    """Правило воскресенья: если попали на воскресенье — двигаем на понедельник."""
    if dt.weekday() == config.QUIET_WEEKDAY:
        return dt + timedelta(days=1)
    return dt


def compute_first_fire(track, tz: str, now: datetime = None) -> datetime:
    """Первое срабатывание трека, считая от «сейчас».

    Возвращает datetime с таймзоной пользователя.
    """
    now = now or local_now(tz)
    hour, minute = track["hour"], track["minute"]

    if track["cadence"] == "weekly":
        target_wd = track["weekday"]
        days_ahead = (target_wd - now.weekday()) % 7
        cand = _at(now.date(), hour, minute, tz) + timedelta(days=days_ahead)
        if days_ahead == 0 and cand <= now:
            cand += timedelta(days=7)
        return cand

    # daily / every_n_days: сегодня в назначенное время, если ещё не прошло,
    # иначе завтра. Затем убираем воскресенье.
    cand = _at(now.date(), hour, minute, tz)
    if cand <= now:
        cand += timedelta(days=1)
    return _skip_sunday(cand)


def compute_next_fire(track, tz: str, from_dt: datetime) -> datetime:
    """Следующее срабатывание после того, как трек уже сработал в from_dt."""
    hour, minute = track["hour"], track["minute"]

    if track["cadence"] == "weekly":
        cand = _at(from_dt.date(), hour, minute, tz) + timedelta(days=7)
        return cand

    step = 1 if track["cadence"] == "daily" else max(1, track["n_days"])
    cand = _at(from_dt.date(), hour, minute, tz) + timedelta(days=step)
    return _skip_sunday(cand)


def postpone(dt_local: datetime, kind: str, tz: str) -> datetime:
    """Перенос напоминания. kind: '2h' | 'tomorrow'."""
    if kind == "2h":
        return dt_local + timedelta(hours=2)
    if kind == "tomorrow":
        nxt = dt_local + timedelta(days=1)
        return _skip_sunday(nxt)
    return dt_local


def is_quiet_day(dt_local: datetime) -> bool:
    return dt_local.weekday() == config.QUIET_WEEKDAY


def order_due(track_ids):
    """Упорядочить сработавшие треки по приоритету (6min -> CSCA -> ЕГЭ)."""
    return sorted(track_ids, key=lambda t: config.TRACK_ORDER.index(t)
                  if t in config.TRACK_ORDER else 99)
