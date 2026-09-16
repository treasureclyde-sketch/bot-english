// Оффлайн-проверка чистой логики времени (без сети, D1 и Telegram).
// Запуск: node test/test_logic.mjs

import assert from "node:assert";
import { wallToUtc, localInfo, parseLocal, nextRecurring, fmtLocal, validTz } from "../src/time.js";

const TZ = "Asia/Yekaterinburg"; // UTC+5
let passed = 0;
const t = (name, fn) => { fn(); console.log("ok  " + name); passed++; };

t("wallToUtc UTC+5", () => {
  const ms = wallToUtc(2026, 9, 20, 8, 0, TZ);
  const d = new Date(ms);
  assert.equal(d.getUTCHours(), 3); // 08:00 local == 03:00 UTC
  assert.equal(d.getUTCDate(), 20);
});

t("localInfo parts", () => {
  const ms = Date.UTC(2026, 8, 16, 3, 0); // 2026-09-16 08:00 local (среда)
  const i = localInfo(ms, TZ);
  assert.equal(i.hh, 8);
  assert.equal(i.dateStr, "2026-09-16");
  assert.equal(i.weekday, 2); // среда
});

t("parseLocal date-only uses default hour", () => {
  const ms = parseLocal("2026-09-20", TZ, 9);
  assert.equal(localInfo(ms, TZ).timeStr, "09:00");
});

t("parseLocal with time", () => {
  const ms = parseLocal("2026-09-20T18:30", TZ);
  const i = localInfo(ms, TZ);
  assert.equal(i.timeStr, "18:30");
  assert.equal(i.dateStr, "2026-09-20");
});

t("parseLocal with space separator", () => {
  const ms = parseLocal("2026-09-20 07:05", TZ);
  assert.equal(localInfo(ms, TZ).timeStr, "07:05");
});

t("parseLocal bad -> null", () => {
  assert.equal(parseLocal("завтра", TZ), null);
  assert.equal(parseLocal("", TZ), null);
});

t("nextRecurring daily is in future at right time", () => {
  const from = wallToUtc(2026, 9, 16, 12, 0, TZ); // полдень
  const next = nextRecurring({ cadence: "daily", hour: 8, minute: 0 }, TZ, from);
  assert.ok(next > from);
  const i = localInfo(next, TZ);
  assert.equal(i.timeStr, "08:00");
  assert.equal(i.dateStr, "2026-09-17"); // 08:00 сегодня прошло -> завтра
});

t("nextRecurring daily same day if time ahead", () => {
  const from = wallToUtc(2026, 9, 16, 6, 0, TZ); // 06:00, а напоминание в 08:00
  const next = nextRecurring({ cadence: "daily", hour: 8, minute: 0 }, TZ, from);
  assert.equal(localInfo(next, TZ).dateStr, "2026-09-16");
});

t("nextRecurring weekly lands on weekday", () => {
  const from = wallToUtc(2026, 9, 16, 12, 0, TZ); // среда
  const next = nextRecurring({ cadence: "weekly", weekday: 4, hour: 9, minute: 0 }, TZ, from); // пятница
  assert.equal(localInfo(next, TZ).weekday, 4);
});

t("every_n_days steps forward", () => {
  const from = wallToUtc(2026, 9, 16, 12, 0, TZ);
  const next = nextRecurring({ cadence: "every_n_days", n_days: 3, hour: 10, minute: 0 }, TZ, from);
  assert.equal(localInfo(next, TZ).dateStr, "2026-09-19"); // 10:00 сегодня прошло -> +3 дня
});

t("fmtLocal + validTz", () => {
  assert.equal(fmtLocal(null, TZ), "—");
  assert.ok(validTz("Asia/Yekaterinburg"));
  assert.ok(!validTz("Nowhere/Void"));
});

console.log(`\n${passed} passed`);
