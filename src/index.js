// Точка входа Worker.
//   fetch()     — вебхук Telegram (+ служебный /register)
//   scheduled() — крон раз в минуту (напоминания, обзоры)

import { runTick } from "./engine.js";
import { handleUpdate } from "./handlers.js";
import { setWebhook, setMyCommands } from "./telegram.js";

const COMMANDS = [
  { command: "tasks", description: "открытые задачи" },
  { command: "notes", description: "последние заметки" },
  { command: "reminders", description: "активные напоминания" },
  { command: "tz", description: "часовой пояс" },
  { command: "away", description: "автоответ от твоего лица вкл/выкл" },
  { command: "pause", description: "пауза на N дней" },
  { command: "resume", description: "снять паузу" },
  { command: "help", description: "помощь" },
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Один раз открыть в браузере, чтобы привязать вебхук:
    //   https://<worker>.workers.dev/register?secret=<WEBHOOK_SECRET>
    if (url.pathname === "/register") {
      if (!env.WEBHOOK_SECRET || url.searchParams.get("secret") !== env.WEBHOOK_SECRET) {
        return new Response("forbidden", { status: 403 });
      }
      const hookUrl = `${url.origin}/webhook`;
      const wh = await setWebhook(env, hookUrl, env.WEBHOOK_SECRET);
      await setMyCommands(env, COMMANDS);
      return new Response(`setWebhook -> ${hookUrl}\n${JSON.stringify(wh)}`, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    if (url.pathname === "/webhook" && request.method === "POST") {
      const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (!env.WEBHOOK_SECRET || secret !== env.WEBHOOK_SECRET) {
        return new Response("forbidden", { status: 403 });
      }
      let update;
      try { update = await request.json(); }
      catch { return new Response("bad json", { status: 400 }); }
      ctx.waitUntil(handleUpdate(env, update).catch((e) =>
        console.log("handleUpdate error:", e && e.stack || e)));
      return new Response("ok");
    }

    if (url.pathname === "/") return new Response("assistant-bot up");
    return new Response("not found", { status: 404 });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runTick(env).catch((e) =>
      console.log("runTick error:", e && e.stack || e)));
  },
};
