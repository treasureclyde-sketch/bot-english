// Оффлайн-проверка чистой логики Worker'а (без Cloudflare/Telegram).
// Запуск: node tests/test_logic.mjs

import assert from "node:assert";
import * as sched from "../src/scheduling.js";
import { sixMinTask, cscaTask, egeTask, CSCA_PROGRAM } from "../src/content.js";
import { DEFAULT_TRACKS, TRACK_6MIN, TRACK_EGE, QUIET_WEEKDAY } from "../src/config.js";

const TZ = "Asia/Yekaterinburg"; // UTC+5
let passed = 0;
const t = (name, fn) => { fn(); console.log("ok  " + name); passed++; };

// zonedWallToUtc: 2026-08-31 08:00 в UTC+5 == 03:00 UTC
t("zonedWallToUtc UTC+5", () => {
  const ms = sched.zonedWallToUtc(2026, 8, 31, 8, 0, TZ);
  const d = new Date(ms);
  assert.equal(d.getUTCHours(), 3);
  assert.equal(d.getUTCDate(), 31);
});

// localInfo раскладывает момент в локальные части
t("localInfo weekday+parts", () => {
  const ms = Date.UTC(2026, 7, 31, 3, 0); // 2026-08-31 08:00 local (Пн)
  const i = sched.localInfo(ms, TZ);
  assert.equal(i.hh, 8);
  assert.equal(i.dateStr, "2026-08-31");
  assert.equal(i.weekday, 0); // понедельник
});

// Правило воскресенья: daily-трек не попадает на воскресенье
t("daily skips Sunday", () => {
  const track = { ...DEFAULT_TRACKS[TRACK_6MIN] };
  // Суббота 2026-08-29 09:00 локально -> следующее (вс) должно перескочить на пн
  const satMs = sched.zonedWallToUtc(2026, 8, 29, 9, 0, TZ);
  const next = sched.computeNextFire(track, TZ, satMs);
  assert.notEqual(sched.localInfo(next, TZ).weekday, QUIET_WEEKDAY);
  assert.equal(sched.localInfo(next, TZ).weekday, 0); // понедельник
});

// computeFirstFire в будущем и в нужный час
t("first fire in future at hour", () => {
  const track = { ...DEFAULT_TRACKS[TRACK_6MIN] }; // 08:00
  const now = sched.zonedWallToUtc(2026, 8, 31, 10, 0, TZ); // Пн 10:00 > 08:00
  const first = sched.computeFirstFire(track, TZ, now);
  assert.ok(first > now);
  assert.equal(sched.localInfo(first, TZ).hh, 8);
});

// weekly приходит в назначенный день недели (суббота)
t("weekly lands on Saturday", () => {
  const track = { ...DEFAULT_TRACKS[TRACK_EGE] }; // weekday=5 (сб)
  const now = sched.zonedWallToUtc(2026, 8, 31, 10, 0, TZ); // понедельник
  const first = sched.computeFirstFire(track, TZ, now);
  assert.equal(sched.localInfo(first, TZ).weekday, 5);
});

// Перенос +2ч и на завтра
t("postpone 2h / tomorrow", () => {
  const now = sched.zonedWallToUtc(2026, 8, 31, 8, 0, TZ);
  assert.equal(sched.localInfo(sched.postpone("2h", TZ, now), TZ).hh, 10);
  const tom = sched.postpone("tomorrow", TZ, now);
  assert.notEqual(sched.localInfo(tom, TZ).weekday, QUIET_WEEKDAY);
});

// isQuietDay распознаёт воскресенье
t("isQuietDay Sunday", () => {
  const sun = sched.zonedWallToUtc(2026, 8, 30, 12, 0, TZ); // 2026-08-30 воскресенье
  assert.equal(sched.isQuietDay(sun, TZ), true);
  const mon = sched.zonedWallToUtc(2026, 8, 31, 12, 0, TZ);
  assert.equal(sched.isQuietDay(mon, TZ), false);
});

// Контент прогрессирует и не выходит за границы
t("content progression", () => {
  assert.notEqual(sixMinTask(0).title, sixMinTask(1).title);
  assert.equal(cscaTask(0).block, 1);
  assert.equal(cscaTask(CSCA_PROGRAM.length + 5).link, "https://csca.app"); // повтор mock
  assert.equal(egeTask(0).minutes, 120);
});

// orderTracks соблюдает приоритет 6min -> csca -> ege
t("orderTracks priority", () => {
  const o = sched.orderTracks(["ege_test", "csca_math", "6min_english"]);
  assert.deepEqual(o, ["6min_english", "csca_math", "ege_test"]);
});

console.log(`\n${passed} passed`);
