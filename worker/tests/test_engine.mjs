// Интеграционный тест: engine + db + stats против настоящего SQLite
// через шим D1-API. Запуск: node --experimental-sqlite tests/test_engine.mjs
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { runTick } from "../src/engine.js";
import * as db from "../src/db.js";
import * as sched from "../src/scheduling.js";
import * as stats from "../src/stats.js";
import { TRACK_6MIN, TRACK_CSCA } from "../src/config.js";

// --- Шим D1 поверх node:sqlite --------------------------------------------
function makeD1(sqlite) {
  return {
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
    async batch(stmts) { for (const s of stmts) await s.run(); return []; },
  };
}

const sqlite = new DatabaseSync(":memory:");
sqlite.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));

// Fake Telegram: перехватываем sendMessage через глобальный fetch.
const sent = [];
globalThis.fetch = async (urlStr, init) => {
  const body = JSON.parse(init.body);
  if (String(urlStr).includes("/sendMessage")) sent.push(body);
  return { json: async () => ({ ok: true, result: { message_id: sent.length } }) };
};

const env = { DB: makeD1(sqlite), BOT_TOKEN: "x", OWNER_ID: "1" };
const TZ = "Asia/Yekaterinburg";
let passed = 0;
const done = (n) => { console.log("ok  " + n); passed++; };

// Регистрация создаёт профиль и 3 трека
await db.ensureUser(env, 1, 100);
assert.equal((await db.getTracks(env, 1)).length, 3);
done("ensureUser creates profile + tracks");

// Все треки due сейчас -> за тик уходит ровно одно (приоритет), это 6min
const past = Date.now() - 60000;
for (const tr of await db.getTracks(env, 1)) await db.setNextFire(env, 1, tr.track_id, past);
await runTick(env);
assert.equal(sent.length, 1, "ровно одно сообщение за тик");
assert.ok(sent[0].text.includes("6 Minute English"), "6min идёт первым");
assert.ok(sent[0].text.includes("Why we hate open offices"));
done("one reminder per tick, 6min first");

// История записана как 'sent'
let hist = await db.allHistory(env, 1);
assert.equal(hist.length, 1);
assert.equal(hist[0].track_id, TRACK_6MIN);
assert.equal(hist[0].status, "sent");
done("history recorded as sent");

// Отметили done -> стрик 1
await db.setHistoryStatus(env, hist[0].id, "done");
assert.equal(await stats.computeStreak(env, 1, TZ), 1);
done("streak after done = 1");

// Следующий тик -> уходит CSCA (6min next_fire ушёл в будущее)
await runTick(env);
assert.equal(sent.length, 2);
assert.ok(sent[1].text.includes("CSCA Math"));
done("second tick sends CSCA");

// Правило пропусков: 2 skipped подряд -> вопрос вместо напоминания
const s2 = new DatabaseSync(":memory:");
s2.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
const env2 = { DB: makeD1(s2), BOT_TOKEN: "x", OWNER_ID: "1" };
await db.ensureUser(env2, 1, 100);
sent.length = 0;
// оставим только CSCA
for (const tr of await db.getTracks(env2, 1)) {
  if (tr.track_id !== TRACK_CSCA) { await db.updateTrack(env2, 1, tr.track_id, { enabled: 0 }); await db.setNextFire(env2, 1, tr.track_id, null); }
}
for (let i = 0; i < 2; i++) {
  const hid = await db.addHistory(env2, 1, TRACK_CSCA, "2026-08-20", "t", "r", "sent");
  await db.setHistoryStatus(env2, hid, "skipped");
}
await db.setNextFire(env2, 1, TRACK_CSCA, Date.now() - 60000);
await runTick(env2);
assert.ok(sent.length === 1 && /что случилось/i.test(sent[0].text), "вопрос после 2 пропусков");
done("skip-streak asks what happened");

console.log(`\n${passed} passed`);
