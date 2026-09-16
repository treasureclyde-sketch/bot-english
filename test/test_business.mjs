// Telegram Business: автоответ от лица владельца. Всё замокано.
// Запуск: node --experimental-sqlite test/test_business.mjs

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import * as db from "../src/db.js";
import { handleUpdate } from "../src/handlers.js";

const sqlite = new DatabaseSync(":memory:");
sqlite.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));

const env = {
  OWNER_ID: "42",
  ANTHROPIC_API_KEY: "test",
  DB: {
    prepare(sql) {
      return {
        _args: [],
        bind(...a) { this._args = a; return this; },
        async first() { return sqlite.prepare(sql).get(...this._args) ?? null; },
        async all() { return { results: sqlite.prepare(sql).all(...this._args) }; },
        async run() {
          const r = sqlite.prepare(sql).run(...this._args);
          return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } };
        },
      };
    },
  },
};

const tgCalls = [];
let anthropicQueue = [];
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  const body = JSON.parse(opts.body);
  if (u.includes("api.anthropic.com")) {
    const content = anthropicQueue.shift() || [{ type: "text", text: "[skip]" }];
    return { ok: true, async json() { return { stop_reason: "end_turn", content }; } };
  }
  tgCalls.push({ method: u.split("/").pop(), body });
  return { ok: true, async json() { return { ok: true, result: {} }; } };
};
const biz = (connId, fromId, chatId, text) => ({
  business_message: { business_connection_id: connId, from: { id: fromId }, chat: { id: chatId }, text },
});
let passed = 0;
const t = async (n, fn) => { await fn(); console.log("ok  " + n); passed++; };

await t("business_connection сохраняется", async () => {
  await handleUpdate(env, {
    business_connection: { id: "bc1", user: { id: 42 }, user_chat_id: 42, can_reply: true, is_enabled: true },
  });
  const p = await db.getProfile(env, 42);
  assert.equal(p.biz_conn_id, "bc1");
  assert.equal(p.biz_can_reply, 1);
  assert.ok(tgCalls.some((c) => c.method === "sendMessage" && c.body.chat_id === 42), "владельцу пришло уведомление");
});

await t("автоответ не идёт, пока /away выключен", async () => {
  tgCalls.length = 0;
  await handleUpdate(env, biz("bc1", 7, 7, "привет"));
  assert.ok(!tgCalls.some((c) => c.method === "sendMessage"), "ничего не отправлено");
  // но сообщение сохранено как контекст
  const hist = await db.recentBizMessages(env, 42, 7, 10);
  assert.equal(hist.length, 1);
  assert.equal(hist[0].role, "them");
});

await t("/away on включает автоответ", async () => {
  await handleUpdate(env, { message: { from: { id: 42 }, chat: { id: 42 }, text: "/away on" } });
  assert.equal((await db.getProfile(env, 42)).away, 1);
});

await t("входящее -> ответ от лица владельца через business_connection_id", async () => {
  tgCalls.length = 0;
  anthropicQueue = [[{ type: "text", text: "давай ближе к делу спишемся" }]];
  await handleUpdate(env, biz("bc1", 7, 7, "во сколько завтра встречаемся?"));
  const sent = tgCalls.find((c) => c.method === "sendMessage");
  assert.ok(sent, "ответ отправлен");
  assert.equal(sent.body.business_connection_id, "bc1", "уходит от лица владельца");
  assert.equal(sent.body.chat_id, 7);
  assert.equal(sent.body.text, "давай ближе к делу спишемся");
  const hist = await db.recentBizMessages(env, 42, 7, 10);
  assert.equal(hist[hist.length - 1].role, "me");
});

await t("[skip] -> ничего не отправляем", async () => {
  tgCalls.length = 0;
  anthropicQueue = [[{ type: "text", text: "[skip]" }]];
  await handleUpdate(env, biz("bc1", 7, 7, "ахах +"));
  assert.ok(!tgCalls.some((c) => c.method === "sendMessage"), "на реакцию не отвечаем");
});

await t("своё сообщение владельца -> не отвечаем, но помним", async () => {
  tgCalls.length = 0;
  await handleUpdate(env, biz("bc1", 42, 7, "ок, буду в 6"));
  assert.ok(!tgCalls.some((c) => c.method === "sendMessage"));
  const hist = await db.recentBizMessages(env, 42, 7, 10);
  assert.equal(hist[hist.length - 1].content, "ок, буду в 6");
  assert.equal(hist[hist.length - 1].role, "me");
});

await t("чужой business_connection_id игнорируется", async () => {
  tgCalls.length = 0;
  anthropicQueue = [[{ type: "text", text: "не должно уйти" }]];
  await handleUpdate(env, biz("OTHER", 9, 9, "эй"));
  assert.ok(!tgCalls.some((c) => c.method === "sendMessage"));
});

await t("/away off выключает", async () => {
  tgCalls.length = 0;
  await handleUpdate(env, { message: { from: { id: 42 }, chat: { id: 42 }, text: "/away off" } });
  assert.equal((await db.getProfile(env, 42)).away, 0);
  anthropicQueue = [[{ type: "text", text: "не уйдёт" }]];
  await handleUpdate(env, biz("bc1", 7, 7, "ещё вопрос"));
  assert.ok(!tgCalls.some((c) => c.method === "sendMessage" && c.body.business_connection_id));
});

console.log(`\n${passed} passed`);
