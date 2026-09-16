// Проверка инлайн-кнопки «✅ Выполнено»: нажатие -> задача закрыта -> сообщение
// перерисовано. Telegram замокан. Запуск: node --experimental-sqlite test/test_callback.mjs

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import * as db from "../src/db.js";
import { handleUpdate } from "../src/handlers.js";

const sqlite = new DatabaseSync(":memory:");
sqlite.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));

const env = {
  OWNER_ID: "42",
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
globalThis.fetch = async (url, opts) => {
  const method = String(url).split("/").pop();
  tgCalls.push({ method, body: JSON.parse(opts.body) });
  return { ok: true, async json() { return { ok: true, result: {} }; } };
};

// Заводим две задачи владельцу.
await db.ensureUser(env, 42, 100);
await db.addTask(env, 42, "физика §12", "физика", null);
await db.addTask(env, 42, "алгебра", null, null);

// Нажатие кнопки done:1
await handleUpdate(env, {
  callback_query: {
    id: "cb1",
    from: { id: 42 },
    message: { chat: { id: 100 }, message_id: 555 },
    data: "done:1",
  },
});

// Задача #1 закрыта, #2 открыта.
assert.equal((await db.getTask(env, 42, 1)).status, "done");
assert.equal((await db.getTask(env, 42, 2)).status, "open");

// Был ответ на callback и перерисовка сообщения.
assert.ok(tgCalls.some((c) => c.method === "answerCallbackQuery"), "answerCallbackQuery вызван");
const edit = tgCalls.find((c) => c.method === "editMessageText");
assert.ok(edit, "editMessageText вызван");
assert.ok(edit.body.text.includes("алгебра"), "в списке осталась открытая задача");
assert.ok(!edit.body.text.includes("физика §12"), "закрытая задача убрана из списка");
assert.equal(edit.body.reply_markup.inline_keyboard.length, 1, "осталась одна кнопка");

// Чужой пользователь — отказ, задача не трогается.
tgCalls.length = 0;
await db.addTask(env, 42, "секрет", null, null);
await handleUpdate(env, {
  callback_query: { id: "cb2", from: { id: 999 }, message: { chat: { id: 100 }, message_id: 1 }, data: "done:2" },
});
assert.equal((await db.getTask(env, 42, 2)).status, "open", "чужой не может закрыть задачу");

console.log("ok  inline done-button flow");
console.log("\n1 passed");
