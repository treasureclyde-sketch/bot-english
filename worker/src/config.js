// Дефолты профиля и треков. Всё, что можно менять кнопками, живёт в D1;
// здесь — только значения по умолчанию для первого запуска.

export const DEFAULT_TZ = "Asia/Yekaterinburg"; // UTC+5, как Уфа

export const TRACK_6MIN = "6min_english";
export const TRACK_EGE = "ege_test";
export const TRACK_CSCA = "csca_math";

// Порядок приоритета в течение дня.
export const TRACK_ORDER = [TRACK_6MIN, TRACK_CSCA, TRACK_EGE];

export const TRACK_TITLES = {
  [TRACK_6MIN]: "6 Minute English",
  [TRACK_EGE]: "Пробник ЕГЭ",
  [TRACK_CSCA]: "CSCA Math",
};

// cadence: "daily" | "every_n_days" | "weekly"
// weekday: 0=Пн ... 6=Вс (только weekly)
export const DEFAULT_TRACKS = {
  [TRACK_6MIN]: { enabled: 1, cadence: "daily", n_days: 1, weekday: null, hour: 8, minute: 0, duration_min: 10 },
  [TRACK_CSCA]: { enabled: 1, cadence: "every_n_days", n_days: 2, weekday: null, hour: 19, minute: 0, duration_min: 40 },
  [TRACK_EGE]: { enabled: 1, cadence: "weekly", n_days: 7, weekday: 5, hour: 10, minute: 0, duration_min: 120 },
};

// Правило воскресенья: в этот день напоминаний нет (кроме недельного отчёта).
export const QUIET_WEEKDAY = 6; // воскресенье

export const WEEKLY_REPORT_WEEKDAY = 6;
export const WEEKLY_REPORT_HOUR = 20;

export const MONTHLY_REPORT_DAY = 1;
export const MONTHLY_REPORT_HOUR = 9;

export const SKIP_STREAK_THRESHOLD = 2;
export const UNDERPERFORM_RATIO = 0.5;
