"""Слой 1: хранилище.

SQLite. Три сущности из структуры:
  * profile  — профиль пользователя (часовой пояс, пауза, активность)
  * tracks   — треки обучения со своими параметрами и «когда в следующий раз»
  * history  — на каждое напоминание: sent / done / skipped / postponed
Плюс meta — служебные отметки (когда слали отчёты, старт стрика и т.п.).

Всё синхронно: бот однопользовательский и нагрузки нет, отдельный event-loop
для БД не нужен.
"""

import os
import sqlite3
from datetime import datetime, timezone

import config

_ISO = "%Y-%m-%dT%H:%M:%S%z"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def to_iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime(_ISO)


def from_iso(s: str) -> datetime:
    if not s:
        return None
    return datetime.strptime(s, _ISO)


class Store:
    def __init__(self, path: str = None):
        self.path = path or config.DB_PATH
        d = os.path.dirname(self.path)
        if d:
            os.makedirs(d, exist_ok=True)
        self.conn = sqlite3.connect(self.path)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self._init_schema()

    def _init_schema(self):
        c = self.conn
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS profile (
                user_id      INTEGER PRIMARY KEY,
                chat_id      INTEGER,
                tz           TEXT,
                active       INTEGER DEFAULT 1,
                paused_until TEXT,
                morning_hour INTEGER,
                evening_hour INTEGER,
                created_at   TEXT
            );

            CREATE TABLE IF NOT EXISTS tracks (
                user_id       INTEGER,
                track_id      TEXT,
                enabled       INTEGER DEFAULT 1,
                cadence       TEXT,
                n_days        INTEGER,
                weekday       INTEGER,
                hour          INTEGER,
                minute        INTEGER,
                duration_min  INTEGER,
                next_fire_at  TEXT,
                content_index INTEGER DEFAULT 0,
                PRIMARY KEY (user_id, track_id)
            );

            CREATE TABLE IF NOT EXISTS history (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id        INTEGER,
                track_id       TEXT,
                scheduled_date TEXT,   -- локальная дата YYYY-MM-DD
                sent_at        TEXT,
                content_title  TEXT,
                content_ref    TEXT,
                status         TEXT,   -- sent | done | skipped | postponed
                acted_at       TEXT,
                feedback       TEXT
            );

            CREATE TABLE IF NOT EXISTS meta (
                user_id INTEGER,
                key     TEXT,
                value   TEXT,
                PRIMARY KEY (user_id, key)
            );

            CREATE INDEX IF NOT EXISTS idx_history_user_track
                ON history (user_id, track_id, id);
            """
        )
        c.commit()

    # --- profile ----------------------------------------------------------
    def ensure_user(self, user_id: int, chat_id: int):
        row = self.conn.execute(
            "SELECT user_id FROM profile WHERE user_id=?", (user_id,)
        ).fetchone()
        if row:
            self.conn.execute(
                "UPDATE profile SET chat_id=? WHERE user_id=?", (chat_id, user_id)
            )
            self.conn.commit()
            return False
        self.conn.execute(
            "INSERT INTO profile (user_id, chat_id, tz, active, morning_hour,"
            " evening_hour, created_at) VALUES (?,?,?,?,?,?,?)",
            (user_id, chat_id, config.DEFAULT_TZ, 1, 8, 19, to_iso(utcnow())),
        )
        for tid, cfg in config.DEFAULT_TRACKS.items():
            self.conn.execute(
                "INSERT INTO tracks (user_id, track_id, enabled, cadence, n_days,"
                " weekday, hour, minute, duration_min, next_fire_at, content_index)"
                " VALUES (?,?,?,?,?,?,?,?,?,?,0)",
                (user_id, tid, cfg["enabled"], cfg["cadence"], cfg["n_days"],
                 cfg["weekday"], cfg["hour"], cfg["minute"], cfg["duration_min"],
                 None),
            )
        self.conn.commit()
        return True

    def get_profile(self, user_id: int):
        return self.conn.execute(
            "SELECT * FROM profile WHERE user_id=?", (user_id,)
        ).fetchone()

    def set_active(self, user_id: int, active: int, paused_until: datetime = None):
        self.conn.execute(
            "UPDATE profile SET active=?, paused_until=? WHERE user_id=?",
            (active, to_iso(paused_until) if paused_until else None, user_id),
        )
        self.conn.commit()

    def set_tz(self, user_id: int, tz: str):
        self.conn.execute("UPDATE profile SET tz=? WHERE user_id=?", (tz, user_id))
        self.conn.commit()

    def all_users(self):
        return self.conn.execute("SELECT * FROM profile").fetchall()

    # --- tracks -----------------------------------------------------------
    def get_track(self, user_id: int, track_id: str):
        return self.conn.execute(
            "SELECT * FROM tracks WHERE user_id=? AND track_id=?",
            (user_id, track_id),
        ).fetchone()

    def get_tracks(self, user_id: int):
        return self.conn.execute(
            "SELECT * FROM tracks WHERE user_id=?", (user_id,)
        ).fetchall()

    def update_track(self, user_id: int, track_id: str, **fields):
        if not fields:
            return
        cols = ", ".join(f"{k}=?" for k in fields)
        vals = list(fields.values()) + [user_id, track_id]
        self.conn.execute(
            f"UPDATE tracks SET {cols} WHERE user_id=? AND track_id=?", vals
        )
        self.conn.commit()

    def set_next_fire(self, user_id: int, track_id: str, dt: datetime):
        self.conn.execute(
            "UPDATE tracks SET next_fire_at=? WHERE user_id=? AND track_id=?",
            (to_iso(dt) if dt else None, user_id, track_id),
        )
        self.conn.commit()

    def bump_content_index(self, user_id: int, track_id: str):
        self.conn.execute(
            "UPDATE tracks SET content_index=content_index+1"
            " WHERE user_id=? AND track_id=?",
            (user_id, track_id),
        )
        self.conn.commit()

    # --- history ----------------------------------------------------------
    def add_history(self, user_id, track_id, scheduled_date, sent_at,
                    title, ref, status):
        cur = self.conn.execute(
            "INSERT INTO history (user_id, track_id, scheduled_date, sent_at,"
            " content_title, content_ref, status) VALUES (?,?,?,?,?,?,?)",
            (user_id, track_id, scheduled_date, to_iso(sent_at), title, ref, status),
        )
        self.conn.commit()
        return cur.lastrowid

    def get_history(self, hid: int):
        return self.conn.execute(
            "SELECT * FROM history WHERE id=?", (hid,)
        ).fetchone()

    def set_history_status(self, hid: int, status: str, feedback: str = None):
        self.conn.execute(
            "UPDATE history SET status=?, acted_at=?, feedback=COALESCE(?, feedback)"
            " WHERE id=?",
            (status, to_iso(utcnow()), feedback, hid),
        )
        self.conn.commit()

    def pending_today(self, user_id, track_id, scheduled_date):
        """Есть ли уже отправленное сегодня напоминание по этому треку
        (чтобы не слать дважды за один локальный день)."""
        return self.conn.execute(
            "SELECT * FROM history WHERE user_id=? AND track_id=?"
            " AND scheduled_date=? ORDER BY id DESC LIMIT 1",
            (user_id, track_id, scheduled_date),
        ).fetchone()

    def last_terminal(self, user_id, track_id, limit=5):
        """Последние решённые (не 'sent'/'postponed') записи по треку —
        для детекции серии пропусков."""
        return self.conn.execute(
            "SELECT * FROM history WHERE user_id=? AND track_id=?"
            " AND status IN ('done','skipped') ORDER BY id DESC LIMIT ?",
            (user_id, track_id, limit),
        ).fetchall()

    def history_between(self, user_id, start_iso, end_iso):
        return self.conn.execute(
            "SELECT * FROM history WHERE user_id=? AND sent_at>=? AND sent_at<?"
            " ORDER BY id",
            (user_id, start_iso, end_iso),
        ).fetchall()

    def all_history(self, user_id):
        return self.conn.execute(
            "SELECT * FROM history WHERE user_id=? ORDER BY id", (user_id,)
        ).fetchall()

    # --- meta -------------------------------------------------------------
    def get_meta(self, user_id, key, default=None):
        row = self.conn.execute(
            "SELECT value FROM meta WHERE user_id=? AND key=?", (user_id, key)
        ).fetchone()
        return row["value"] if row else default

    def set_meta(self, user_id, key, value):
        self.conn.execute(
            "INSERT INTO meta (user_id, key, value) VALUES (?,?,?)"
            " ON CONFLICT(user_id, key) DO UPDATE SET value=excluded.value",
            (user_id, key, str(value)),
        )
        self.conn.commit()

    def close(self):
        self.conn.close()
