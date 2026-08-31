// Точка входа Worker.
//   fetch()     — принимает webhook от Telegram (+ служебный /register)
//   scheduled() — крон раз в минуту, «сердце» напоминаний

import { runTick } from "./engine.js";
import { handleUpdate } from "./handlers.js";
import { setWebhook, setMyCommands } from "./telegram.js";

const COMMANDS = [
  { command: "start", description: "запустить / приветствие" },
  { command: "status", description: "план на сегодня и стрик" },
  { command: "tracks", description: "треки: расписание и вкл/выкл" },
  { command: "pause", description: "пауза на N дней" },
  { command: "resume", description: "снять паузу" },
  { command: "report", description: "недельный отчёт" },
  { command: "tz", description: "часовой пояс" },
  { command: "csca", description: "ресурсы по математике" },
  { command: "help", description: "помощь" },
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Служебный роут: один раз дёрнуть в браузере, чтобы привязать webhook.
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

    // Webhook от Telegram.
    if (url.pathname === "/webhook" && request.method === "POST") {
      const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (!env.WEBHOOK_SECRET || secret !== env.WEBHOOK_SECRET) {
        return new Response("forbidden", { status: 403 });
      }
      let update;
      try {
        update = await request.json();
      } catch {
        return new Response("bad json", { status: 400 });
      }
      // Обрабатываем в фоне, Telegram сразу получает 200.
      ctx.waitUntil(handleUpdate(env, update).catch((e) =>
        console.log("handleUpdate error:", e && e.stack || e)));
      return new Response("ok");
    }

    if (url.pathname === "/") return new Response("learning-bot up");
    return new Response("not found", { status: 404 });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runTick(env).catch((e) =>
      console.log("runTick error:", e && e.stack || e)));
  },
};
