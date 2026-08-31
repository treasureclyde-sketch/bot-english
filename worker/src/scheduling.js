// Слой 2: логика напоминаний (чистые функции).
// Времена — UNIX-ms. Таймзоны считаем через Intl (в Workers есть ICU),
// поэтому работает для любого пояса, включая переходы на летнее время.

import { QUIET_WEEKDAY, TRACK_ORDER } from "./config.js";

const WD_MAP = { Sun: 6, Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5 };

// Смещение пояса (в минутах) в конкретный момент: local = utc + offset.
function tzOffsetMinutes(ms, tz) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = {};
  for (const part of dtf.formatToParts(new Date(ms))) p[part.type] = part.value;
  let hour = p.hour === "24" ? 0 : +p.hour;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, hour, +p.minute, +p.second);
  return Math.round((asUTC - ms) / 60000);
}

// Локальные «настенные часы» Y-M-D H:M в поясе -> UNIX-ms.
export function zonedWallToUtc(y, m, d, hh, mm, tz) {
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  let off = tzOffsetMinutes(guess, tz);
  let utc = guess - off * 60000;
  const off2 = tzOffsetMinutes(utc, tz);
  if (off2 !== off) utc = guess - off2 * 60000; // коррекция на границе DST
  return utc;
}

// Разбор момента в локальные компоненты пояса.
export function localInfo(ms, tz) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false, weekday: "short",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
  const p = {};
  for (const part of dtf.formatToParts(new Date(ms))) p[part.type] = part.value;
  const hh = p.hour === "24" ? 0 : +p.hour;
  return {
    y: +p.year, m: +p.month, d: +p.day, hh, mm: +p.minute,
    weekday: WD_MAP[p.weekday],
    dateStr: `${p.year}-${p.month}-${p.day}`,
  };
}

// Прибавить дни к «настенной» дате (без учёта времени), вернуть Y-M-D и weekday.
function wallAddDays(y, m, d, days) {
  const nd = new Date(Date.UTC(y, m - 1, d) + days * 86400000);
  return {
    y: nd.getUTCFullYear(), m: nd.getUTCMonth() + 1, d: nd.getUTCDate(),
    wd: (nd.getUTCDay() + 6) % 7, // 0=Пн ... 6=Вс
  };
}

// Первое срабатывание трека, считая от `now` (ms).
export function computeFirstFire(track, tz, now) {
  now = now ?? Date.now();
  const info = localInfo(now, tz);
  const H = track.hour, M = track.minute;

  if (track.cadence === "weekly") {
    let daysAhead = ((track.weekday - info.weekday) % 7 + 7) % 7;
    let c = wallAddDays(info.y, info.m, info.d, daysAhead);
    let utc = zonedWallToUtc(c.y, c.m, c.d, H, M, tz);
    if (daysAhead === 0 && utc <= now) {
      c = wallAddDays(info.y, info.m, info.d, 7);
      utc = zonedWallToUtc(c.y, c.m, c.d, H, M, tz);
    }
    return utc;
  }

  // daily / every_n_days
  let c = { y: info.y, m: info.m, d: info.d, wd: info.weekday };
  let utc = zonedWallToUtc(c.y, c.m, c.d, H, M, tz);
  if (utc <= now) {
    c = wallAddDays(c.y, c.m, c.d, 1);
    utc = zonedWallToUtc(c.y, c.m, c.d, H, M, tz);
  }
  if (c.wd === QUIET_WEEKDAY) {
    c = wallAddDays(c.y, c.m, c.d, 1);
    utc = zonedWallToUtc(c.y, c.m, c.d, H, M, tz);
  }
  return utc;
}

// Следующее срабатывание после того, как трек уже сработал в fromMs.
export function computeNextFire(track, tz, fromMs) {
  const info = localInfo(fromMs, tz);
  const H = track.hour, M = track.minute;

  if (track.cadence === "weekly") {
    const c = wallAddDays(info.y, info.m, info.d, 7);
    return zonedWallToUtc(c.y, c.m, c.d, H, M, tz);
  }
  const step = track.cadence === "daily" ? 1 : Math.max(1, track.n_days);
  let c = wallAddDays(info.y, info.m, info.d, step);
  if (c.wd === QUIET_WEEKDAY) c = wallAddDays(c.y, c.m, c.d, 1);
  return zonedWallToUtc(c.y, c.m, c.d, H, M, tz);
}

// Перенос напоминания. kind: "2h" | "tomorrow". Возвращает ms.
export function postpone(kind, tz, now) {
  now = now ?? Date.now();
  if (kind === "2h") return now + 2 * 3600000;
  if (kind === "tomorrow") {
    let t = now + 86400000;
    if (localInfo(t, tz).weekday === QUIET_WEEKDAY) t += 86400000;
    return t;
  }
  return now;
}

export function isQuietDay(ms, tz) {
  return localInfo(ms, tz).weekday === QUIET_WEEKDAY;
}

export function orderTracks(ids) {
  return [...ids].sort((a, b) => {
    const ia = TRACK_ORDER.indexOf(a), ib = TRACK_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}
