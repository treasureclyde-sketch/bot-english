// Работа со временем в часовом поясе пользователя через Intl (в Workers есть ICU).
// Все моменты — UNIX-ms.

const WD = { Sun: 6, Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5 }; // 0=Пн..6=Вс

function tzOffsetMinutes(ms, tz) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = {};
  for (const part of dtf.formatToParts(new Date(ms))) p[part.type] = part.value;
  const hour = p.hour === "24" ? 0 : +p.hour;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, hour, +p.minute, +p.second);
  return Math.round((asUTC - ms) / 60000);
}

// Локальные «настенные часы» -> UNIX-ms (с коррекцией на границе DST).
export function wallToUtc(y, m, d, hh, mm, tz) {
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  const off = tzOffsetMinutes(guess, tz);
  let utc = guess - off * 60000;
  const off2 = tzOffsetMinutes(utc, tz);
  if (off2 !== off) utc = guess - off2 * 60000;
  return utc;
}

// Разбор момента в локальные компоненты.
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
    weekday: WD[p.weekday],
    dateStr: `${p.year}-${p.month}-${p.day}`,
    timeStr: `${String(hh).padStart(2, "0")}:${p.minute}`,
  };
}

// Человекочитаемая дата-время в поясе, напр. "16.09 21:00".
export function fmtLocal(ms, tz) {
  if (ms == null) return "—";
  const i = localInfo(ms, tz);
  return `${String(i.d).padStart(2, "0")}.${String(i.m).padStart(2, "0")} ` +
    `${String(i.hh).padStart(2, "0")}:${String(i.mm).padStart(2, "0")}`;
}

// Разобрать локальную строку "YYYY-MM-DD" или "YYYY-MM-DDTHH:MM" (или с пробелом) в ms.
// Если времени нет — берём defaultHour:00. Возвращает ms или null.
export function parseLocal(str, tz, defaultHour = 9) {
  if (!str || typeof str !== "string") return null;
  const m = str.trim().match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/
  );
  if (!m) return null;
  const [, y, mo, d, hh, mm] = m;
  return wallToUtc(+y, +mo, +d, hh != null ? +hh : defaultHour, mm != null ? +mm : 0, tz);
}

// Прибавить дни к настенной дате, вернуть {y,m,d,wd}.
function wallAddDays(y, m, d, days) {
  const nd = new Date(Date.UTC(y, m - 1, d) + days * 86400000);
  return {
    y: nd.getUTCFullYear(), m: nd.getUTCMonth() + 1, d: nd.getUTCDate(),
    wd: (nd.getUTCDay() + 6) % 7,
  };
}

// Следующее срабатывание повторяющегося напоминания после fromMs.
// rec: {cadence:'daily'|'every_n_days'|'weekly', n_days, weekday, hour, minute}
export function nextRecurring(rec, tz, fromMs) {
  const info = localInfo(fromMs, tz);
  const H = rec.hour ?? 9, M = rec.minute ?? 0;
  if (rec.cadence === "weekly") {
    let ahead = (((rec.weekday ?? 0) - info.weekday) % 7 + 7) % 7;
    let c = wallAddDays(info.y, info.m, info.d, ahead);
    let utc = wallToUtc(c.y, c.m, c.d, H, M, tz);
    if (utc <= fromMs) { c = wallAddDays(c.y, c.m, c.d, 7); utc = wallToUtc(c.y, c.m, c.d, H, M, tz); }
    return utc;
  }
  const step = rec.cadence === "every_n_days" ? Math.max(1, rec.n_days || 1) : 1;
  // Сегодня в нужный час, если ещё впереди; иначе шагаем.
  let utc = wallToUtc(info.y, info.m, info.d, H, M, tz);
  if (utc <= fromMs) {
    const c = wallAddDays(info.y, info.m, info.d, step);
    utc = wallToUtc(c.y, c.m, c.d, H, M, tz);
  }
  return utc;
}

export function validTz(tz) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; }
  catch { return false; }
}
