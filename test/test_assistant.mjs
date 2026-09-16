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
const bodies = [];
globalThis.fetch = async (url, opts) => {
  assert.ok(String(url).includes("api.anthropic.com"));
  const body = JSON.parse(opts.body);
  bodies.push(body);
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

// Оптимизации: кэш-брейкпоинт на стабильном блоке + thinking отключён.
const b0 = bodies[0];
assert.ok(Array.isArray(b0.system), "system — массив блоков");
assert.equal(b0.system[0].cache_control.type, "ephemeral", "кэш на стабильном блоке");
assert.ok(!b0.system[1].cache_control, "изменчивый блок без кэша");
assert.equal(b0.thinking.type, "disabled", "thinking отключён");
// Стабильный префикс байт-в-байт одинаков в обоих вызовах (иначе кэш промахнётся).
assert.equal(bodies[0].system[0].text, bodies[1].system[0].text, "стабильный блок идентичен");
assert.deepEqual(bodies[0].tools, bodies[1].tools, "каталог инструментов идентичен");

console.log("ok  assistant tool-loop (mocked API)");
console.log("ok  caching breakpoint + thinking disabled in request");
console.log("\n2 passed");
