"""Оффлайн-проверка логики без Telegram: хранилище, расписание, статистика,
контент. Запуск: python -m pytest tests/ (или python tests/test_logic.py)."""

import os
import sys
import tempfile
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config
import content
import scheduling
import stats
from db import Store, to_iso, utcnow

TZ = "Asia/Yekaterinburg"


def _store():
    fd, path = tempfile.mkstemp(suffix=".sqlite3")
    os.close(fd)
    return Store(path)


def test_ensure_user_creates_tracks():
    s = _store()
    assert s.ensure_user(1, 100) is True
    assert s.ensure_user(1, 100) is False  # второй раз не новый
    tracks = {t["track_id"] for t in s.get_tracks(1)}
    assert tracks == set(config.DEFAULT_TRACKS)


def test_daily_skips_sunday():
    s = _store()
    s.ensure_user(1, 100)
    tr = s.get_track(1, config.TRACK_6MIN)
    # Суббота 09:00 -> следующее (воскресенье) должно перескочить на понедельник.
    sat = datetime(2026, 8, 29, 9, 0, tzinfo=ZoneInfo(TZ))  # суббота
    nxt = scheduling.compute_next_fire(tr, TZ, sat)
    assert nxt.weekday() == 0  # понедельник, не воскресенье


def test_first_fire_future():
    s = _store()
    s.ensure_user(1, 100)
    tr = s.get_track(1, config.TRACK_6MIN)  # 08:00
    now = datetime(2026, 8, 31, 10, 0, tzinfo=ZoneInfo(TZ))  # понедельник, 10:00 > 08:00
    first = scheduling.compute_first_fire(tr, TZ, now)
    assert first > now
    assert first.hour == 8


def test_weekly_lands_on_weekday():
    s = _store()
    s.ensure_user(1, 100)
    tr = s.get_track(1, config.TRACK_EGE)  # суббота
    now = datetime(2026, 8, 31, 10, 0, tzinfo=ZoneInfo(TZ))  # понедельник
    first = scheduling.compute_first_fire(tr, TZ, now)
    assert first.weekday() == 5  # суббота


def test_postpone():
    now = datetime(2026, 8, 31, 8, 0, tzinfo=ZoneInfo(TZ))
    assert scheduling.postpone(now, "2h", TZ).hour == 10
    tom = scheduling.postpone(now, "tomorrow", TZ)
    assert tom.day == 1  # 1 сентября


def test_streak():
    s = _store()
    s.ensure_user(1, 100)
    today = datetime.now(ZoneInfo(TZ))
    # done сегодня, вчера, позавчера -> стрик 3
    for d in range(3):
        day = today - timedelta(days=d)
        s.conn.execute(
            "INSERT INTO history (user_id, track_id, scheduled_date, sent_at,"
            " content_title, content_ref, status) VALUES (?,?,?,?,?,?,?)",
            (1, config.TRACK_6MIN, day.date().isoformat(),
             to_iso(day.astimezone(ZoneInfo('UTC'))), "t", "r", "done"),
        )
    s.conn.commit()
    assert stats.compute_streak(s, 1, TZ) == 3


def test_skip_streak_detection():
    s = _store()
    s.ensure_user(1, 100)
    for _ in range(2):
        hid = s.add_history(1, config.TRACK_CSCA, "2026-08-30", utcnow(), "t", "r", "sent")
        s.set_history_status(hid, "skipped")
    last = s.last_terminal(1, config.TRACK_CSCA, limit=2)
    assert len(last) == 2 and all(r["status"] == "skipped" for r in last)


def test_content_progression():
    n0, t0, l0, m0 = content.six_min_task(0)
    n1, t1, l1, m1 = content.six_min_task(1)
    assert t0 != t1 and m0 == 10
    b, title, task, link, minutes = content.csca_task(0)
    assert b == 1 and link == content.CSCA_APP
    # За концом программы — повтор последнего блока (mock).
    far = content.csca_task(len(content.CSCA_PROGRAM) + 5)
    assert far[3] == content.CSCA_APP


def test_monthly_underperform_suggestion():
    s = _store()
    s.ensure_user(1, 100)
    now = datetime.now(ZoneInfo(TZ))
    # CSCA: 4 отправлено, 1 done -> 25% -> должно предложить реже.
    for i in range(4):
        day = now - timedelta(days=i * 2)
        status = "done" if i == 0 else "skipped"
        s.conn.execute(
            "INSERT INTO history (user_id, track_id, scheduled_date, sent_at,"
            " content_title, content_ref, status) VALUES (?,?,?,?,?,?,?)",
            (1, config.TRACK_CSCA, day.date().isoformat(),
             to_iso(day.astimezone(ZoneInfo('UTC'))), "t", "r", status),
        )
    s.conn.commit()
    text, suggestion = stats.monthly_report(s, 1, TZ)
    assert suggestion is not None
    assert suggestion[0] == config.TRACK_CSCA
    assert suggestion[1] > 2  # реже, чем было (2)


def run_all():
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for fn in fns:
        fn()
        print(f"ok  {fn.__name__}")
    print(f"\n{len(fns)} passed")


if __name__ == "__main__":
    run_all()
