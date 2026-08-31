// АВТОСБОРКА: не редактируй тут — правь src/*.js и пересобирай (node build-bundle.mjs).
// Learning Bot для Cloudflare Workers — единый файл для веб-редактора.


// ===== config.js =====
// Дефолты профиля и треков. Всё, что можно менять кнопками, живёт в D1;
// здесь — только значения по умолчанию для первого запуска.

const DEFAULT_TZ = "Asia/Yekaterinburg"; // UTC+5, как Уфа

const TRACK_6MIN = "6min_english";
const TRACK_EGE = "ege_test";
const TRACK_CSCA = "csca_math";

// Порядок приоритета в течение дня.
const TRACK_ORDER = [TRACK_6MIN, TRACK_CSCA, TRACK_EGE];

const TRACK_TITLES = {
  [TRACK_6MIN]: "6 Minute English",
  [TRACK_EGE]: "Пробник ЕГЭ",
  [TRACK_CSCA]: "CSCA Math",
};

// cadence: "daily" | "every_n_days" | "weekly"
// weekday: 0=Пн ... 6=Вс (только weekly)
const DEFAULT_TRACKS = {
  [TRACK_6MIN]: { enabled: 1, cadence: "daily", n_days: 1, weekday: null, hour: 8, minute: 0, duration_min: 10 },
  [TRACK_CSCA]: { enabled: 1, cadence: "every_n_days", n_days: 2, weekday: null, hour: 19, minute: 0, duration_min: 40 },
  [TRACK_EGE]: { enabled: 1, cadence: "weekly", n_days: 7, weekday: 5, hour: 10, minute: 0, duration_min: 120 },
};

// Правило воскресенья: в этот день напоминаний нет (кроме недельного отчёта).
const QUIET_WEEKDAY = 6; // воскресенье

const WEEKLY_REPORT_WEEKDAY = 6;
const WEEKLY_REPORT_HOUR = 20;

const MONTHLY_REPORT_DAY = 1;
const MONTHLY_REPORT_HOUR = 9;

const SKIP_STREAK_THRESHOLD = 2;
const UNDERPERFORM_RATIO = 0.5;

// ===== content.js =====
// Библиотека контента (слой 3). Программа CSCA собрана из учебника
// самоподготовки: словарь -> Functions (48%) -> Geometry (40%) -> добор -> mocks.



const SIX_MIN_EPISODES = [
  ["Why we hate open offices", "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2019/ep-190411"],
  ["Is the customer always right?", "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2020/ep-200206"],
  ["Does your age affect your opinions?", "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2021/ep-210401"],
  ["The benefits of boredom", "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2019/ep-190606"],
  ["How to make decisions", "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2020/ep-201029"],
  ["The power of introverts", "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2019/ep-190822"],
  ["Why do we cry?", "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2021/ep-210617"],
  ["The problem with plastic", "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2018/ep-181129"],
  ["Learning a language later in life", "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2020/ep-200827"],
  ["The secrets of a good sleep", "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2019/ep-191219"],
  ["Can we trust our memories?", "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2021/ep-210909"],
  ["How to be a better listener", "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2020/ep-200723"],
];

const CSCA_APP = "https://csca.app";

const CSCA_PROGRAM = [
  ["Разведка: placement-тест", "Пройди placement-тест на csca.app — понять текущий уровень. Незнакомые слова выписывай в отдельный файл.", 45],
  ["Словарь: General + Functions", "Разделы словаря General terms и Functions. Не зубрить — прочитать вдумчиво, потом 10 задач на csca.app и сверяться.", 40],
  ["Словарь: тригонометрия + последовательности", "Разделы Trigonometry и Sequences. Прочитай, затем 10 смешанных задач.", 40],
  ["Functions: область определения (domain)", "Модуль Functions — домен логарифмических и дробных функций. 12-15 задач на csca.app, фильтр Functions.", 45],
  ["Functions: чётность и монотонность", "Parity (even/odd) и монотонность на интервалах — стандартные вопросы теста. 12-15 задач.", 40],
  ["Functions: значения тригонометрии", "sin/cos/tan стандартных углов, единичная окружность. Формулы sin²+cos²=1, sin(2θ)=2sinθcosθ — на память. 15 задач.", 45],
  ["Functions: прогрессии", "Арифм. aₙ=a₁+(n−1)d, Sₙ=n(a₁+aₙ)/2; геом. aₙ=a₁·qⁿ⁻¹. 15 задач на общий член и сумму.", 45],
  ["Functions: смешанный блок", "Полный прогон модуля Functions вперемешку — 20 задач. Ошибки в mistake log.", 50],
  ["Geometry: прямая и расстояние", "Уравнение прямой y−y₀=k(x−x₀), slope, расстояние d=√((x₂−x₁)²+(y₂−y₁)²). 15 задач.", 45],
  ["Geometry: окружность и касательная", "(x−a)²+(y−b)²=r², касательная к окружности. 15 задач, фильтр Geometry.", 45],
  ["Geometry: эллипс и гипербола", "x²/a²+y²/b²=1, фокусы, e=c/a; гипербола и асимптоты y=±(b/a)x. 15 задач.", 50],
  ["Geometry: векторы", "Скалярное произведение →a·→b=a₁b₁+a₂b₂, угол между векторами. 12 задач.", 40],
  ["Geometry: комплексные числа", "z=a+bi, модуль |z|=√(a²+b²), сопряжённое. 12 задач.", 40],
  ["Geometry: смешанный блок", "Полный прогон модуля Geometry & Algebra — 20 задач. Redo ошибок с нуля.", 50],
  ["Добор: множества и неравенства", "A∪B, A∩B, дополнение; квадратичные неравенства (вне/между корнями). Дешёвые баллы. 12 задач.", 35],
  ["Добор: вероятность и статистика", "P(A)=благоприятные/все, P(A∪B)=P(A)+P(B)−P(A∩B), среднее и дисперсия. 12 задач.", 35],
  ["Mistake log: разбор ошибок", "Открой свой mistake log, перерешай каждую ошибку с нуля, без подсказок. Пока не выйдет сам.", 40],
  ["Timed mock: половина теста", "24 вопроса за 30 минут по таймеру — тренируем скорость (1 мин 15 сек/вопрос). Потом разбор.", 45],
  ["Timed mock: полный экзамен", "Полный mock: 48 вопросов, 60 минут, таймер. После — разбор всех ошибок, redo с нуля.", 75],
];

const CSCA_RESOURCES = [
  ["csca.app", "https://csca.app", "758 задач, интерактивные пробники, бесплатно"],
  ["crosslineedu.com", "https://crosslineedu.com", "разборы программы, free mock exams"],
  ["cucas.cn/csca", "https://www.cucas.cn/csca", "документы, программа, отзывы"],
];

const EGE_VARIANTS = [
  ["Профильный вариант (случайный)", "https://ege.sdamgia.ru/test?a=catgen"],
  ["Досрочный вариант ФИПИ", "https://mathb-ege.sdamgia.ru/"],
  ["Вариант из открытого банка ФИПИ", "https://fipi.ru/ege/otkrytyy-bank-zadaniy-ege"],
];

function sixMinTask(index) {
  const ep = SIX_MIN_EPISODES[index % SIX_MIN_EPISODES.length];
  return { number: 142 + index, title: ep[0], link: ep[1], minutes: 10 };
}

function cscaTask(index) {
  let title, task, minutes, block;
  if (index < CSCA_PROGRAM.length) {
    [title, task, minutes] = CSCA_PROGRAM[index];
    block = index + 1;
  } else {
    [title, task, minutes] = CSCA_PROGRAM[CSCA_PROGRAM.length - 1];
    block = CSCA_PROGRAM.length + (index - CSCA_PROGRAM.length + 1);
  }
  return { block, title, task, link: CSCA_APP, minutes };
}

function egeTask(index) {
  const v = EGE_VARIANTS[index % EGE_VARIANTS.length];
  return { title: v[0], link: v[1], minutes: 120 };
}

// ===== scheduling.js =====
// Слой 2: логика напоминаний (чистые функции).
// Времена — UNIX-ms. Таймзоны считаем через Intl (в Workers есть ICU),
// поэтому работает для любого пояса, включая переходы на летнее время.



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
function zonedWallToUtc(y, m, d, hh, mm, tz) {
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  let off = tzOffsetMinutes(guess, tz);
  let utc = guess - off * 60000;
  const off2 = tzOffsetMinutes(utc, tz);
  if (off2 !== off) utc = guess - off2 * 60000; // коррекция на границе DST
  return utc;
}

// Разбор момента в локальные компоненты пояса.
function localInfo(ms, tz) {
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
function computeFirstFire(track, tz, now) {
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
function computeNextFire(track, tz, fromMs) {
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
function postpone(kind, tz, now) {
  now = now ?? Date.now();
  if (kind === "2h") return now + 2 * 3600000;
  if (kind === "tomorrow") {
    let t = now + 86400000;
    if (localInfo(t, tz).weekday === QUIET_WEEKDAY) t += 86400000;
    return t;
  }
  return now;
}

function isQuietDay(ms, tz) {
  return localInfo(ms, tz).weekday === QUIET_WEEKDAY;
}

function orderTracks(ids) {
  return [...ids].sort((a, b) => {
    const ia = TRACK_ORDER.indexOf(a), ib = TRACK_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

// ===== telegram.js =====
// Тонкая обёртка над Telegram Bot API.

function api(env, method) {
  return `https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`;
}

async function call(env, method, payload) {
  const res = await fetch(api(env, method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) console.log(`tg ${method} failed:`, JSON.stringify(data));
  return data;
}

function sendMessage(env, chatId, text, opts = {}) {
  return call(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: opts.disablePreview ?? false,
    reply_markup: opts.replyMarkup,
  });
}

function editMessageText(env, chatId, messageId, text, opts = {}) {
  return call(env, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: opts.disablePreview ?? true,
    reply_markup: opts.replyMarkup,
  });
}

function editMessageReplyMarkup(env, chatId, messageId, replyMarkup) {
  return call(env, "editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: replyMarkup ?? { inline_keyboard: [] },
  });
}

function answerCallbackQuery(env, id, text) {
  return call(env, "answerCallbackQuery", { callback_query_id: id, text });
}

function setMyCommands(env, commands) {
  return call(env, "setMyCommands", { commands });
}

function setWebhook(env, url, secretToken) {
  return call(env, "setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query"],
  });
}

// ===== reminders.js =====
// Слой 3: сборка текста напоминания и клавиатур.




function buildReminder(trackId, contentIndex) {
  if (trackId === TRACK_6MIN) {
    const t = sixMinTask(contentIndex);
    const text = `🎧 *6 Minute English #${t.number}*\n«${t.title}»\n\nПослушать + разобрать словарь. ~${t.minutes} мин.`;
    return { text, link: t.link, title: t.title };
  }
  if (trackId === TRACK_CSCA) {
    const t = cscaTask(contentIndex);
    const text = `📐 *CSCA Math · блок ${t.block}*\n*${t.title}*\n\n${t.task}\n\n~${t.minutes} мин.`;
    return { text, link: t.link, title: t.title };
  }
  if (trackId === TRACK_EGE) {
    const t = egeTask(contentIndex);
    const text = `🧮 *Пробник ЕГЭ (профиль)*\n${t.title}\n\nПолный вариант по таймеру, ~${t.minutes} мин. После — разбор ошибок.`;
    return { text, link: t.link, title: t.title };
  }
  return { text: "Напоминание", link: "", title: "task" };
}

function actionKeyboard(hid, link, label = "Открыть") {
  return {
    inline_keyboard: [
      [{ text: `🔗 ${label}`, url: link }],
      [
        { text: "✅ Готово", callback_data: `done:${hid}` },
        { text: "🕑 Позже", callback_data: `later:${hid}` },
        { text: "⏭ Пропустить", callback_data: `skip:${hid}` },
      ],
    ],
  };
}

function laterKeyboard(hid) {
  return {
    inline_keyboard: [
      [
        { text: "+2 часа", callback_data: `post2h:${hid}` },
        { text: "Завтра", callback_data: `posttom:${hid}` },
      ],
      [{ text: "« назад", callback_data: `back:${hid}` }],
    ],
  };
}

function buildSkipQuestion(trackId, hid) {
  const title = TRACK_TITLES[trackId];
  const text = `🤔 *${title}* не идёт уже 2 раза подряд.\nЧто случилось?`;
  const kb = {
    inline_keyboard: [
      [{ text: "😮‍💨 Тяжело", callback_data: `why:${hid}:hard` }],
      [{ text: "⏳ Нет времени", callback_data: `why:${hid}:notime` }],
      [{ text: "😐 Надоел формат", callback_data: `why:${hid}:bored` }],
    ],
  };
  return { text, kb };
}

function whyResponse(trackId, reason) {
  const title = TRACK_TITLES[trackId];
  if (reason === "hard")
    return `Понял. Сделаем *${title}* легче: бери половину задания и просто отметь «Готово». Полдела — уже дело. Завтра пришлю как обычно.`;
  if (reason === "notime")
    return `Ок, времени нет. Могу сдвинуть *${title}* на другое время или сделать реже. Напиши /tracks — там поменяем расписание за 10 секунд.`;
  if (reason === "bored")
    return `Формат приелся — нормально. По *${title}* переключу на следующий блок программы, будет другое. Дам передышку на пару дней.`;
  return "Принял.";
}

// ===== stats.js =====
// Слой 4: статистика — стрик, недельный и месячный отчёты.





function localDate(ms, tz) {
  return localInfo(ms, tz).dateStr;
}

// Прибавить дни к строке даты YYYY-MM-DD.
function addDaysStr(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const nd = new Date(Date.UTC(y, m - 1, d) + days * 86400000);
  const p = (n) => String(n).padStart(2, "0");
  return `${nd.getUTCFullYear()}-${p(nd.getUTCMonth() + 1)}-${p(nd.getUTCDate())}`;
}

async function computeStreak(env, userId, tz) {
  const rows = await allHistory(env, userId);
  const doneDays = new Set();
  for (const r of rows) if (r.status === "done") doneDays.add(localDate(r.sent_at, tz));
  if (!doneDays.size) return 0;

  const today = localInfo(Date.now(), tz).dateStr;
  let cursor;
  if (doneDays.has(today)) cursor = today;
  else if (doneDays.has(addDaysStr(today, -1))) cursor = addDaysStr(today, -1);
  else return 0;

  let streak = 0;
  while (doneDays.has(cursor)) {
    streak += 1;
    cursor = addDaysStr(cursor, -1);
  }
  return streak;
}

function count(rows, trackId, status) {
  return rows.filter((r) => r.track_id === trackId && r.status === status).length;
}
function sent(rows, trackId) {
  return rows.filter((r) => r.track_id === trackId).length;
}

async function weeklyReport(env, userId, tz) {
  const now = Date.now();
  const rows = await historyBetween(env, userId, now - 7 * 86400000, now);
  const streak = await computeStreak(env, userId, tz);

  const lines = ["📊 *Недельный отчёт*", ""];
  for (const tid of TRACK_ORDER) {
    const track = await getTrack(env, userId, tid);
    if (!track || !track.enabled) continue;
    const done = count(rows, tid, "done");
    const planned = sent(rows, tid);
    const title = TRACK_TITLES[tid];
    if (tid === TRACK_EGE) {
      lines.push(`• *${title}*: ${done ? "✅ сделал" : "— не сделал"}`);
    } else {
      lines.push(`• *${title}*: сделано ${done} из ${planned || "—"}`);
    }
  }
  lines.push("");
  lines.push(`${streak ? "🔥" : "•"} Стрик: *${streak}* дн. подряд`);
  if (!streak) lines.push("_Один день — и стрик снова живой. Начни сегодня._");
  return lines.join("\n");
}

async function monthlyReport(env, userId, tz) {
  const now = Date.now();
  const rows = await historyBetween(env, userId, now - 30 * 86400000, now);

  const body = [];
  let totalDone = 0, totalPlanned = 0;
  let worst = null; // {ratio, tid}
  for (const tid of TRACK_ORDER) {
    const track = await getTrack(env, userId, tid);
    if (!track || !track.enabled) continue;
    const done = count(rows, tid, "done");
    const planned = sent(rows, tid);
    totalDone += done;
    totalPlanned += planned;
    const ratio = planned ? done / planned : null;
    const pct = ratio === null ? "нет данных" : `${Math.round(ratio * 100)}%`;
    body.push(`• *${TRACK_TITLES[tid]}*: ${done}/${planned || "—"} (${pct})`);
    if (ratio !== null && planned >= 3 && (!worst || ratio < worst.ratio)) {
      worst = { ratio, tid };
    }
  }
  const overall = totalPlanned ? totalDone / totalPlanned : 0;

  const lines = ["🗓 *Месячный отчёт*", "",
    `Общий процент выполнения: *${Math.round(overall * 100)}%*`, "", ...body];

  let suggestion = null;
  if (worst && worst.ratio < UNDERPERFORM_RATIO) {
    const track = await getTrack(env, userId, worst.tid);
    const title = TRACK_TITLES[worst.tid];
    lines.push("");
    if (track.cadence === "every_n_days") {
      const newN = track.n_days + 2;
      lines.push(`⚠️ *${title}* проседает (${Math.round(worst.ratio * 100)}%). Может, реже — раз в ${newN} дня вместо ${track.n_days}? Так проще держать ритм.`);
      suggestion = { tid: worst.tid, newN };
    } else {
      lines.push(`⚠️ *${title}* проседает (${Math.round(worst.ratio * 100)}%). Стоит вернуться к нему или пересмотреть формат.`);
    }
  }
  return { text: lines.join("\n"), suggestion };
}

// ===== db.js =====
// Слой 1: доступ к D1. Каждая функция принимает env (в env.DB — база).



async function ensureUser(env, userId, chatId) {
  const existing = await env.DB.prepare("SELECT user_id FROM profile WHERE user_id=?")
    .bind(userId).first();
  if (existing) {
    await env.DB.prepare("UPDATE profile SET chat_id=? WHERE user_id=?")
      .bind(chatId, userId).run();
    return false;
  }
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO profile (user_id, chat_id, tz, active, paused_until, created_at) VALUES (?,?,?,?,?,?)"
  ).bind(userId, chatId, DEFAULT_TZ, 1, null, now).run();

  const stmts = [];
  for (const [tid, c] of Object.entries(DEFAULT_TRACKS)) {
    stmts.push(env.DB.prepare(
      "INSERT INTO tracks (user_id, track_id, enabled, cadence, n_days, weekday, hour, minute, duration_min, next_fire_at, content_index) VALUES (?,?,?,?,?,?,?,?,?,?,0)"
    ).bind(userId, tid, c.enabled, c.cadence, c.n_days, c.weekday, c.hour, c.minute, c.duration_min, null));
  }
  await env.DB.batch(stmts);
  return true;
}

async function getProfile(env, userId) {
  return env.DB.prepare("SELECT * FROM profile WHERE user_id=?").bind(userId).first();
}

async function allUsers(env) {
  const r = await env.DB.prepare("SELECT * FROM profile").all();
  return r.results || [];
}

async function setActive(env, userId, active, pausedUntil) {
  await env.DB.prepare("UPDATE profile SET active=?, paused_until=? WHERE user_id=?")
    .bind(active, pausedUntil ?? null, userId).run();
}

async function setTz(env, userId, tz) {
  await env.DB.prepare("UPDATE profile SET tz=? WHERE user_id=?").bind(tz, userId).run();
}

async function getTracks(env, userId) {
  const r = await env.DB.prepare("SELECT * FROM tracks WHERE user_id=?").bind(userId).all();
  return r.results || [];
}

async function getTrack(env, userId, trackId) {
  return env.DB.prepare("SELECT * FROM tracks WHERE user_id=? AND track_id=?")
    .bind(userId, trackId).first();
}

async function updateTrack(env, userId, trackId, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const setSql = keys.map((k) => `${k}=?`).join(", ");
  const vals = keys.map((k) => fields[k]);
  await env.DB.prepare(`UPDATE tracks SET ${setSql} WHERE user_id=? AND track_id=?`)
    .bind(...vals, userId, trackId).run();
}

async function setNextFire(env, userId, trackId, ms) {
  await env.DB.prepare("UPDATE tracks SET next_fire_at=? WHERE user_id=? AND track_id=?")
    .bind(ms ?? null, userId, trackId).run();
}

async function bumpContentIndex(env, userId, trackId) {
  await env.DB.prepare("UPDATE tracks SET content_index=content_index+1 WHERE user_id=? AND track_id=?")
    .bind(userId, trackId).run();
}

async function addHistory(env, userId, trackId, scheduledDate, title, ref, status) {
  const r = await env.DB.prepare(
    "INSERT INTO history (user_id, track_id, scheduled_date, sent_at, content_title, content_ref, status) VALUES (?,?,?,?,?,?,?)"
  ).bind(userId, trackId, scheduledDate, Date.now(), title, ref, status).run();
  return r.meta.last_row_id;
}

async function getHistory(env, hid) {
  return env.DB.prepare("SELECT * FROM history WHERE id=?").bind(hid).first();
}

async function setHistoryStatus(env, hid, status, feedback) {
  await env.DB.prepare(
    "UPDATE history SET status=?, acted_at=?, feedback=COALESCE(?, feedback) WHERE id=?"
  ).bind(status, Date.now(), feedback ?? null, hid).run();
}

async function pendingToday(env, userId, trackId, scheduledDate) {
  return env.DB.prepare(
    "SELECT * FROM history WHERE user_id=? AND track_id=? AND scheduled_date=? ORDER BY id DESC LIMIT 1"
  ).bind(userId, trackId, scheduledDate).first();
}

async function lastTerminal(env, userId, trackId, limit) {
  const r = await env.DB.prepare(
    "SELECT * FROM history WHERE user_id=? AND track_id=? AND status IN ('done','skipped') ORDER BY id DESC LIMIT ?"
  ).bind(userId, trackId, limit).all();
  return r.results || [];
}

async function historyBetween(env, userId, startMs, endMs) {
  const r = await env.DB.prepare(
    "SELECT * FROM history WHERE user_id=? AND sent_at>=? AND sent_at<? ORDER BY id"
  ).bind(userId, startMs, endMs).all();
  return r.results || [];
}

async function allHistory(env, userId) {
  const r = await env.DB.prepare("SELECT * FROM history WHERE user_id=? ORDER BY id")
    .bind(userId).all();
  return r.results || [];
}

async function getMeta(env, userId, key, def = null) {
  const row = await env.DB.prepare("SELECT value FROM meta WHERE user_id=? AND key=?")
    .bind(userId, key).first();
  return row ? row.value : def;
}

async function setMeta(env, userId, key, value) {
  await env.DB.prepare(
    "INSERT INTO meta (user_id, key, value) VALUES (?,?,?) ON CONFLICT(user_id, key) DO UPDATE SET value=excluded.value"
  ).bind(userId, key, String(value)).run();
}

// ===== engine.js =====
// Движок: scheduled() дёргает runTick раз в минуту. Идемпотентен —
// состояние в D1, повторный тик ничего не задваивает.








async function runTick(env) {
  const users = await allUsers(env);
  for (const user of users) {
    try {
      await processUser(env, user);
    } catch (e) {
      console.log(`tick user ${user.user_id} error: ${e && e.stack || e}`);
    }
  }
}

async function resumeIfPauseOver(env, user) {
  if (user.active) return true;
  if (user.paused_until && Date.now() >= user.paused_until) {
    await setActive(env, user.user_id, 1, null);
    return true;
  }
  return false;
}

async function processUser(env, user) {
  const uid = user.user_id;
  const tz = user.tz;
  const now = Date.now();

  const active = await resumeIfPauseOver(env, user);
  if (!active) return;

  await maybeReports(env, user, now);

  if (isQuietDay(now, tz)) return; // воскресенье — тишина

  const tracks = await getTracks(env, uid);
  const due = [];
  for (const track of tracks) {
    if (!track.enabled) continue;
    if (track.next_fire_at == null) {
      await setNextFire(env, uid, track.track_id, computeFirstFire(track, tz, now));
      continue;
    }
    if (now >= track.next_fire_at) due.push(track);
  }
  if (!due.length) return;

  due.sort((a, b) => {
    const ia = TRACK_ORDER.indexOf(a.track_id), ib = TRACK_ORDER.indexOf(b.track_id);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  // Не больше одного за тик — «не оба разом».
  await sendReminder(env, user, due[0], now);
}

async function sendReminder(env, user, track, now) {
  const uid = user.user_id;
  const tid = track.track_id;
  const tz = user.tz;
  const dateStr = localInfo(now, tz).dateStr;

  const existing = await pendingToday(env, uid, tid, dateStr);
  if (existing) {
    await setNextFire(env, uid, tid, computeNextFire(track, tz, now));
    return;
  }

  const last = await lastTerminal(env, uid, tid, SKIP_STREAK_THRESHOLD);
  const skipStreak = last.length >= SKIP_STREAK_THRESHOLD
    && last.every((r) => r.status === "skipped");

  if (skipStreak) {
    const hid = await addHistory(env, uid, tid, dateStr, "[вопрос: что случилось]", "", "sent");
    const { text, kb } = buildSkipQuestion(tid, hid);
    await sendMessage(env, user.chat_id, text, { replyMarkup: kb });
  } else {
    const { text, link, title } = buildReminder(tid, track.content_index);
    const hid = await addHistory(env, uid, tid, dateStr, title, link, "sent");
    await sendMessage(env, user.chat_id, text, { replyMarkup: actionKeyboard(hid, link) });
    await bumpContentIndex(env, uid, tid);
  }

  await setNextFire(env, uid, tid, computeNextFire(track, tz, now));
}

async function maybeReports(env, user, now) {
  const uid = user.user_id;
  const tz = user.tz;
  const info = localInfo(now, tz);

  if (info.weekday === WEEKLY_REPORT_WEEKDAY && info.hh >= WEEKLY_REPORT_HOUR) {
    const tag = isoWeekTag(info);
    if ((await getMeta(env, uid, "last_weekly")) !== tag) {
      const text = await weeklyReport(env, uid, tz);
      await sendMessage(env, user.chat_id, text);
      await setMeta(env, uid, "last_weekly", tag);
    }
  }

  if (info.d === MONTHLY_REPORT_DAY && info.hh >= MONTHLY_REPORT_HOUR) {
    const tag = `${info.y}-${String(info.m).padStart(2, "0")}`;
    if ((await getMeta(env, uid, "last_monthly")) !== tag) {
      const { text, suggestion } = await monthlyReport(env, uid, tz);
      let replyMarkup;
      if (suggestion) {
        replyMarkup = {
          inline_keyboard: [[
            { text: `✅ Да, реже (раз в ${suggestion.newN} дн.)`, callback_data: `adapt:${suggestion.tid}:${suggestion.newN}` },
            { text: "Оставить", callback_data: "adapt:none:0" },
          ]],
        };
      }
      await sendMessage(env, user.chat_id, text, { replyMarkup });
      await setMeta(env, uid, "last_monthly", tag);
    }
  }
}

// Тег ISO-недели (год + номер недели) для дедупликации недельного отчёта.
function isoWeekTag(info) {
  const d = new Date(Date.UTC(info.y, info.m - 1, info.d));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(
    ((d - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7
  );
  return `${d.getUTCFullYear()}-W${week}`;
}

// ===== handlers.js =====
// Обработка входящих Telegram-апдейтов (команды и нажатия кнопок).
// Доступ только у владельца (env.OWNER_ID).









function authorized(env, userId) {
  const owner = Number(env.OWNER_ID || 0);
  return !owner || userId === owner;
}

// Проверка корректности пояса через попытку форматирования.
function validTz(tz) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

async function handleUpdate(env, update) {
  if (update.message) return handleMessage(env, update.message);
  if (update.callback_query) return handleCallback(env, update.callback_query);
}

// --- команды ---------------------------------------------------------------
async function handleMessage(env, msg) {
  const from = msg.from;
  const text = (msg.text || "").trim();
  if (!from || !text.startsWith("/")) return;
  if (!authorized(env, from.id)) {
    await sendMessage(env, msg.chat.id, "Это личный бот. Доступа нет.");
    return;
  }

  const [cmdRaw, ...args] = text.split(/\s+/);
  const cmd = cmdRaw.split("@")[0].toLowerCase();
  const uid = from.id;
  const chatId = msg.chat.id;

  switch (cmd) {
    case "/start": return cmdStart(env, uid, chatId);
    case "/help": return cmdHelp(env, chatId);
    case "/status": return cmdStatus(env, uid, chatId);
    case "/tracks": return cmdTracks(env, uid, chatId);
    case "/pause": return cmdPause(env, uid, chatId, args);
    case "/resume": return cmdResume(env, uid, chatId);
    case "/tz": return cmdTz(env, uid, chatId, args);
    case "/report": return cmdReport(env, uid, chatId);
    case "/csca": return cmdCsca(env, chatId);
    default: return sendMessage(env, chatId, "Не знаю такую команду. /help");
  }
}

async function initFires(env, uid, tz) {
  for (const track of await getTracks(env, uid)) {
    if (track.next_fire_at == null && track.enabled) {
      await setNextFire(env, uid, track.track_id, computeFirstFire(track, tz));
    }
  }
}

async function cmdStart(env, uid, chatId) {
  const isNew = await ensureUser(env, uid, chatId);
  const prof = await getProfile(env, uid);
  await initFires(env, uid, prof.tz);
  const hello = isNew ? "Привет! " : "С возвращением! ";
  const text = `${hello}Я держу твой ритм по трём трекам:\n\n` +
    "🎧 *6 Minute English* — каждый день, 10 мин\n" +
    "📐 *CSCA Math* — раз в 2 дня, ~40 мин\n" +
    "🧮 *Пробник ЕГЭ* — раз в неделю, ~2 ч\n\n" +
    "Воскресенье — выходной, напоминаний нет.\n\n" +
    "Команды: /status /tracks /pause /report /csca /help";
  await sendMessage(env, chatId, text);
}

function cmdHelp(env, chatId) {
  return sendMessage(env, chatId,
    "*Команды*\n" +
    "/status — план на сегодня и стрик\n" +
    "/tracks — треки: вкл/выкл и расписание\n" +
    "/pause N — пауза на N дней (по умолчанию 1)\n" +
    "/resume — снять паузу\n" +
    "/tz Asia/Yekaterinburg — часовой пояс\n" +
    "/report — недельный отчёт сейчас\n" +
    "/csca — ресурсы по математике\n\n" +
    "В каждом напоминании: [🔗 ссылка] [✅ Готово] [🕑 Позже] [⏭ Пропустить].");
}

async function cmdStatus(env, uid, chatId) {
  const prof = await getProfile(env, uid);
  if (!prof) return sendMessage(env, chatId, "Напиши /start сначала.");
  const tz = prof.tz;
  const now = Date.now();
  const info = localInfo(now, tz);
  const streak = await computeStreak(env, uid, tz);

  const lines = [`📍 *Сегодня* (${info.dateStr}, ${tz})`, ""];
  if (!prof.active) {
    const when = prof.paused_until ? localInfo(prof.paused_until, tz).dateStr : "?";
    lines.push(`⏸ На паузе до ${when}. /resume чтобы включить.`);
    return sendMessage(env, chatId, lines.join("\n"));
  }
  if (isQuietDay(now, tz)) lines.push("🌙 Воскресенье — выходной. Напоминаний не будет.");

  const tracks = await getTracks(env, uid);
  const byId = Object.fromEntries(tracks.map((t) => [t.track_id, t]));
  for (const tid of orderTracks(tracks.map((t) => t.track_id))) {
    const tr = byId[tid];
    if (!tr.enabled) continue;
    const title = TRACK_TITLES[tid];
    if (tr.next_fire_at) {
      const i = localInfo(tr.next_fire_at, tz);
      lines.push(`• ${title}: → ${i.dateStr} ${String(i.hh).padStart(2, "0")}:${String(i.mm).padStart(2, "0")}`);
    } else {
      lines.push(`• ${title}: не запланирован`);
    }
  }
  lines.push("");
  lines.push(`${streak ? "🔥" : "•"} Стрик: *${streak}* дн.`);
  await sendMessage(env, chatId, lines.join("\n"));
}

function cadenceHuman(track) {
  let base;
  if (track.cadence === "daily") base = "каждый день";
  else if (track.cadence === "weekly") {
    const wd = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][track.weekday];
    base = `раз в неделю (${wd})`;
  } else base = `раз в ${track.n_days} дн.`;
  return `${base}, ${String(track.hour).padStart(2, "0")}:${String(track.minute).padStart(2, "0")}`;
}

async function tracksKeyboard(env, uid) {
  const rows = [];
  for (const tid of TRACK_ORDER) {
    const tr = await getTrack(env, uid, tid);
    if (!tr) continue;
    const mark = tr.enabled ? "🟢" : "⚪️";
    rows.push([{ text: `${mark} ${TRACK_TITLES[tid]} — ${cadenceHuman(tr)}`, callback_data: `noop:${tid}` }]);
    rows.push([
      { text: tr.enabled ? "Выключить" : "Включить", callback_data: `toggle:${tid}` },
      { text: "−1 ч", callback_data: `hour:${tid}:-1` },
      { text: "+1 ч", callback_data: `hour:${tid}:1` },
    ]);
  }
  return { inline_keyboard: rows };
}

async function cmdTracks(env, uid, chatId) {
  if (!(await getProfile(env, uid))) return sendMessage(env, chatId, "Напиши /start сначала.");
  await sendMessage(env, chatId, "*Треки*", { replyMarkup: await tracksKeyboard(env, uid) });
}

async function cmdPause(env, uid, chatId, args) {
  let days = 1;
  if (args[0] && /^\d+$/.test(args[0])) days = Math.max(1, parseInt(args[0], 10));
  const until = Date.now() + days * 86400000;
  await setActive(env, uid, 0, until);
  const prof = await getProfile(env, uid);
  const i = localInfo(until, prof.tz);
  await sendMessage(env, chatId,
    `⏸ Пауза на ${days} дн. — до ${i.dateStr} ${String(i.hh).padStart(2, "0")}:${String(i.mm).padStart(2, "0")}. Включу сам, или /resume раньше.`);
}

async function cmdResume(env, uid, chatId) {
  await setActive(env, uid, 1, null);
  const prof = await getProfile(env, uid);
  for (const track of await getTracks(env, uid)) {
    if (track.enabled) await setNextFire(env, uid, track.track_id, computeFirstFire(track, prof.tz));
  }
  await sendMessage(env, chatId, "▶️ Погнали. Напоминания снова включены.");
}

async function cmdTz(env, uid, chatId, args) {
  if (!args[0]) {
    const prof = await getProfile(env, uid);
    return sendMessage(env, chatId, `Часовой пояс: ${prof ? prof.tz : DEFAULT_TZ}\nСменить: /tz Asia/Yekaterinburg`);
  }
  const tz = args[0];
  if (!validTz(tz)) return sendMessage(env, chatId, "Не знаю такой пояс. Пример: /tz Asia/Yekaterinburg");
  await setTz(env, uid, tz);
  for (const track of await getTracks(env, uid)) {
    if (track.enabled) await setNextFire(env, uid, track.track_id, computeFirstFire(track, tz));
  }
  await sendMessage(env, chatId, `Ок, часовой пояс: ${tz}. Расписание пересчитал.`);
}

async function cmdReport(env, uid, chatId) {
  const prof = await getProfile(env, uid);
  if (!prof) return sendMessage(env, chatId, "Напиши /start сначала.");
  await sendMessage(env, chatId, await weeklyReport(env, uid, prof.tz));
}

function cmdCsca(env, chatId) {
  const lines = ["📐 *CSCA Math — ресурсы*", ""];
  for (const [name, url, note] of CSCA_RESOURCES) lines.push(`• [${name}](${url}) — ${note}`);
  lines.push("");
  lines.push("_Правило: сначала прогоняй пробники и лови слабые темы, потом добивай именно их._");
  return sendMessage(env, chatId, lines.join("\n"), { disablePreview: true });
}

// --- callbacks -------------------------------------------------------------
async function handleCallback(env, q) {
  const from = q.from;
  if (!authorized(env, from.id)) {
    await answerCallbackQuery(env, q.id, "Нет доступа");
    return;
  }
  const uid = from.id;
  const chatId = q.message.chat.id;
  const messageId = q.message.message_id;
  const baseText = q.message.text || "";
  const parts = (q.data || "").split(":");
  const action = parts[0];

  if (action === "noop") return answerCallbackQuery(env, q.id);

  if (action === "done" || action === "skip") {
    const hid = Number(parts[1]);
    const h = await getHistory(env, hid);
    if (!h) return answerCallbackQuery(env, q.id, "Уже неактуально");
    if (action === "done") {
      await setHistoryStatus(env, hid, "done");
      const prof = await getProfile(env, uid);
      const streak = await computeStreak(env, uid, prof.tz);
      await answerCallbackQuery(env, q.id, "Готово 🎯");
      await finalize(env, chatId, messageId, baseText, `\n\n✅ Готово. 🔥 Стрик: ${streak} дн.`);
    } else {
      await setHistoryStatus(env, hid, "skipped");
      await answerCallbackQuery(env, q.id, "Пропущено");
      await finalize(env, chatId, messageId, baseText, "\n\n⏭ Пропущено. Ничего, завтра новый заход.");
    }
    return;
  }

  if (action === "later") {
    const hid = Number(parts[1]);
    await answerCallbackQuery(env, q.id);
    return editMessageReplyMarkup(env, chatId, messageId, laterKeyboard(hid));
  }

  if (action === "back") {
    const hid = Number(parts[1]);
    const h = await getHistory(env, hid);
    await answerCallbackQuery(env, q.id);
    if (h) return editMessageReplyMarkup(env, chatId, messageId, actionKeyboard(hid, h.content_ref));
    return;
  }

  if (action === "post2h" || action === "posttom") {
    const hid = Number(parts[1]);
    const h = await getHistory(env, hid);
    if (!h) return answerCallbackQuery(env, q.id, "Уже неактуально");
    await setHistoryStatus(env, hid, "postponed");
    const prof = await getProfile(env, uid);
    const kind = action === "post2h" ? "2h" : "tomorrow";
    const newMs = postpone(kind, prof.tz, Date.now());
    await setNextFire(env, uid, h.track_id, newMs);
    const i = localInfo(newMs, prof.tz);
    await answerCallbackQuery(env, q.id, "Перенёс");
    await finalize(env, chatId, messageId, baseText,
      `\n\n🕑 Перенесено на ${i.dateStr} ${String(i.hh).padStart(2, "0")}:${String(i.mm).padStart(2, "0")}.`);
    return;
  }

  if (action === "why") {
    const hid = Number(parts[1]);
    const reason = parts[2];
    const h = await getHistory(env, hid);
    if (!h) return answerCallbackQuery(env, q.id, "Уже неактуально");
    await setHistoryStatus(env, hid, "skipped", reason);
    if (reason === "bored") {
      await bumpContentIndex(env, uid, h.track_id);
      const prof = await getProfile(env, uid);
      await setNextFire(env, uid, h.track_id, Date.now() + 2 * 86400000);
    }
    await answerCallbackQuery(env, q.id, "Принял");
    await finalize(env, chatId, messageId, baseText, "\n\n" + whyResponse(h.track_id, reason));
    return;
  }

  if (action === "toggle") {
    const tid = parts[1];
    const tr = await getTrack(env, uid, tid);
    const newState = tr.enabled ? 0 : 1;
    await updateTrack(env, uid, tid, { enabled: newState });
    const prof = await getProfile(env, uid);
    if (newState) {
      await setNextFire(env, uid, tid, computeFirstFire(await getTrack(env, uid, tid), prof.tz));
    } else {
      await setNextFire(env, uid, tid, null);
    }
    await answerCallbackQuery(env, q.id, "Ок");
    return editMessageReplyMarkup(env, chatId, messageId, await tracksKeyboard(env, uid));
  }

  if (action === "hour") {
    const tid = parts[1];
    const delta = parseInt(parts[2], 10);
    const tr = await getTrack(env, uid, tid);
    const newHour = ((tr.hour + delta) % 24 + 24) % 24;
    await updateTrack(env, uid, tid, { hour: newHour });
    const prof = await getProfile(env, uid);
    if (tr.enabled) await setNextFire(env, uid, tid, computeFirstFire(await getTrack(env, uid, tid), prof.tz));
    await answerCallbackQuery(env, q.id, `${String(newHour).padStart(2, "0")}:00`);
    return editMessageReplyMarkup(env, chatId, messageId, await tracksKeyboard(env, uid));
  }

  if (action === "adapt") {
    if (parts[1] === "none") {
      await answerCallbackQuery(env, q.id, "Оставил как есть");
      return finalize(env, chatId, messageId, baseText, "\n\nОк, расписание без изменений.");
    }
    const tid = parts[1];
    const newN = parseInt(parts[2], 10);
    await updateTrack(env, uid, tid, { n_days: newN });
    const prof = await getProfile(env, uid);
    await setNextFire(env, uid, tid, computeFirstFire(await getTrack(env, uid, tid), prof.tz));
    await answerCallbackQuery(env, q.id, "Сделал реже");
    return finalize(env, chatId, messageId, baseText, `\n\n✅ ${TRACK_TITLES[tid]}: теперь раз в ${newN} дн.`);
  }

  await answerCallbackQuery(env, q.id);
}

async function finalize(env, chatId, messageId, baseText, suffix) {
  const r = await editMessageText(env, chatId, messageId, baseText + suffix);
  if (!r.ok) await editMessageReplyMarkup(env, chatId, messageId, { inline_keyboard: [] });
}

// ===== index.js =====
// Точка входа Worker.
//   fetch()     — принимает webhook от Telegram (+ служебный /register)
//   scheduled() — крон раз в минуту, «сердце» напоминаний





const COMMANDS = [
  { command: "start", description: "запустить / приветствие" },
  { command: "status", description: "план на сегодня и стрик" },
  { command: "tracks", description: "треки: расписание и вкл/выкл" },
  { command: "pause", description: "пауза на N дней" },
  { command: "resume", description: "снять паузу" },
  { command: "report", description: "недельный отчёт" },
  { command: "tz", description: "часовой пояс" },
  { command: "csca", description: "ресурсы по математике" },
  { command: "help", description: "помощь" },
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Служебный роут: один раз дёрнуть в браузере, чтобы привязать webhook.
    //   https://<worker>.workers.dev/register?secret=<WEBHOOK_SECRET>
    if (url.pathname === "/register") {
      if (!env.WEBHOOK_SECRET || url.searchParams.get("secret") !== env.WEBHOOK_SECRET) {
        return new Response("forbidden", { status: 403 });
      }
      const hookUrl = `${url.origin}/webhook`;
      const wh = await setWebhook(env, hookUrl, env.WEBHOOK_SECRET);
      await setMyCommands(env, COMMANDS);
      return new Response(`setWebhook -> ${hookUrl}\n${JSON.stringify(wh)}`, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    // Webhook от Telegram.
    if (url.pathname === "/webhook" && request.method === "POST") {
      const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (!env.WEBHOOK_SECRET || secret !== env.WEBHOOK_SECRET) {
        return new Response("forbidden", { status: 403 });
      }
      let update;
      try {
        update = await request.json();
      } catch {
        return new Response("bad json", { status: 400 });
      }
      // Обрабатываем в фоне, Telegram сразу получает 200.
      ctx.waitUntil(handleUpdate(env, update).catch((e) =>
        console.log("handleUpdate error:", e && e.stack || e)));
      return new Response("ok");
    }

    if (url.pathname === "/") return new Response("learning-bot up");
    return new Response("not found", { status: 404 });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runTick(env).catch((e) =>
      console.log("runTick error:", e && e.stack || e)));
  },
};
