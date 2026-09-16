// Тонкая обёртка над Telegram Bot API.

function api(env, method) {
  return `https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`;
}

async function call(env, method, payload) {
  const res = await fetch(api(env, method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) console.log(`tg ${method} failed:`, JSON.stringify(data));
  return data;
}

// Телеграм режет сообщения длиннее 4096 — бьём на части.
export async function sendMessage(env, chatId, text, opts = {}) {
  const LIMIT = 4000;
  const chunks = [];
  let s = String(text ?? "");
  if (!s) return;
  while (s.length > LIMIT) {
    let cut = s.lastIndexOf("\n", LIMIT);
    if (cut < LIMIT * 0.6) cut = LIMIT;
    chunks.push(s.slice(0, cut));
    s = s.slice(cut);
  }
  chunks.push(s);
  let last;
  for (let i = 0; i < chunks.length; i++) {
    last = await call(env, "sendMessage", {
      chat_id: chatId,
      text: chunks[i],
      disable_web_page_preview: true,
      // Если задан — сообщение уходит ОТ ЛИЦА владельца (Telegram Business).
      business_connection_id: opts.businessConnectionId,
      reply_markup: i === chunks.length - 1 ? opts.replyMarkup : undefined,
    });
  }
  return last;
}

export function answerCallbackQuery(env, id, text) {
  return call(env, "answerCallbackQuery", { callback_query_id: id, text });
}

export function editMessageText(env, chatId, messageId, text, opts = {}) {
  return call(env, "editMessageText", {
    chat_id: chatId, message_id: messageId, text,
    disable_web_page_preview: true,
    reply_markup: opts.replyMarkup,
  });
}

export function editMessageReplyMarkup(env, chatId, messageId, replyMarkup) {
  return call(env, "editMessageReplyMarkup", {
    chat_id: chatId, message_id: messageId,
    reply_markup: replyMarkup ?? { inline_keyboard: [] },
  });
}

export function sendChatAction(env, chatId, action = "typing") {
  return call(env, "sendChatAction", { chat_id: chatId, action });
}

export function setMyCommands(env, commands) {
  return call(env, "setMyCommands", { commands });
}

export function setWebhook(env, url, secretToken) {
  return call(env, "setWebhook", {
    url, secret_token: secretToken,
    allowed_updates: ["message", "callback_query", "business_connection", "business_message"],
  });
}
