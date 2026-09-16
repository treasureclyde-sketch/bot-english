// Дефолты. Всё, что меняется в рантайме, живёт в D1; тут — значения на старте.

export const DEFAULT_TZ = "Asia/Yekaterinburg"; // UTC+5

// Модель ассистента. Sonnet — умный и недорогой (за глаза для разбора сообщений).
export const MODEL = "claude-sonnet-5";
export const ANTHROPIC_VERSION = "2023-06-01";
export const MAX_TOKENS = 2048;
export const MAX_TOOL_ITERS = 6; // предохранитель от зацикливания tool-use

// Отключаем «размышление» у Sonnet: для разбора сообщений и вызова инструментов
// оно не нужно, а так дешевле по выходным токенам и быстрее отклик.
export const THINKING = { type: "disabled" };

// Сколько последних сообщений диалога держим как контекст для LLM.
export const HISTORY_LIMIT = 12;

// Часы обзоров по умолчанию.
export const MORNING_HOUR = 8;
export const EVENING_HOUR = 21;
