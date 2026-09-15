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

export function sendMessage(env, chatId, text, opts = {}) {
  // parseMode по умолчанию Markdown; передай parseMode:null для plain-текста
  // (математические уроки CSCA со знаками ^, _, * ломали бы разметку).
  const pm = "parseMode" in opts ? opts.parseMode : "Markdown";
  return call(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: pm || undefined,
    disable_web_page_preview: opts.disablePreview ?? false,
    reply_markup: opts.replyMarkup,
  });
}

export function editMessageText(env, chatId, messageId, text, opts = {}) {
  return call(env, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: opts.disablePreview ?? true,
    reply_markup: opts.replyMarkup,
  });
}

export function editMessageReplyMarkup(env, chatId, messageId, replyMarkup) {
  return call(env, "editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: replyMarkup ?? { inline_keyboard: [] },
  });
}

export function answerCallbackQuery(env, id, text) {
  return call(env, "answerCallbackQuery", { callback_query_id: id, text });
}

export function setMyCommands(env, commands) {
  return call(env, "setMyCommands", { commands });
}

export function setWebhook(env, url, secretToken) {
  return call(env, "setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query"],
  });
}
