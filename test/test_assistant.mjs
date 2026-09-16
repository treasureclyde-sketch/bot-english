// Проверка цикла tool-use в assistant.js с ЗАМОКАННЫМ Anthropic API (без сети/трат).
// Запуск: node --experimental-sqlite test/test_assistant.mjs

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import * as db from "../src/db.js";
import { handleUserText } from "../src/assistant.js";

const TZ = "Asia/Yekaterinburg";
const sqlite = new DatabaseSync(":memory:");
sqlite.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));

const env = {
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

// Мок Anthropic: первый ответ — tool_use add_task, второй — финальный текст.
// Также проверяем, что мы корректно шлём назад tool_result.
let calls = 0;
let sawToolResult = false;
globalThis.fetch = async (url, opts) => {
  assert.ok(String(url).includes("api.anthropic.com"));
  const body = JSON.parse(opts.body);
  const last = body.messages[body.messages.length - 1];
  if (last.role === "user" && Array.isArray(last.content) &&
      last.content.some((b) => b.type === "tool_result")) {
    sawToolResult = true;
  }
  calls++;
  if (calls === 1) {
    return jsonResp({
      stop_reason: "tool_use",
      content: [
        { type: "text", text: "Записываю." },
        { type: "tool_use", id: "tu_1", name: "add_task",
          input: { title: "физика §12", subject: "физика", due: "2026-09-25" } },
      ],
    });
  }
  return jsonResp({
    stop_reason: "end_turn",
    content: [{ type: "text", text: "Готово, задача по физике на 25.09 записана." }],
  });
};

function jsonResp(obj) {
  return { ok: true, async json() { return obj; } };
}

await db.ensureUser(env, 42, 100);
const reply = await handleUserText(env, 42, TZ, "задали физику 12 параграф к 25 сентября");

assert.equal(calls, 2, "должно быть 2 обращения к модели (tool_use -> финал)");
assert.ok(sawToolResult, "во втором запросе должен быть tool_result");
assert.ok(reply.includes("физик"), "финальный текст пробрасывается пользователю");

const tasks = await db.listTasks(env, 42, "open");
assert.equal(tasks.length, 1, "задача реально создана инструментом");
assert.equal(tasks[0].title, "физика §12");
assert.ok(tasks[0].due_at, "срок распарсен");

// История: user + assistant финальный текст (без tool-ходов).
const hist = await db.recentMessages(env, 42, 12);
assert.equal(hist.length, 2);
assert.equal(hist[0].role, "user");
assert.equal(hist[1].role, "assistant");

console.log("ok  assistant tool-loop (mocked API)");
console.log("\n1 passed");
