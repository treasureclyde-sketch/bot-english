"""Глобальная конфигурация и дефолты профиля/треков.

Всё, что можно поменять руками через команды бота, живёт в базе. Здесь —
только значения по умолчанию, с которыми пользователь заводится в первый раз.
"""

import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
OWNER_ID = int(os.getenv("OWNER_ID", "0") or "0")
DB_PATH = os.getenv("DB_PATH", "data/bot.sqlite3")

# Часовой пояс по умолчанию — Уфа.
DEFAULT_TZ = "Asia/Yekaterinburg"  # UTC+5, тот же, что Уфа

# Идентификаторы треков.
TRACK_6MIN = "6min_english"
TRACK_EGE = "ege_test"
TRACK_CSCA = "csca_math"
TRACK_DET = "duolingo_det"

# Порядок приоритета в течение дня (кто идёт первым, если совпали).
TRACK_ORDER = [TRACK_6MIN, TRACK_DET, TRACK_CSCA, TRACK_EGE]

# Понятные названия для отчётов и меню.
TRACK_TITLES = {
    TRACK_6MIN: "6 Minute English",
    TRACK_EGE: "Пробник ЕГЭ",
    TRACK_CSCA: "CSCA Math",
    TRACK_DET: "Duolingo Test",
}

# Дефолтные расписания треков.
#   cadence: "daily" | "every_n_days" | "weekly"
#   hour/minute — локальное время пользователя
#   weekday — только для weekly (0=Пн ... 6=Вс)
#   n_days — только для every_n_days
#
# Кадентность (по просьбе пользователя):
#   6 Minute English — раз в 2 дня (утро)
#   Duolingo Test    — раз в 2 дня (день) — нужен для поступления в вузы Китая
#   CSCA Math        — раз в 3 дня (вечер) — подробный двуязычный урок
#   Пробник ЕГЭ      — раз в неделю (суббота)
DEFAULT_TRACKS = {
    TRACK_6MIN: {
        "enabled": 1,
        "cadence": "every_n_days",
        "n_days": 2,
        "weekday": None,
        "hour": 8,
        "minute": 0,
        "duration_min": 10,
    },
    TRACK_DET: {
        "enabled": 1,
        "cadence": "every_n_days",
        "n_days": 2,
        "weekday": None,
        "hour": 17,
        "minute": 0,
        "duration_min": 20,
    },
    TRACK_CSCA: {
        "enabled": 1,
        "cadence": "every_n_days",
        "n_days": 3,
        "weekday": None,
        "hour": 19,
        "minute": 0,
        "duration_min": 45,
    },
    TRACK_EGE: {
        "enabled": 1,
        "cadence": "weekly",
        "n_days": 7,
        "weekday": 5,  # суббота
        "hour": 10,
        "minute": 0,
        "duration_min": 120,
    },
}

# Версия дефолтов треков. Если у существующего пользователя записана меньшая
# версия — db.sync_tracks() один раз обновит кадентности и добавит новые треки.
TRACKS_SCHEMA_VERSION = 2

# Правило воскресенья: в этот день бот молчит (кроме недельного отчёта).
QUIET_WEEKDAY = 6  # 6 = воскресенье

# Недельный отчёт: воскресенье вечером.
WEEKLY_REPORT_WEEKDAY = 6
WEEKLY_REPORT_HOUR = 20

# Месячный отчёт: 1-е число, утром.
MONTHLY_REPORT_DAY = 1
MONTHLY_REPORT_HOUR = 9

# Сколько пропусков подряд по треку, прежде чем бот спросит «что случилось».
SKIP_STREAK_THRESHOLD = 2

# Порог «проседания» трека в месячном отчёте (доля выполнения).
UNDERPERFORM_RATIO = 0.5
