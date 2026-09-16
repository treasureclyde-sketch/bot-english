// Вызов Claude Messages API (raw HTTP из воркера).

import { MODEL, ANTHROPIC_VERSION, MAX_TOKENS, THINKING } from "./config.js";

// system может быть массивом блоков — тогда cache_control на стабильном блоке
// кэширует префикс (инструменты + инструкции), и повторные вызовы стоят ~10%.
export async function anthropicMessages(env, { system, messages, tools }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: THINKING,
      system,
      messages,
      tools,
      tool_choice: { type: "auto" },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.type === "error") {
    const msg = data && data.error ? data.error.message : `HTTP ${res.status}`;
    throw new Error(`anthropic: ${msg}`);
  }
  return data; // {content:[...], stop_reason, usage, ...}
}

// Собрать текст из блоков ответа.
export function extractText(content) {
  return (content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// Вытащить блоки tool_use.
export function toolUses(content) {
  return (content || []).filter((b) => b.type === "tool_use");
}
