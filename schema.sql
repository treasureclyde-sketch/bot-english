-- Схема D1 для бота-ассистента. Времена — UNIX-ms (INTEGER).

CREATE TABLE IF NOT EXISTS profile (
    user_id      INTEGER PRIMARY KEY,
    chat_id      INTEGER,
    tz           TEXT,
    morning_hour INTEGER DEFAULT 8,   -- час утреннего плана
    evening_hour INTEGER DEFAULT 21,  -- час вечернего обзора
    active       INTEGER DEFAULT 1,
    paused_until INTEGER,             -- ms или NULL
    created_at   INTEGER,
    -- Telegram Business: автоответ от лица владельца
    away         INTEGER DEFAULT 0,   -- 1 = бот отвечает за тебя в бизнес-чатах
    biz_conn_id  TEXT,                -- business_connection_id (или NULL)
    biz_can_reply INTEGER DEFAULT 0   -- выдал ли владелец право отвечать
);

-- Переписки бизнес-чатов (контекст для автоответа). role: them | me
CREATE TABLE IF NOT EXISTS biz_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,              -- владелец (OWNER_ID)
    chat_id    INTEGER,              -- собеседник/чат
    role       TEXT,                 -- them (собеседник) | me (ответ от лица владельца)
    content    TEXT,
    created_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_biz_chat ON biz_messages (user_id, chat_id, id);

-- Заметки: всё, что попросили запомнить.
CREATE TABLE IF NOT EXISTS notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,
    text       TEXT,
    tags       TEXT,                  -- через запятую, опционально
    created_at INTEGER
);

-- Задачи / домашка.
CREATE TABLE IF NOT EXISTS tasks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,
    title      TEXT,
    subject    TEXT,                  -- предмет/категория, опционально
    due_at     INTEGER,               -- дедлайн, ms или NULL
    status     TEXT DEFAULT 'open',   -- open | done
    created_at INTEGER,
    done_at    INTEGER
);

-- Напоминания: разовые и повторяющиеся.
CREATE TABLE IF NOT EXISTS reminders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER,
    text         TEXT,
    kind         TEXT,                -- once | recurring
    next_fire_at INTEGER,             -- ms
    recurrence   TEXT,                -- JSON {cadence,n_days,weekday,hour,minute} для recurring
    active       INTEGER DEFAULT 1,
    created_at   INTEGER
);

-- Короткая память диалога (последние сообщения) — контекст для LLM.
CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,
    role       TEXT,                  -- user | assistant
    content    TEXT,
    created_at INTEGER
);

-- Служебные отметки (дедупликация утреннего/вечернего обзора и т.п.).
CREATE TABLE IF NOT EXISTS meta (
    user_id INTEGER,
    key     TEXT,
    value   TEXT,
    PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks (user_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_reminders_fire ON reminders (user_id, active, next_fire_at);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages (user_id, id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes (user_id, id);
