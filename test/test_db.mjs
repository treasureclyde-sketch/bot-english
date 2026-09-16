// Интеграционный тест db.js + tools.js на реальном SQLite (node:sqlite),
// с D1-совместимым шимом. Запуск: node --experimental-sqlite test/test_db.mjs

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import * as db from "../src/db.js";
import { executeTool } from "../src/tools.js";
import { localInfo } from "../src/time.js";

const TZ = "Asia/Yekaterinburg";
const sqlite = new DatabaseSync(":memory:");
sqlite.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));

// Минимальный шим под интерфейс D1 (prepare().bind().first()/all()/run()).
const env = {
  DB: {
    prepare(sql) {
      return {
        _args: [],
        bind(...args) { this._args = args; return this; },
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

let passed = 0;
const t = async (name, fn) => { await fn(); console.log("ok  " + name); passed++; };

const UID = 42;

await t("ensureUser creates then updates", async () => {
  assert.equal(await db.ensureUser(env, UID, 100), true);
  assert.equal(await db.ensureUser(env, UID, 100), false);
  const p = await db.getProfile(env, UID);
  assert.equal(p.tz, TZ);
});

await t("add_note + search_notes", async () => {
  await executeTool(env, UID, TZ, "add_note", { text: "пароль вайфай 1234", tags: "дом" });
  const out = await executeTool(env, UID, TZ, "search_notes", { query: "вайфай" });
  assert.ok(out.includes("1234"));
});

await t("add_task with due + list + complete", async () => {
  const r = await executeTool(env, UID, TZ, "add_task", { title: "физика §12", subject: "физика", due: "2026-09-20" });
  assert.ok(r.startsWith("OK"));
  const id = Number(r.match(/#(\d+)/)[1]);
  let list = await executeTool(env, UID, TZ, "list_tasks", {});
  assert.ok(list.includes("физика §12"));
  const done = await executeTool(env, UID, TZ, "complete_task", { id });
  assert.ok(done.startsWith("OK"));
  list = await executeTool(env, UID, TZ, "list_tasks", { status: "open" });
  assert.ok(!list.includes("физика §12"));
});

await t("complete unknown task fails gracefully", async () => {
  const out = await executeTool(env, UID, TZ, "complete_task", { id: 9999 });
  assert.ok(out.includes("не найдена"));
});

await t("add once reminder in future", async () => {
  const future = localInfo(Date.now() + 3 * 86400000, TZ).dateStr + "T09:00";
  const out = await executeTool(env, UID, TZ, "add_reminder", { text: "оплатить интернет", at: future });
  assert.ok(out.startsWith("OK"), out);
  const rems = await db.listReminders(env, UID);
  assert.equal(rems.length, 1);
  assert.equal(rems[0].kind, "once");
});

await t("past reminder rejected", async () => {
  const out = await executeTool(env, UID, TZ, "add_reminder", { text: "давно", at: "2020-01-01T09:00" });
  assert.ok(out.includes("прошло"));
});

await t("recurring reminder + cancel", async () => {
  const out = await executeTool(env, UID, TZ, "add_reminder", {
    text: "английский", recurrence: { cadence: "daily", time: "20:00" },
  });
  const id = Number(out.match(/#(\d+)/)[1]);
  const rems = await db.listReminders(env, UID);
  const rec = rems.find((r) => r.id === id);
  assert.equal(rec.kind, "recurring");
  assert.ok(rec.next_fire_at > Date.now());
  const cancel = await executeTool(env, UID, TZ, "cancel_reminder", { id });
  assert.ok(cancel.startsWith("OK"));
  assert.ok(!(await db.listReminders(env, UID)).some((r) => r.id === id));
});

await t("dueReminders picks past-due only", async () => {
  // всё будущее — ничего не должно сработать прямо сейчас
  const due = await db.dueReminders(env, UID, Date.now());
  assert.equal(due.length, 0);
});

await t("message memory roundtrip + trim", async () => {
  for (let i = 0; i < 50; i++) await db.addMessage(env, UID, i % 2 ? "assistant" : "user", "m" + i);
  await db.trimMessages(env, UID, 40);
  const recent = await db.recentMessages(env, UID, 12);
  assert.equal(recent.length, 12);
  assert.equal(recent[recent.length - 1].content, "m49");
});

console.log(`\n${passed} passed`);
