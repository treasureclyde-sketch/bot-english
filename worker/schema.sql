-- Схема D1 (SQLite). Слой 1 из структуры: профиль, треки, история + meta.
-- Времена храним как UNIX-ms (INTEGER) — удобно сравнивать в кроне.

CREATE TABLE IF NOT EXISTS profile (
    user_id      INTEGER PRIMARY KEY,
    chat_id      INTEGER,
    tz           TEXT,
    active       INTEGER DEFAULT 1,
    paused_until INTEGER,          -- ms или NULL
    created_at   INTEGER
);

CREATE TABLE IF NOT EXISTS tracks (
    user_id       INTEGER,
    track_id      TEXT,
    enabled       INTEGER DEFAULT 1,
    cadence       TEXT,            -- daily | every_n_days | weekly
    n_days        INTEGER,
    weekday       INTEGER,         -- 0=Пн ... 6=Вс (для weekly)
    hour          INTEGER,
    minute        INTEGER,
    duration_min  INTEGER,
    next_fire_at  INTEGER,         -- ms или NULL
    content_index INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, track_id)
);

CREATE TABLE IF NOT EXISTS history (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER,
    track_id       TEXT,
    scheduled_date TEXT,           -- локальная дата YYYY-MM-DD
    sent_at        INTEGER,        -- ms
    content_title  TEXT,
    content_ref    TEXT,
    status         TEXT,           -- sent | done | skipped | postponed
    acted_at       INTEGER,
    feedback       TEXT
);

CREATE TABLE IF NOT EXISTS meta (
    user_id INTEGER,
    key     TEXT,
    value   TEXT,
    PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_history_user_track ON history (user_id, track_id, id);
CREATE INDEX IF NOT EXISTS idx_history_sent ON history (user_id, sent_at);
