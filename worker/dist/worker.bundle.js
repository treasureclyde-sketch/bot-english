// АВТОСБОРКА: не редактируй тут — правь src/*.js и пересобирай (node build-bundle.mjs).
// Learning Bot для Cloudflare Workers — единый файл для веб-редактора.


// ===== config.js =====
// Дефолты профиля и треков. Всё, что можно менять кнопками, живёт в D1;
// здесь — только значения по умолчанию для первого запуска.

const DEFAULT_TZ = "Asia/Yekaterinburg"; // UTC+5, как Уфа

const TRACK_6MIN = "6min_english";
const TRACK_EGE = "ege_test";
const TRACK_CSCA = "csca_math";
const TRACK_DET = "duolingo_det";

// Порядок приоритета в течение дня.
const TRACK_ORDER = [TRACK_6MIN, TRACK_DET, TRACK_CSCA, TRACK_EGE];

const TRACK_TITLES = {
  [TRACK_6MIN]: "6 Minute English",
  [TRACK_EGE]: "Пробник ЕГЭ",
  [TRACK_CSCA]: "CSCA Math",
  [TRACK_DET]: "Duolingo Test",
};

// cadence: "daily" | "every_n_days" | "weekly"
// weekday: 0=Пн ... 6=Вс (только weekly)
// Кадентность: 6min — раз в 2 дня, Duolingo — раз в 2 дня, CSCA — раз в 3 дня,
// ЕГЭ — раз в неделю (суббота).
const DEFAULT_TRACKS = {
  [TRACK_6MIN]: { enabled: 1, cadence: "every_n_days", n_days: 2, weekday: null, hour: 8, minute: 0, duration_min: 10 },
  [TRACK_DET]: { enabled: 1, cadence: "every_n_days", n_days: 2, weekday: null, hour: 17, minute: 0, duration_min: 20 },
  [TRACK_CSCA]: { enabled: 1, cadence: "every_n_days", n_days: 3, weekday: null, hour: 19, minute: 0, duration_min: 45 },
  [TRACK_EGE]: { enabled: 1, cadence: "weekly", n_days: 7, weekday: 5, hour: 10, minute: 0, duration_min: 120 },
};

// Версия дефолтов треков. Меньшая версия у пользователя -> syncTracks один раз
// добавит новые треки и обновит кадентности.
const TRACKS_SCHEMA_VERSION = 2;

// Правило воскресенья: в этот день напоминаний нет (кроме недельного отчёта).
const QUIET_WEEKDAY = 6; // воскресенье

const WEEKLY_REPORT_WEEKDAY = 6;
const WEEKLY_REPORT_HOUR = 20;

const MONTHLY_REPORT_DAY = 1;
const MONTHLY_REPORT_HOUR = 9;

const SKIP_STREAK_THRESHOLD = 2;
const UNDERPERFORM_RATIO = 0.5;

// ===== content.js =====
// Библиотека контента (слой 3). АВТОГЕНЕРАЦИЯ из content.py — не правь
// вручную: меняй content.py и пересоздавай (parity с Python-версией).
// CSCA: подробный урок EN->RU + практика. DET: типы заданий Duolingo.



const CSCA_APP = "https://csca.app";
const DET_APP = "https://englishtest.duolingo.com";
const DET_PRACTICE = "https://englishtest.duolingo.com/prep";

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

const CSCA_LESSONS = [
  ["Functions: домен, область значений, чётность", "A function f maps every input x to exactly one output f(x). The DOMAIN is the set of x you are allowed to plug in; the RANGE is the set of outputs you get back. Two rules cover almost every CSCA question:\n  - a denominator can never be 0  ->  exclude those x;\n  - the argument of a square root or of log must be > 0  (for even roots, >= 0; for log, strictly > 0).\nExample: for f(x) = ln(x - 3) / sqrt(5 - x) you need x - 3 > 0 AND 5 - x > 0, so the domain is 3 < x < 5.\nPARITY: f is EVEN if f(-x) = f(x) (graph symmetric about the y-axis, e.g. x^2, cos x); f is ODD if f(-x) = -f(x) (symmetric about the origin, e.g. x^3, sin x). Most functions are neither.", "Функция f сопоставляет каждому входу x ровно один выход f(x). ОБЛАСТЬ ОПРЕДЕЛЕНИЯ (domain) — какие x вообще можно подставить; ОБЛАСТЬ ЗНАЧЕНИЙ (range) — какие выходы получаются. Два правила закрывают почти все вопросы CSCA:\n  - знаменатель не равен 0  ->  такие x выкидываем;\n  - под чётным корнем выражение >= 0, под логарифмом — строго > 0.\nПример: для f(x) = ln(x - 3) / sqrt(5 - x) нужно x - 3 > 0 И 5 - x > 0, значит домен: 3 < x < 5.\nЧЁТНОСТЬ: f чётная, если f(-x) = f(x) (график симметричен относительно оси y: x^2, cos x); нечётная, если f(-x) = -f(x) (симметрия относительно начала координат: x^3, sin x). Чаще всего — ни то, ни другое.", "Фильтр Functions на csca.app: 12-15 задач на домен и чётность. Ошибки — в mistake log.", 45],
  ["Тригонометрия: единичная окружность и тождества", "On the UNIT CIRCLE a point at angle θ has coordinates (cos θ, sin θ), and tan θ = sin θ / cos θ. Memorise the first quadrant exactly:\n  θ = 0, 30, 45, 60, 90 deg  ->  sin = 0, 1/2, sqrt2/2, sqrt3/2, 1.\nSigns by quadrant (ASTC / 'All Students Take Calculus'): Q1 all +, Q2 only sin +, Q3 only tan +, Q4 only cos +.\nCore identities you will reuse everywhere:\n  sin^2 θ + cos^2 θ = 1;\n  sin(2θ) = 2 sin θ cos θ;\n  cos(2θ) = cos^2 θ - sin^2 θ = 1 - 2 sin^2 θ;\n  sin(A ± B) = sin A cos B ± cos A sin B.\nTrick: if you know one ratio and the quadrant, use sin^2 + cos^2 = 1 to get the other, then pick the sign from the quadrant.", "На ЕДИНИЧНОЙ ОКРУЖНОСТИ точка под углом θ имеет координаты (cos θ, sin θ), а tan θ = sin θ / cos θ. Первую четверть знай наизусть:\n  θ = 0, 30, 45, 60, 90 град  ->  sin = 0, 1/2, sqrt2/2, sqrt3/2, 1.\nЗнаки по четвертям: I — всё +, II — только sin +, III — только tan +, IV — только cos +.\nТождества, которые нужны постоянно:\n  sin^2 θ + cos^2 θ = 1;\n  sin(2θ) = 2 sin θ cos θ;\n  cos(2θ) = cos^2 θ - sin^2 θ = 1 - 2 sin^2 θ;\n  sin(A ± B) = sin A cos B ± cos A sin B.\nПриём: знаешь одно отношение и четверть — через sin^2 + cos^2 = 1 находишь второе, а знак берёшь из четверти.", "csca.app, тема Trigonometry: 15 задач на значения и простые тождества. Формулы держи перед глазами, но старайся без подсказок.", 45],
  ["Последовательности и суммы (прогрессии)", "ARITHMETIC progression: each term adds a fixed d.\n  a_n = a_1 + (n - 1) d;   sum S_n = n (a_1 + a_n) / 2 = n/2 (2 a_1 + (n-1) d).\nGEOMETRIC progression: each term multiplies by a fixed ratio q.\n  a_n = a_1 * q^(n-1);   sum S_n = a_1 (q^n - 1) / (q - 1)  for q != 1.\nIf |q| < 1 the INFINITE sum converges: S = a_1 / (1 - q).\nTypical CSCA question: you are given two terms, say a_3 and a_7. Write both with the formula, divide (geometric) or subtract (arithmetic) to kill a_1, solve for q or d, then answer. Always check whether the sequence is arithmetic (constant difference) or geometric (constant ratio) before choosing the formula.", "АРИФМЕТИЧЕСКАЯ прогрессия: к каждому члену прибавляется постоянное d.\n  a_n = a_1 + (n - 1) d;   сумма S_n = n (a_1 + a_n) / 2 = n/2 (2 a_1 + (n-1) d).\nГЕОМЕТРИЧЕСКАЯ прогрессия: каждый член умножается на постоянное q.\n  a_n = a_1 * q^(n-1);   сумма S_n = a_1 (q^n - 1) / (q - 1)  при q != 1.\nЕсли |q| < 1, БЕСКОНЕЧНАЯ сумма сходится: S = a_1 / (1 - q).\nТипичный вопрос CSCA: даны два члена, например a_3 и a_7. Записываешь оба по формуле, делишь (геом.) или вычитаешь (арифм.), чтобы убрать a_1, находишь q или d — и отвечаешь. Сначала определи тип: постоянная разность (арифм.) или постоянное отношение (геом.).", "csca.app, тема Sequences: 15 задач на общий член и сумму. Отдельно потренируй задачи «даны два члена — найди прогрессию».", 45],
  ["Логарифмы и показательные", "A log answers 'to what power?': log_b(x) = y means b^y = x (with b > 0, b != 1, x > 0). The three laws do all the work:\n  log(xy) = log x + log y;\n  log(x/y) = log x - log y;\n  log(x^k) = k log x.\nChange of base: log_b(x) = ln x / ln b. Useful values: log_b(1) = 0, log_b(b) = 1.\nExponentials are the inverse: b^(m+n) = b^m * b^n, (b^m)^n = b^(mn), b^(-n) = 1 / b^n. To solve an exponential equation, take log of both sides; to solve a log equation, rewrite in exponential form and DON'T forget to check the domain (the argument must stay > 0).", "Логарифм отвечает на вопрос «в какую степень?»: log_b(x) = y значит b^y = x (при b > 0, b != 1, x > 0). Вся работа — в трёх законах:\n  log(xy) = log x + log y;\n  log(x/y) = log x - log y;\n  log(x^k) = k log x.\nСмена основания: log_b(x) = ln x / ln b. Полезно: log_b(1) = 0, log_b(b) = 1.\nПоказательные — обратные к логарифмам: b^(m+n) = b^m * b^n, (b^m)^n = b^(mn), b^(-n) = 1 / b^n. Показательное уравнение решают, логарифмируя обе части; логарифмическое — переписывая в показательный вид, и обязательно проверяют домен (аргумент должен остаться > 0).", "csca.app: 12-15 задач на свойства логарифмов и показательные уравнения. Особое внимание — проверке ОДЗ.", 40],
  ["Квадратичная функция и неравенства", "The parabola y = a x^2 + b x + c opens up if a > 0, down if a < 0. Its vertex is at x = -b / (2a). The DISCRIMINANT D = b^2 - 4 a c tells you the roots: D > 0 two real roots, D = 0 one (repeated), D < 0 none.\nRoots: x = (-b ± sqrt(D)) / (2a). Vieta: x_1 + x_2 = -b/a, x_1 * x_2 = c/a.\nQUADRATIC INEQUALITIES: find the roots, then read the sign of the parabola. For a > 0, a x^2 + b x + c > 0 holds OUTSIDE the roots (x < x_1 or x > x_2); it is < 0 BETWEEN the roots (x_1 < x < x_2). Sketching the parabola is faster and safer than memorising cases.", "Парабола y = a x^2 + b x + c ветвями вверх при a > 0 и вниз при a < 0. Вершина в x = -b / (2a). ДИСКРИМИНАНТ D = b^2 - 4 a c определяет корни: D > 0 — два корня, D = 0 — один (кратный), D < 0 — корней нет.\nКорни: x = (-b ± sqrt(D)) / (2a). Теорема Виета: x_1 + x_2 = -b/a, x_1 * x_2 = c/a.\nКВАДРАТНЫЕ НЕРАВЕНСТВА: находишь корни и смотришь знак параболы. При a > 0 выражение a x^2 + b x + c > 0 ВНЕ корней (x < x_1 или x > x_2), и < 0 МЕЖДУ корнями (x_1 < x < x_2). Быстрее и надёжнее нарисовать параболу, чем зубрить случаи.", "csca.app: 12 задач на корни, вершину и квадратные неравенства. Рисуй эскиз параболы для каждого неравенства.", 40],
  ["Аналитическая геометрия: прямая и расстояние", "Slope between two points: k = (y_2 - y_1) / (x_2 - x_1). Line through (x_0, y_0) with slope k: y - y_0 = k (x - x_0). General form: A x + B y + C = 0.\nParallel lines have EQUAL slopes; perpendicular lines have slopes whose product is -1 (k_1 * k_2 = -1).\nDistance between two points: d = sqrt((x_2 - x_1)^2 + (y_2 - y_1)^2).\nMidpoint: ((x_1 + x_2)/2, (y_1 + y_2)/2).\nDistance from a point (x_0, y_0) to line A x + B y + C = 0:\n  d = |A x_0 + B y_0 + C| / sqrt(A^2 + B^2).\nA very common CSCA task combines these: find the line, then the distance from a given point, or show two lines are perpendicular.", "Угловой коэффициент через две точки: k = (y_2 - y_1) / (x_2 - x_1). Прямая через (x_0, y_0) с наклоном k: y - y_0 = k (x - x_0). Общий вид: A x + B y + C = 0.\nУ параллельных прямых наклоны РАВНЫ; у перпендикулярных — произведение наклонов равно -1 (k_1 * k_2 = -1).\nРасстояние между точками: d = sqrt((x_2 - x_1)^2 + (y_2 - y_1)^2).\nСередина отрезка: ((x_1 + x_2)/2, (y_1 + y_2)/2).\nРасстояние от точки (x_0, y_0) до прямой A x + B y + C = 0:\n  d = |A x_0 + B y_0 + C| / sqrt(A^2 + B^2).\nЧастый вопрос CSCA собирает всё вместе: найти прямую, затем расстояние от точки, или доказать перпендикулярность.", "csca.app, фильтр Geometry: 15 задач на прямую, расстояние и перпендикулярность.", 45],
  ["Конические сечения: окружность, эллипс, гипербола, парабола", "CIRCLE: (x - a)^2 + (y - b)^2 = r^2, centre (a, b), radius r.\nELLIPSE: x^2/a^2 + y^2/b^2 = 1 (a > b). Semi-axes a and b; foci on the long axis at distance c where c^2 = a^2 - b^2; eccentricity e = c/a < 1.\nHYPERBOLA: x^2/a^2 - y^2/b^2 = 1. Here c^2 = a^2 + b^2, e = c/a > 1, and the asymptotes are the lines y = ± (b/a) x.\nPARABOLA: y^2 = 2 p x opens sideways; focus at (p/2, 0), directrix x = -p/2. Every point is equidistant from focus and directrix.\nRead the equation first: a PLUS between the squared terms => ellipse (or circle if a = b); a MINUS => hyperbola; only ONE squared term => parabola. That single check picks the right formula set.", "ОКРУЖНОСТЬ: (x - a)^2 + (y - b)^2 = r^2, центр (a, b), радиус r.\nЭЛЛИПС: x^2/a^2 + y^2/b^2 = 1 (a > b). Полуоси a и b; фокусы на большой оси на расстоянии c, где c^2 = a^2 - b^2; эксцентриситет e = c/a < 1.\nГИПЕРБОЛА: x^2/a^2 - y^2/b^2 = 1. Здесь c^2 = a^2 + b^2, e = c/a > 1, асимптоты — прямые y = ± (b/a) x.\nПАРАБОЛА: y^2 = 2 p x открыта вбок; фокус в (p/2, 0), директриса x = -p/2. Любая точка равноудалена от фокуса и директрисы.\nСначала читаешь уравнение: ПЛЮС между квадратами => эллипс (или окружность при a = b); МИНУС => гипербола; только ОДИН квадрат => парабола. Эта проверка сразу выбирает нужный набор формул.", "csca.app: 15 задач на кривые второго порядка. Для каждой определи тип по знаку, потом найди c, e и асимптоты.", 50],
  ["Векторы и скалярное произведение", "A vector a = (a_1, a_2) has length |a| = sqrt(a_1^2 + a_2^2). Add / subtract componentwise; scale by multiplying each component.\nDOT PRODUCT: a · b = a_1 b_1 + a_2 b_2 = |a| |b| cos θ, where θ is the angle between them. So the angle is cos θ = (a · b) / (|a| |b|).\nKey facts: a · b = 0  <=>  the vectors are PERPENDICULAR; if a · b > 0 the angle is acute, if < 0 obtuse. Two vectors are PARALLEL when one is a scalar multiple of the other, i.e. a_1 b_2 - a_2 b_1 = 0.\nCSCA loves: 'find k so that (…) is perpendicular to (…)' — set the dot product to 0 and solve.", "Вектор a = (a_1, a_2) имеет длину |a| = sqrt(a_1^2 + a_2^2). Складывают и вычитают покоординатно; умножают на число — каждую координату.\nСКАЛЯРНОЕ ПРОИЗВЕДЕНИЕ: a · b = a_1 b_1 + a_2 b_2 = |a| |b| cos θ, где θ — угол между ними. Отсюда cos θ = (a · b) / (|a| |b|).\nГлавное: a · b = 0  <=>  векторы ПЕРПЕНДИКУЛЯРНЫ; при a · b > 0 угол острый, при < 0 тупой. Векторы КОЛЛИНЕАРНЫ (параллельны), когда один — кратное другого, то есть a_1 b_2 - a_2 b_1 = 0.\nCSCA обожает: «найди k, при котором (…) перпендикулярно (…)» — приравняй скалярное произведение к 0 и реши.", "csca.app: 12 задач на длину, угол и перпендикулярность векторов.", 40],
  ["Комплексные числа", "A complex number z = a + b i, where i^2 = -1; a is the real part, b the imaginary part. Arithmetic is like binomials, replacing i^2 by -1:\n  (a + bi)(c + di) = (ac - bd) + (ad + bc) i.\nMODULUS: |z| = sqrt(a^2 + b^2) (distance from the origin). CONJUGATE: z-bar = a - b i. Handy: z * z-bar = a^2 + b^2 = |z|^2.\nTo DIVIDE, multiply top and bottom by the conjugate of the denominator to make it real:\n  (a + bi)/(c + di) = (a + bi)(c - di) / (c^2 + d^2).\nPowers of i cycle with period 4: i, -1, -i, 1, i, … so i^n depends only on n mod 4.", "Комплексное число z = a + b i, где i^2 = -1; a — действительная часть, b — мнимая. Арифметика как с двучленами, только i^2 заменяем на -1:\n  (a + bi)(c + di) = (ac - bd) + (ad + bc) i.\nМОДУЛЬ: |z| = sqrt(a^2 + b^2) (расстояние от начала координат). СОПРЯЖЁННОЕ: z-с чертой = a - b i. Полезно: z * z-сопр = a^2 + b^2 = |z|^2.\nЧтобы ПОДЕЛИТЬ, умножь числитель и знаменатель на сопряжённое знаменателя — знаменатель станет действительным:\n  (a + bi)/(c + di) = (a + bi)(c - di) / (c^2 + d^2).\nСтепени i цикличны с периодом 4: i, -1, -i, 1, i, … поэтому i^n зависит только от n mod 4.", "csca.app: 12 задач на модуль, сопряжённое и деление комплексных чисел.", 40],
  ["Введение в анализ: пределы и производная", "A LIMIT lim(x->a) f(x) is the value f(x) approaches near a. For a polynomial or a continuous function you just substitute. If you get 0/0, FACTOR and cancel, e.g. (x^2 - 4)/(x - 2) = x + 2 -> 4 as x -> 2.\nThe DERIVATIVE f'(x) is the instantaneous rate of change / the slope of the tangent. Power rule: (x^n)' = n x^(n-1). Also (c)' = 0, (sin x)' = cos x, (cos x)' = -sin x, (e^x)' = e^x, (ln x)' = 1/x.\nRules: (f g)' = f' g + f g' (product), (f/g)' = (f' g - f g')/g^2 (quotient), chain rule (f(g(x)))' = f'(g) * g'.\nUse it to find tangents (slope = f'(x_0)) and extrema (f'(x) = 0, then check the sign change).", "ПРЕДЕЛ lim(x->a) f(x) — значение, к которому стремится f(x) около a. Для многочлена или непрерывной функции просто подставляешь. Если вышло 0/0, РАЗЛОЖИ на множители и сократи: (x^2 - 4)/(x - 2) = x + 2 -> 4 при x -> 2.\nПРОИЗВОДНАЯ f'(x) — мгновенная скорость изменения / наклон касательной. Степенное правило: (x^n)' = n x^(n-1). Ещё (c)' = 0, (sin x)' = cos x, (cos x)' = -sin x, (e^x)' = e^x, (ln x)' = 1/x.\nПравила: (f g)' = f' g + f g' (произведение), (f/g)' = (f' g - f g')/g^2 (частное), цепное (f(g(x)))' = f'(g) * g'.\nПрименение: касательная (наклон = f'(x_0)) и экстремумы (f'(x) = 0, затем смотришь смену знака).", "csca.app: 12-15 задач на пределы (0/0) и производную (правила + касательная). Экстремумы — по смене знака f'.", 50],
  ["Вероятность и статистика", "Basic probability: P(A) = (favourable outcomes) / (all equally likely outcomes), always between 0 and 1. Complement: P(not A) = 1 - P(A).\nUnion: P(A or B) = P(A) + P(B) - P(A and B). If A and B are MUTUALLY EXCLUSIVE, the last term is 0. If they are INDEPENDENT, P(A and B) = P(A) * P(B).\nCOUNTING: permutations (order matters) nPr = n! / (n - r)!; combinations (order does not) nCr = n! / (r! (n - r)!).\nSTATISTICS: mean = sum / count; the median is the middle value when sorted; variance is the average of squared deviations from the mean, and standard deviation is its square root. These are cheap, reliable points on the test — don't skip them.", "Базовая вероятность: P(A) = (благоприятные исходы) / (все равновозможные исходы), всегда от 0 до 1. Дополнение: P(не A) = 1 - P(A).\nОбъединение: P(A или B) = P(A) + P(B) - P(A и B). Если A и B НЕСОВМЕСТНЫ, последнее слагаемое = 0. Если НЕЗАВИСИМЫ, P(A и B) = P(A) * P(B).\nКОМБИНАТОРИКА: размещения (порядок важен) nPr = n! / (n - r)!; сочетания (порядок не важен) nCr = n! / (r! (n - r)!).\nСТАТИСТИКА: среднее = сумма / количество; медиана — серединное значение в отсортированном ряду; дисперсия — среднее квадратов отклонений от среднего, стандартное отклонение — корень из неё. Это дешёвые и надёжные баллы — не пропускай.", "csca.app: 12 задач на вероятность, комбинаторику и среднее/дисперсию.", 40],
];

const CSCA_MOCK = ["Timed mock: полный экзамен", "Full timed mock exam: about 48 questions in 60 minutes, strict timer (roughly 1 min 15 sec per question). Do it in one sitting, then review EVERY mistake and redo it from scratch without hints.", "Полный mock по таймеру: примерно 48 вопросов за 60 минут, строгий таймер (около 1 мин 15 сек на вопрос). Реши за один присест, потом разбери КАЖДУЮ ошибку и перерешай её с нуля без подсказок.", "csca.app: запусти полный timed mock. После — разбор всех ошибок в mistake log.", 75];

const CSCA_RESOURCES = [
  ["csca.app", "https://csca.app", "758 задач, интерактивные пробники, бесплатно"],
  ["crosslineedu.com", "https://crosslineedu.com", "разборы программы, free mock exams"],
  ["cucas.cn/csca", "https://www.cucas.cn/csca", "документы, программа, отзывы"],
];

const DET_PROGRAM = [
  ["Read and Complete (fill the blanks)", "Дают абзац, где у части слов стёрты хвосты. Восстанавливаешь по контексту и грамматике. Тренируй скорость: читай всё предложение целиком, а не буквы. Практика — 2-3 текста.", "Tip: guess the word from context first, then fill missing letters.", 15],
  ["Read and Select (real vs fake words)", "Список слов — отметь, какие настоящие английские, а какие выдуманные. Растёт на объёме словаря. Веди список новых слов из ошибок и повторяй.", "Tip: if you have never seen it and it 'feels' odd, it is usually fake.", 15],
  ["Listen and Type (dictation)", "Слушаешь фразу (можно 3 раза) и печатаешь её точь-в-точь. Тренируй аудирование: артикли, окончания -s/-ed, слабые формы (of, to, and). 5-8 диктовок.", "Tip: type what you hear immediately, fix spelling on the last replay.", 20],
  ["Read Aloud (speaking)", "Читаешь предложение вслух — оценивают произношение и беглость. Запиши себя на телефон, сравни с оригиналом, следи за ударением в словах.", "Tip: slow and clear beats fast and mumbled. Mind word stress.", 15],
  ["Write about the Photo", "Описываешь картинку 1+ предложением за 1 минуту. Шаблон: что видишь + где + что происходит. Пиши полными предложениями, без ошибок в артиклях.", "Tip: 'There is/are …', present continuous for actions ('A man is …').", 15],
  ["Speak about the Photo / topic", "Говоришь про картинку или тему 30-90 секунд. Держи структуру: вступление, 2-3 детали, вывод. Не молчи — беглость важнее идеальной грамматики.", "Tip: keep talking; use fillers naturally ('what I notice is…').", 15],
  ["Interactive Reading", "Большой блок: заполнить пропуски, выбрать заголовок, ответить на вопросы по тексту. Читай первый и последний абзац внимательно — там суть.", "Tip: read the questions first, then scan the passage for answers.", 20],
  ["Interactive Listening / Summarize", "Слушаешь разговор, отвечаешь по ходу и в конце пишешь краткое summary. Держи в голове кто/что/зачем. Summary — 2-3 своих предложения, не копипаст.", "Tip: note the speaker's goal; your summary should answer 'what did they decide?'.", 20],
  ["Writing Sample (long answer)", "5 минут на развёрнутый ответ по теме. Структура на 3 абзаца: тезис — 2 причины с примерами — вывод. Цель: 120-160 слов без грубых ошибок.", "Tip: linkers — 'Firstly', 'For example', 'In conclusion'. Reread once.", 20],
  ["Speaking Sample (long answer)", "1-3 минуты монолога на тему. Тот же каркас, что в письме: мнение — аргументы — вывод. Запиши и переслушай: паузы, повторы, произношение.", "Tip: it is fine to pause to think; avoid long silent gaps.", 20],
  ["Full adaptive practice test", "Пройди официальный бесплатный practice test целиком по таймеру — понять текущий балл и слабые секции. Потом добивай именно слабое.", "Tip: treat it like the real thing — quiet room, no pauses, one go.", 40],
];

const DET_RESOURCES = [
  ["Официальный практик-тест", "https://englishtest.duolingo.com/prep", "бесплатный пробный DET, показывает балл"],
  ["englishtest.duolingo.com", "https://englishtest.duolingo.com", "регистрация, правила, окно экзамена"],
  ["Duolingo English Test — accepted institutions", "https://englishtest.duolingo.com/institutions", "проверь минимальный балл нужных вузов Китая"],
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
  let title, english, russian, task, minutes, block;
  if (index < CSCA_LESSONS.length) {
    [title, english, russian, task, minutes] = CSCA_LESSONS[index];
    block = index + 1;
  } else {
    [title, english, russian, task, minutes] = CSCA_MOCK;
    block = CSCA_LESSONS.length + (index - CSCA_LESSONS.length + 1);
  }
  return { block, title, english, russian, link: CSCA_APP, task, minutes };
}

function detTask(index) {
  const [title, desc, tip, minutes] = DET_PROGRAM[index % DET_PROGRAM.length];
  return { number: index + 1, title, desc, tip, link: DET_PRACTICE, minutes };
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
  // parseMode по умолчанию Markdown; передай parseMode:null для plain-текста
  // (математические уроки CSCA со знаками ^, _, * ломали бы разметку).
  const pm = "parseMode" in opts ? opts.parseMode : "Markdown";
  return call(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: pm || undefined,
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
// CSCA — подробный урок (EN -> RU -> практика), шлётся БЕЗ Markdown (математика
// со знаками ^, _, *), при необходимости бьётся на несколько сообщений.




const CHUNK_LIMIT = 3500;

function splitChunks(text, limit = CHUNK_LIMIT) {
  const paras = text.split("\n\n");
  const chunks = [];
  let cur = "";
  for (let p of paras) {
    const piece = cur ? "\n\n" + p : p;
    if (cur.length + piece.length <= limit) {
      cur += piece;
    } else {
      if (cur) chunks.push(cur);
      while (p.length > limit) {
        chunks.push(p.slice(0, limit));
        p = p.slice(limit);
      }
      cur = p;
    }
  }
  if (cur) chunks.push(cur);
  return chunks.length ? chunks : [text];
}

// Возвращает { chunks, link, title, minutes, markdown }.
function buildReminder(trackId, contentIndex) {
  if (trackId === TRACK_6MIN) {
    const t = sixMinTask(contentIndex);
    const text = `🎧 *6 Minute English #${t.number}*\n«${t.title}»\n\nПослушать + разобрать словарь. ~${t.minutes} мин.`;
    return { chunks: [text], link: t.link, title: t.title, minutes: t.minutes, markdown: true };
  }
  if (trackId === TRACK_DET) {
    const t = detTask(contentIndex);
    const text = `🦉 *Duolingo Test #${t.number}*\n*${t.title}*\n\n${t.desc}\n\n💡 ${t.tip}\n\n~${t.minutes} мин. Практика — по кнопке ниже.`;
    return { chunks: [text], link: t.link, title: t.title, minutes: t.minutes, markdown: true };
  }
  if (trackId === TRACK_CSCA) {
    const t = cscaTask(contentIndex);
    const full =
      `📐 CSCA Math · блок ${t.block}\n${t.title}\n\n` +
      `🇬🇧 ENGLISH\n${t.english}\n\n` +
      `🇷🇺 РУССКИЙ\n${t.russian}\n\n` +
      `▶ Практика (~${t.minutes} мин)\n${t.task}`;
    return { chunks: splitChunks(full), link: t.link, title: t.title, minutes: t.minutes, markdown: false };
  }
  if (trackId === TRACK_EGE) {
    const t = egeTask(contentIndex);
    const text = `🧮 *Пробник ЕГЭ (профиль)*\n${t.title}\n\nПолный вариант по таймеру, ~${t.minutes} мин. После — разбор ошибок.`;
    return { chunks: [text], link: t.link, title: t.title, minutes: t.minutes, markdown: true };
  }
  return { chunks: ["Напоминание"], link: "", title: "task", minutes: 0, markdown: true };
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
    return `Понял. Сделаем *${title}* легче: бери половину задания и просто отметь «Готово». Полдела — уже дело. В следующий раз пришлю как обычно.`;
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
  await setMeta(env, userId, "tracks_schema_v", TRACKS_SCHEMA_VERSION);
  return true;
}

// Догоняет треки существующего пользователя: добавляет новые (Duolingo) и один
// раз обновляет кадентности до актуальных дефолтов. Идемпотентно (версия в meta).
async function syncTracks(env, userId) {
  const rows = await getTracks(env, userId);
  const existing = new Set(rows.map((t) => t.track_id));
  const stmts = [];
  for (const [tid, c] of Object.entries(DEFAULT_TRACKS)) {
    if (existing.has(tid)) continue;
    stmts.push(env.DB.prepare(
      "INSERT INTO tracks (user_id, track_id, enabled, cadence, n_days, weekday, hour, minute, duration_min, next_fire_at, content_index) VALUES (?,?,?,?,?,?,?,?,?,?,0)"
    ).bind(userId, tid, c.enabled, c.cadence, c.n_days, c.weekday, c.hour, c.minute, c.duration_min, null));
  }
  if (stmts.length) await env.DB.batch(stmts);

  const ver = Number(await getMeta(env, userId, "tracks_schema_v", "1") || "1");
  if (ver < TRACKS_SCHEMA_VERSION) {
    for (const tid of [TRACK_6MIN, TRACK_CSCA]) {
      const c = DEFAULT_TRACKS[tid];
      // Время (hour/minute) не трогаем — вдруг пользователь его менял.
      await updateTrack(env, userId, tid, {
        cadence: c.cadence, n_days: c.n_days, duration_min: c.duration_min, next_fire_at: null,
      });
    }
    await setMeta(env, userId, "tracks_schema_v", TRACKS_SCHEMA_VERSION);
  }
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
    const msg = buildReminder(tid, track.content_index);
    const hid = await addHistory(env, uid, tid, dateStr, msg.title, msg.link, "sent");
    const kb = actionKeyboard(hid, msg.link);
    const parseMode = msg.markdown ? "Markdown" : null;
    // Длинный урок бьётся на несколько сообщений — клавиатура на последнем.
    for (let i = 0; i < msg.chunks.length; i++) {
      const isLast = i === msg.chunks.length - 1;
      await sendMessage(env, user.chat_id, msg.chunks[i], {
        parseMode, disablePreview: true,
        replyMarkup: isLast ? kb : undefined,
      });
    }
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
    case "/duo": return cmdDuo(env, chatId);
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
  await syncTracks(env, uid); // догнать треки: Duolingo + новые кадентности
  const prof = await getProfile(env, uid);
  await initFires(env, uid, prof.tz);
  const hello = isNew ? "Привет! " : "С возвращением! ";
  const text = `${hello}Я держу твой ритм по четырём трекам:\n\n` +
    "🎧 *6 Minute English* — раз в 2 дня, 10 мин\n" +
    "🦉 *Duolingo Test* — раз в 2 дня, ~20 мин (для вузов Китая)\n" +
    "📐 *CSCA Math* — раз в 3 дня, подробный урок EN→RU + практика\n" +
    "🧮 *Пробник ЕГЭ* — раз в неделю, ~2 ч\n\n" +
    "Воскресенье — выходной, напоминаний нет.\n\n" +
    "Команды: /status /tracks /pause /report /csca /duo /help";
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
    "/csca — ресурсы по математике\n" +
    "/duo — про Duolingo Test и ресурсы\n\n" +
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

function cmdDuo(env, chatId) {
  const lines = ["🦉 *Duolingo English Test — для поступления в Китай*", ""];
  lines.push("Адаптивный тест ~1 ч, балл 10–160. Многие вузы Китая принимают " +
    "*100–120+*, топовые (Tsinghua, Peking, Fudan) — *120+*. Проверь минимум " +
    "своих вузов заранее.");
  lines.push("");
  for (const [name, url, note] of DET_RESOURCES) lines.push(`• [${name}](${url}) — ${note}`);
  lines.push("");
  lines.push("_План: раз в 2 дня бот присылает конкретный тип задания DET с " +
    "подсказкой. Раз в пару недель — полный пробный тест по кнопке._");
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
  { command: "duo", description: "про Duolingo Test" },
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
