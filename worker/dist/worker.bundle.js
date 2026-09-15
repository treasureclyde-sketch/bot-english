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
// вручную: меняй content.py и пересоздавай. Уроки CSCA собраны из учебника.



const CSCA_APP = "https://csca.app";
const CSCA_PRACTICE = "https://csca.app/ru/math/practice";
const CSCA_TRAINER = "https://claude.ai/artifact/5fcL1CfMYSDPrng8fHGsKE";
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
  ["Множества и неравенства (Sets & Inequalities)", "🇬🇧 EXAM VOCAB\n• set — множество\n• empty set ∅ — пустое множество\n• element — элемент\n• belongs to (∈) — принадлежит\n• subset (⊆) — подмножество\n• union (∪) — объединение\n• intersection (∩) — пересечение\n• solution set — множество решений\n• inequality — неравенство\n\n🇷🇺 ТЕОРИЯ\nМножество (set) — это просто набор объектов, обычно чисел. Записать его можно двумя способами. Перечислением: A={6,7,8,9,10}. Или условием: A={x| -2≤ x≤ 2} — читается «все такие x, что x от -2 до 2». Вертикальная черта | значит «такие что».\n▸ Принадлежность vs подмножество — главная ловушка темы\nЕсть два разных значка, и их путают чаще всего. ∈ (belongs to, принадлежит) — это про один элемент внутри множества: 9∈ A значит «число 9 лежит в A». ⊆ (subset, подмножество) — это про целый набор внутри другого: {6,7}⊆ A значит «набор {6,7} целиком помещается в A».\n⚠ 6∈ A — верно (6 это элемент). А вот 6⊆ A — неверно, потому что 6 это число, а не набор. Зато {6}⊆ A — верно ({6} это множество из одного элемента). И ещё: пустое множество ∅ является подмножеством любого множества, но не элементом.\n▸ Объединение и пересечение\nA∪ B (union, объединение) — всё, что лежит хотя бы в одном из множеств. A∩ B (intersection, пересечение) — только то, что лежит в обоих сразу. Подсказка по значкам: ∪ похож на чашку — «собираем всё вместе»; ∩ — это их общая часть, наложение.\n▸ Неравенства\nКвадратное неравенство вроде x²-x-2>0: сначала раскладываем на множители (x-2)(x+1)>0, находим корни x=2 и x=-1. Парабола с x² ветвями вверх. Она выше нуля (положительна) по краям — снаружи корней, и ниже нуля между корнями. Раз нам надо >0 — берём края: x<-1 или x>2.\n💡 Правило для >0: «снаружи корней». Для <0: «между корнями». Это если ветви вверх (коэффициент при x² положительный).\nДробное неравенство вроде (2x+1)/(x-2)≤ 0: находим, где ноль у числителя (x=-1/2) и у знаменателя (x=2). Дробь меняет знак в этих точках. Ноль числителя можно включать (там дробь = 0, а нам нужно ≤), а ноль знаменателя всегда выкалываем — на ноль делить нельзя.\n\n📐 ФОРМУЛЫ\n• Квадратное нерав-во: разложить, найти корни, выбрать знак по параболе\n• Дробное f/g≤ 0: нули числителя включаем, нули знаменателя выкалываем\n\n✍ РАЗБОР ПРИМЕРА\nSolve x² - x - 2 > 0.\n  → Factor: (x-2)(x+1)>0.\n  → Roots x=2, x=-1; parabola opens up → positive outside roots.\n  → So x<-1 or x>2.\n  Ответ: {x| x<-1 or x>2}\n\n❓ ПРОВЕРЬ СЕБЯ\nLet A={6,7,8,9,10}. Which statement is correct?\n  a) 9∈ A\n  b) ∅∈ A\n  c) 6⊆ A\n  d) {6}∈ A\n(ответ в конце)\n\n▶ ПРАКТИКА\nПрорешай блок «Sets & Inequalities» на csca.app/ru/math/practice. Ошибки — в mistake log и перерешай с нуля.\n\n— — —\nОтвет на проверку: a) — 9 is an element ⇒ 9∈ A. 6⊆ A is wrong (6 is a number, not a set); {6} is a subset (⊆), not an element.", 40],
  ["Функции (Functions)", "🇬🇧 EXAM VOCAB\n• function — функция\n• domain — область определения\n• range — область значений\n• inverse function — обратная функция\n• even function — чётная функция\n• odd function — нечётная функция\n• increasing — возрастающая\n• decreasing — убывающая\n• monotonic — монотонная\n\n🇷🇺 ТЕОРИЯ\nФункция (function) — это «машина»: подаёшь на вход число x, на выходе получаешь y. Например f(x)=x²: подал 3 → получил 9. Запись f(x) читается «эф от икс».\n▸ Область определения (domain)\nЭто какие x вообще можно подавать на вход, чтобы машина не сломалась. Есть три типичных запрета: нельзя делить на ноль (знаменатель ≠ 0); нельзя брать чётный корень из отрицательного (под √ должно быть ≥ 0); нельзя брать логарифм от нуля или отрицательного (под log должно быть >0).\nЕсли запретов несколько — надо собрать их вместе. Пример: f(x)=1/x+√(1-x). Из-за 1/x нужно x≠0. Из-за √(1-x) нужно 1-x≥0, то есть x≤1. Оба условия вместе: x≤1, но x≠0.\n▸ Чётность функции\nФункция чётная (even), если её график симметричен относительно оси Y — левая половина зеркальна правой. Математически: f(-x)=f(x). Примеры: x², x⁴, cos x. Функция нечётная (odd), если график симметричен относительно начала координат (поворот на 180°): f(-x)=-f(x). Примеры: x, x³, sin x.\n💡 Как проверить: подставь -x вместо x. Получилось то же самое → чётная. Получилось всё с минусом → нечётная. Ни то ни другое → функция не чётная и не нечётная.\n▸ Обратная функция (inverse)\nЕсли прямая функция «икс → игрек», то обратная отматывает назад: «игрек → икс». Чтобы найти её формулу: 1) берём y=… x…, 2) меняем местами x и y, 3) выражаем y. Пример: y=3x-2 → меняем: x=3y-2 → выражаем: y=(x+2)/3. На графике обратная функция — это отражение исходной относительно прямой y=x.\n\n📐 ФОРМУЛЫ\n• even (чётная): f(-x)=f(x)\n• odd (нечётная): f(-x)=-f(x)\n• inverse: поменять xrightarrow y, выразить y\n• domain: знам. ≠0; под √ ≥0; под log >0\n\n✍ РАЗБОР ПРИМЕРА\nFind the domain of f(x)=1/x+√(1-x).\n  → 1/x: need x≠0.\n  → √(1-x): need 1-x≥0⇒ x≤1.\n  → Combine.\n  Ответ: (-∞,0)∪(0,1]\n\n❓ ПРОВЕРЬ СЕБЯ\nInverse of y=x³+3, x∈ℝ:\n  a) y=∛(x-3), x≥3\n  b) y=∛(x-3), x∈ℝ\n  c) y=∛(x+3)\n  d) y=∛(x+3), x≥-3\n(ответ в конце)\n\n▶ ПРАКТИКА\nПрорешай блок «Functions» на csca.app/ru/math/practice. Ошибки — в mistake log и перерешай с нуля.\n\n— — —\nОтвет на проверку: b) — Swap: x=y³+3⇒ y=∛(x-3). Cube root defined for all reals.", 40],
  ["Прогрессии (Sequences)", "🇬🇧 EXAM VOCAB\n• arithmetic sequence — арифметическая прогрессия\n• geometric progression — геометрическая прогрессия\n• common difference (d) — разность\n• common ratio (q) — знаменатель прогрессии\n• first term — первый член\n• general term — общий член\n• sum of first n terms — сумма первых n членов\n\n🇷🇺 ТЕОРИЯ\nПоследовательность — это просто список чисел по порядку: a₁, a₂, a₃,…. Нижний индекс — это номер члена. a₅ — пятое число в списке.\n▸ Арифметическая прогрессия\nArithmetic sequence — каждый следующий член получается прибавлением одного и того же числа d (common difference, разность). Пример: 2,5,8,11,… — тут d=3. Формула любого члена: aₙ=a₁+(n-1)d. Логика простая: чтобы дойти от первого члена до n-го, надо шагнуть (n-1) раз, каждый шаг прибавляет d.\nПример: a₁=2, d=3, найти a₁₀₀. Шагаем 99 раз: a₁₀₀=2+99·3=2+297=299.\n▸ Геометрическая прогрессия\nGeometric progression — каждый следующий член получается умножением на одно и то же число q (common ratio, знаменатель). Пример: 2,4,8,16,… — тут q=2. Формула: aₙ=a₁· qⁿ⁻¹.\n▸ Трюк: член из суммы\nИногда дают не сами члены, а Sₙ — сумму первых n членов. Чтобы вытащить отдельный член, пользуемся: aₙ=Sₙ-S_(n-1). Идея: сумма до n-го минус сумма до предыдущего = ровно n-й член.\n💡 Пример: Sₙ=n²+1, найти a₁₀. Считаем S₁₀-S₉=(100+1)-(81+1)=101-82=19. Не пытайся искать формулу члена напрямую — просто вычти две суммы.\n\n📐 ФОРМУЛЫ\n• arithmetic n-th: aₙ=a₁+(n-1)d\n• term from sum: aₙ=Sₙ-S_(n-1)\n• geometric n-th: aₙ=a₁ qⁿ⁻¹\n\n✍ РАЗБОР ПРИМЕРА\n{aₙ} arithmetic, a₁=2, d=3. Find a₁₀₀.\n  → aₙ=a₁+(n-1)d.\n  → a₁₀₀=2+99·3.\n  Ответ: 299\n\n❓ ПРОВЕРЬ СЕБЯ\nArithmetic: a₂=1, a₄=5. Find a₁,d.\n  a) -1, -2\n  b) -1, 2\n  c) 1, 2\n  d) 1, -2\n(ответ в конце)\n\n▶ ПРАКТИКА\nПрорешай блок «Sequences» на csca.app/ru/math/practice. Ошибки — в mistake log и перерешай с нуля.\n\n— — —\nОтвет на проверку: b) — d=(5-1)/2=2; a₁=a₂-d=1-2=-1.", 40],
  ["Тригонометрия (Trigonometry) · ⚠ слабое место", "🇬🇧 EXAM VOCAB\n• angle — угол\n• quadrant — четверть\n• period — период\n• double-angle formula — формула двойного угла\n• half-angle formula — формула половинного угла\n• reduction formula — формула приведения\n• acute angle — острый угол\n\n🇷🇺 ТЕОРИЯ\nТригонометрия пугает, но в основе одна картинка — единичная окружность (радиус 1, центр в начале координат). Берём угол α, откладываем его от оси X против часовой, смотрим, в какую точку окружности пришли. Тогда: cosα — это x-координата этой точки, sinα — её y-координата. А tanα=sinα/cosα.\n▸ Четверти и знаки — это половина задач экзамена\nОкружность делится на 4 четверти (quadrants). От того, в какой четверти лежит угол, зависят знаки синуса и косинуса (ведь это просто координаты x и y):\nI четверть (0–90°): sin+, cos+. II (90–180°): sin+, cos-. III (180–270°): sin-, cos-. IV (270–360°): sin-, cos+.\n⚠ Когда в задаче пишут «α во второй четверти» или «α∈(π/2,π)» — это подсказка про знак. Часто весь смысл задачи в том, чтобы поставить правильный плюс или минус. Не игнорируй это условие.\n▸ Базовые значения — выучить наизусть\nДля 30°: sin=1/2, cos=√3/2. Для 45°: sin=cos=√2/2. Для 60°: sin=√3/2, cos=1/2. Это табличные значения, они встречаются постоянно.\n▸ Двойной угол\nЕсли в задаче дан sinα или cosα, а спрашивают про 2α — применяем формулы двойного угла: sin2α=2sinαcosα и cos2α=1-2sin²α. Пример: дано sinα=1/4, тогда cos2α=1-2·(1/4)²=1-1/8=7/8. Заметь — тут даже не понадобился cosα.\n▸ Половинный угол — и его главный подвох\nНаоборот: из α находим α/2. Формула: sinα/2=±√((1-cosα)/2).\n⚠ Знак ± определяется четвертью, в которой лежит α/2, а НЕ сам α! Если α∈(π/2,π), то α/2∈(π/4,π/2) — это первая четверть, значит sinα/2>0, берём плюс. Это место заваливают чаще всего.\n\n📐 ФОРМУЛЫ\n• sin double: sin2α=2sinαcosα\n• cos double: cos2α=1-2sin²α\n• half angle: sinα/2=±√((1-cosα)/2)\n• identity: sin²α+cos²α=1\n\n✍ РАЗБОР ПРИМЕРА\n(1) sinα=1/4. Find cos2α.\n  → cos2α=1-2sin²α.\n  → =1-2·1/16=1-1/8.\n  Ответ: 7/8\n(2) cosα=-1/2, α∈(π/2,π). Find sinα/2.\n  → α/2∈(π/4,π/2) → 1st quadrant → sign +.\n  → sinα/2=√((1-(-1/2))/2)=√(3/4).\n  Ответ: √3/2\n\n❓ ПРОВЕРЬ СЕБЯ\nsinα=3/5, quadrant I. Find sin2α.\n  a) 24/25\n  b) 18/25\n  c) 7/25\n  d) 12/25\n(ответ в конце)\n\n▶ ПРАКТИКА\nПрорешай блок «Trigonometry» на csca.app/ru/math/practice. Ошибки — в mistake log и перерешай с нуля.\n\n— — —\nОтвет на проверку: a) — cosα=4/5; sin2α=2·3/5·4/5=24/25.", 45],
  ["Прямые на плоскости (Lines) · ⚠ слабое место", "🇬🇧 EXAM VOCAB\n• slope — угловой коэффициент (наклон)\n• angle of inclination — угол наклона\n• perpendicular — перпендикулярны\n• parallel — параллельны\n• intersection point — точка пересечения\n• distance — расстояние\n• equation of a line — уравнение прямой\n\n🇷🇺 ТЕОРИЯ\nПрямую на координатной плоскости почти всегда задают уравнением y=kx+b. Здесь k — наклон (slope), а b — высота, на которой прямая пересекает ось Y.\n▸ Что такое наклон\nНаклон k показывает, насколько круто прямая идёт: на сколько поднимается y, когда x увеличивается на 1. Если есть две точки, наклон считается так: k=(y₂-y₁)/(x₂-x₁) — «насколько изменился y, делим на то, насколько изменился x». Положительный k — прямая идёт вверх, отрицательный — вниз.\nПример: прямая через A(-2,3) и B(3,1). k=(1-3)/(3-(-2))=(-2)/5=-2/5. Минус — значит прямая идёт вниз.\n▸ Угол наклона\nAngle of inclination — это угол θ, под которым прямая наклонена к оси X. Связь с наклоном: k=tanθ. Например, наклон 45° даёт k=tan45°=1.\n▸ Параллельность и перпендикулярность\nДве прямые параллельны (parallel), если у них одинаковый наклон: k₁=k₂ (идут в одну сторону, не пересекаются). Две прямые перпендикулярны (perpendicular), если k₁· k₂=-1 — наклоны «переворачиваются и меняют знак».\n💡 Чтобы найти прямую, параллельную данной, держи тот же k. Чтобы перпендикулярную — возьми -1/k (перевернул дробь и поставил минус).\n▸ Расстояние между точками\nЭто просто теорема Пифагора. Между (x₁,y₁) и (x₂,y₂): d=√((x₂-x₁)²+(y₂-y₁)²). Считаешь, насколько разошлись по горизонтали и по вертикали, возводишь в квадрат, складываешь, берёшь корень.\n\n📐 ФОРМУЛЫ\n• slope: k=(y₂-y₁)/(x₂-x₁)\n• slope ↔ angle: k=tanθ\n• perpendicular: k₁ k₂=-1\n• distance: d=√((x₂-x₁)²+(y₂-y₁)²)\n\n✍ РАЗБОР ПРИМЕРА\nSlope of line through A(-2,3) and B(3,1).\n  → k=(1-3)/(3-(-2))=(-2)/5.\n  Ответ: -2/5\n\n❓ ПРОВЕРЬ СЕБЯ\nDistance between P(-1,2) and Q(3,1):\n  a) √5\n  b) √17\n  c) 5\n  d) √13\n(ответ в конце)\n\n▶ ПРАКТИКА\nПрорешай блок «Lines» на csca.app/ru/math/practice. Ошибки — в mistake log и перерешай с нуля.\n\n— — —\nОтвет на проверку: b) — √((3+1)²+(1-2)²)=√(16+1)=√17.", 45],
  ["Конические сечения (Conic Sections) · ⚠ слабое место", "🇬🇧 EXAM VOCAB\n• circle — окружность\n• parabola — парабола\n• ellipse — эллипс\n• hyperbola — гипербола\n• focus / foci — фокус / фокусы\n• directrix — директриса\n• eccentricity — эксцентриситет\n• vertex — вершина\n• semi-major axis — большая полуось\n• semi-minor axis — малая полуось\n• focal distance — фокусное расстояние\n• center — центр\n• radius — радиус\n\n🇷🇺 ТЕОРИЯ\nЕсли разрезать конус плоскостью под разными углами, в сечении получаются четыре фигуры: окружность, эллипс, парабола, гипербола. Отсюда название «конические сечения». В экзамене их много — разберём по очереди.\n▸ Окружность (circle)\nВсе точки на одинаковом расстоянии r (радиус) от центра (a,b). Уравнение: (x-a)²+(y-b)²=r². Часто его дают «развёрнутым», например x²+y²-4x-3=0 — и центр сразу не виден. Тогда выделяем полный квадрат: x²-4x=(x-2)²-4. Получаем (x-2)²+y²=7 → центр (2,0), радиус √7.\n▸ Эллипс (ellipse)\nЭто как сплющенная окружность. Уравнение x²/a²+y²/b²=1. У него есть два особых внутренних точки — фокусы (foci). Главное свойство: для любой точки эллипса сумма расстояний до двух фокусов всегда одна и та же и равна 2a. То есть |PF₁|+|PF₂|=2a.\n💡 Если в задаче дан эллипс и спрашивают |PF₁|+|PF₂| — не нужно считать координаты. Это сразу 2a, где a² — большее из чисел под дробями.\n▸ Парабола (parabola)\nТочки, равноудалённые от фокуса и от прямой-директрисы (directrix). Вид y²=2px. Для y²=2px: фокус в (p/2,0), директриса — прямая x=-p/2. Пример: y²=-x значит 2p=1, p=1/2, парабола открыта влево, директриса x=1/4.\n▸ Гипербола (hyperbola)\nДве отдельные ветви. Уравнение x²/a²-y²/b²=1 (обрати внимание на минус — этим отличается от эллипса). Эксцентриситет e=c/a показывает, насколько она «растопырена». Фокусное расстояние — это 2c, расстояние между двумя фокусами.\n⚠ Ключевая разница, на которой валятся: у эллипса c²=a²-b² (минус), а у гиперболы c²=a²+b² (плюс). Перепутаешь знак — получишь неверный фокус и эксцентриситет.\n\n📐 ФОРМУЛЫ\n• circle: (x-a)²+(y-b)²=r²\n• parabola y²=2px: focus (p/2,0), directrix x=-p/2\n• ellipse: c²=a²-b²; |PF₁|+|PF₂|=2a\n• hyperbola: c²=a²+b²; e=c/a; focal dist =2c\n\n✍ РАЗБОР ПРИМЕРА\n(1) Center & radius of x²+y²-4x-3=0.\n  → Complete the square: x²-4x=(x-2)²-4.\n  → (x-2)²+y²=7.\n  Ответ: center (2,0), radius √7\n(2) Directrix of y²=-x?\n  → 2p=1⇒ p=1/2, opens left.\n  → Directrix x=p/2=1/4.\n  Ответ: x=1/4\n\n❓ ПРОВЕРЬ СЕБЯ\nCircle center (-3,2), radius 4:\n  a) (x+3)²+(y-2)²=4\n  b) (x-3)²+(y+2)²=16\n  c) (x-3)²+(y+2)²=4\n  d) (x+3)²+(y-2)²=16\n(ответ в конце)\n\n▶ ПРАКТИКА\nПрорешай блок «Conic Sections» на csca.app/ru/math/practice. Ошибки — в mistake log и перерешай с нуля.\n\n— — —\nОтвет на проверку: d) — (x-a)²+(y-b)²=r², a=-3,b=2,r=4: (x+3)²+(y-2)²=16.", 45],
  ["Комплексные числа (Complex Numbers) · 🆕 новая тема", "🇬🇧 EXAM VOCAB\n• complex number — комплексное число\n• imaginary unit (i) — мнимая единица\n• real part — действительная часть\n• imaginary part — мнимая часть\n• modulus — модуль\n• conjugate — сопряжённое число\n\n🇷🇺 ТЕОРИЯ\nЭто тема, которой в твоём профмате почти нет, так что читай внимательно — но она небольшая. Проблема, из которой всё выросло: √(-1) среди обычных чисел не существует (любое число в квадрате ≥0). Математики просто придумали новый объект — мнимую единицу (imaginary unit) i, по определению i²=-1.\n▸ Что такое комплексное число\nКомплексное число выглядит как z=a+bi. Здесь a — действительная часть (real part), b — мнимая часть (imaginary part). Например z=3+2i. Если b=0 — это обычное число; i — это просто «метка» мнимой части.\n▸ Действия\nСкладываем и вычитаем по частям: (3+2i)+(1+4i)=4+6i. Умножаем как обычные скобки, но везде, где появляется i², заменяем его на -1. Пример: (1-i)²=1-2i+i²=1-2i-1=-2i.\n▸ Деление — главный приём\nДелить на i напрямую неудобно. Трюк: домножаем числитель и знаменатель на сопряжённое (conjugate) — это то же число, но с противоположным знаком мнимой части (a-bi). Это убирает i из знаменателя — ровно как мы избавляемся от корня в знаменателе.\n💡 Пример: z=(3+2i)/(-2i). Домножим верх и низ на i: ((3+2i)i)/(-2i· i)=(3i+2i²)/(-2i²)=(-2+3i)/2=-1+3/2 i. Внизу i²=-1 превратило мнимое в обычное число.\n▸ Корни уравнений\nЕсли у квадратного уравнения с обычными (действительными) коэффициентами корни комплексные, то они всегда идут парой сопряжённых: если z корень, то и z̄ тоже. Это помогает: сумма корней и их произведение связаны с коэффициентами (теорема Виета работает и здесь).\n\n📐 ФОРМУЛЫ\n• base rule: i²=-1\n• division: домножить на сопряжённое a-bi\n• real-coef roots: комплексные корни идут парой z,z̄\n\n✍ РАЗБОР ПРИМЕРА\n(1-i)² z=3+2i. Find z.\n  → (1-i)²=1-2i+i²=-2i.\n  → z=(3+2i)/(-2i), multiply by i: (-2+3i)/2.\n  Ответ: -1+3/2 i\n\n❓ ПРОВЕРЬ СЕБЯ\nz lies on x-y=0 and is a root of x²+mx+4=0. Find m.\n  a) 2√2 or -2√2\n  b) √2 or 2√2\n  c) -√2 or -2√2\n  d) √2 or -√2\n(ответ в конце)\n\n▶ ПРАКТИКА\nПрорешай блок «Complex Numbers» на csca.app/ru/math/practice. Ошибки — в mistake log и перерешай с нуля.\n\n— — —\nОтвет на проверку: a) — z=a+ai; roots z,z̄. Product =4=2a²⇒ a²=2. Sum =-m=2a⇒ m=∓2√2.", 45],
  ["Векторы и вероятность (Vectors & Probability)", "🇬🇧 EXAM VOCAB\n• vector — вектор\n• collinear — коллинеарны\n• midpoint — середина\n• probability — вероятность\n• independent — независимые\n• mutually exclusive — несовместные\n\n🇷🇺 ТЕОРИЯ\nДве небольшие темы, дают лёгкие очки на экзамене.\n▸ Векторы\nВектор (vector) — это стрелка: у неё есть направление и длина. В координатах записывается →a=(x,y). Складываем векторы и умножаем на число покоординатно. Пример: →a=(-1,2), →b=(2,-1). Тогда 2→a=(-2,4), а 2→a+→b=(-2+2, 4-1)=(0,3).\nДва вектора коллинеарны (collinear) — лежат на одной прямой — если один получается из другого умножением на число: →u=λ→v. Этим часто доказывают, что три точки лежат на одной прямой.\n▸ Вероятность\nВероятность (probability) события = (благоприятные исходы)/(все возможные исходы). Для задач «выбрать 2 из 5» считаем количество сочетаний C. Пример: в мешке 3 чёрных и 2 красных шара, тянем 2, ищем вероятность «два одного цвета». Благоприятные: C₃²+C₂²=3+1=4. Всего: C₅²=10. Ответ 4/10=2/5.\n\n📐 ФОРМУЛЫ\n• vector ops: покоординатно: k→a+→b\n• collinear: →u=λ→v\n• probability: P=fav/total\n\n✍ РАЗБОР ПРИМЕРА\n→a=(-1,2), →b=(2,-1). Find 2→a+→b.\n  → 2→a=(-2,4); add →b.\n  Ответ: (0,3)\n\n❓ ПРОВЕРЬ СЕБЯ\n→a=(-1,2), →b=(2,-1). Find 2→a+→b.\n  a) (1,1)\n  b) (0,3)\n  c) 4\n  d) (2,2)\n(ответ в конце)\n\n▶ ПРАКТИКА\nПрорешай блок «Vectors & Probability» на csca.app/ru/math/practice. Ошибки — в mistake log и перерешай с нуля.\n\n— — —\nОтвет на проверку: b) — 2→a=(-2,4); +→b: (0,3).", 40],
  ["Производные (Derivatives)", "🇬🇧 EXAM VOCAB\n• derivative — производная\n• maximum — максимум\n• minimum — минимум\n• extremum — экстремум\n• critical point — критическая точка\n• interval — отрезок\n\n🇷🇺 ТЕОРИЯ\nПроизводную ты по профмату знаешь — тут в основном английские слова и один тип задач из экзамена.\n▸ Смысл\nПроизводная (derivative) f'(x) — это скорость изменения функции, или наклон касательной в точке. Главное правило — степенное: (xⁿ)'=n xⁿ⁻¹ (степень спускается вперёд множителем, сама уменьшается на 1).\n▸ Рост, спад и экстремумы\nГде f'(x)>0 — функция растёт, где f'(x)<0 — убывает. В точке максимума или минимума касательная горизонтальна, то есть f'(x)=0. Такие точки называют критическими (critical points).\n▸ Максимум на отрезке — частый тип задач\nЧтобы найти наибольшее значение f на отрезке [a,b]: 1) находим f', приравниваем к нулю — получаем критические точки; 2) считаем значение f в этих точках И на обоих концах отрезка; 3) выбираем самое большое.\n⚠ Не забывай проверять концы отрезка! Максимум может быть не в критической точке, а на краю. Пример: f(x)=2x³-3x²-36x+1 на [-3,4]. Критические x=-2,3. Считаем все четыре: f(-3)=28, f(-2)=45, f(3)=-80, f(4)=-63. Максимум =45 — в критической точке, но проверить надо было всё.\n\n📐 ФОРМУЛЫ\n• power rule: (xⁿ)'=n xⁿ⁻¹\n• max on [a,b]: сравни f в критич. точках и на концах\n\n✍ РАЗБОР ПРИМЕРА\nMax of f(x)=2x³-3x²-36x+1 on [-3,4].\n  → f'=6(x-3)(x+2) → crit x=3,-2.\n  → f(-3)=28,f(-2)=45,f(3)=-80,f(4)=-63.\n  Ответ: 45\n\n❓ ПРОВЕРЬ СЕБЯ\nMax of f(x)=2x³-3x²-36x+1 on [-3,4]:\n  a) -63\n  b) 1\n  c) 28\n  d) 45\n(ответ в конце)\n\n▶ ПРАКТИКА\nПрорешай блок «Derivatives» на csca.app/ru/math/practice. Ошибки — в mistake log и перерешай с нуля.\n\n— — —\nОтвет на проверку: d) — f'=6(x-3)(x+2). f(-3)=28,f(-2)=45,f(3)=-80,f(4)=-63. Max =45.", 40],
];

const CSCA_RESOURCES = [
  ["Тренажёр (теория+словарь+тест)", "https://claude.ai/artifact/5fcL1CfMYSDPrng8fHGsKE", "9 тем с разбором, словарь EN↔RU, тест с таймером"],
  ["csca.app — практика", "https://csca.app/ru/math/practice", "интерактивные задачи по темам, бесплатно"],
  ["csca.app", "https://csca.app", "758 задач, пробники, словарь"],
  ["crosslineedu.com", "https://crosslineedu.com", "разборы программы, free mock exams"],
];

const DET_PROGRAM = [
  ["Read and Complete (fill the blanks)", "Дают абзац, где у части слов стёрты хвосты. Восстанавливаешь по контексту и грамматике. Тренируй скорость: читай всё предложение целиком, а не буквы. Практика — 2-3 текста.", "Tip: guess the word from context first, then fill missing letters.", 15],
  ["Read and Select (real vs fake words)", "Список слов — отметь, какие настоящие английские, а какие выдуманные. Растёт на объёме словаря. Веди список новых слов из ошибок и повторяй.", "Tip: if you have never seen it and it 'feels' odd, it is usually fake.", 15],
  ["Listen and Type (dictation)", "Слушаешь фразу (можно 3 раза) и печатаешь её точь-в-точь. Тренируй аудирование: артикли, окончания -s/-ed, слабые формы (of, to, and). 5-8 диктовок.", "Tip: type what you hear immediately, fix spelling on the last replay.", 20],
  ["Read Aloud (speaking)", "Читаешь предложение вслух — оценивают произношение и беглость. Запиши себя на телефон, сравни с оригиналом, следи за ударением в словах.", "Tip: slow and clear beats fast and mumbled. Mind word stress.", 15],
  ["Write about the Photo", "Описываешь картинку 1+ предложением за 1 минуту. Шаблон: что видишь + где + что происходит. Пиши полными предложениями, без ошибок в артиклях.", "Tip: 'There is/are ...', present continuous for actions ('A man is ...').", 15],
  ["Speak about the Photo / topic", "Говоришь про картинку или тему 30-90 секунд. Держи структуру: вступление, 2-3 детали, вывод. Не молчи — беглость важнее идеальной грамматики.", "Tip: keep talking; use fillers naturally ('what I notice is...').", 15],
  ["Interactive Reading", "Большой блок: заполнить пропуски, выбрать заголовок, ответить на вопросы по тексту. Читай первый и последний абзац внимательно — там суть.", "Tip: read the questions first, then scan the passage for answers.", 20],
  ["Interactive Listening / Summarize", "Слушаешь разговор, отвечаешь по ходу и в конце пишешь краткое summary. Держи в голове кто/что/зачем. Summary — 2-3 своих предложения, не копипаст.", "Tip: note the speaker's goal; your summary should answer 'what did they decide?'.", 20],
  ["Writing Sample (long answer)", "5 минут на развёрнутый ответ по теме. Структура на 3 абзаца: тезис — 2 причины с примерами — вывод. Цель: 120-160 слов без грубых ошибок.", "Tip: linkers — 'Firstly', 'For example', 'In conclusion'. Reread once.", 20],
  ["Speaking Sample (long answer)", "1-3 минуты монолога на тему. Тот же каркас, что в письме: мнение — аргументы — вывод. Запиши и переслушай: паузы, повторы, произношение.", "Tip: it is fine to pause to think; avoid long silent gaps.", 20],
  ["Full adaptive practice test", "Пройди официальный бесплатный practice test целиком по таймеру — понять текущий балл и слабые секции. Цель 110-120; потом добивай именно слабое.", "Tip: treat it like the real thing — quiet room, no pauses, one go.", 40],
];

const DET_RESOURCES = [
  ["Официальный практик-тест", "https://englishtest.duolingo.com/prep", "бесплатный пробный DET, показывает балл"],
  ["englishtest.duolingo.com", "https://englishtest.duolingo.com", "регистрация, правила, окно экзамена"],
  ["Accepted institutions", "https://englishtest.duolingo.com/institutions", "проверь минимальный балл нужных вузов Китая"],
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
  const n = CSCA_LESSONS.length;
  const [title, body, minutes] = CSCA_LESSONS[index % n];
  return { block: (index % n) + 1, title, body, link: CSCA_PRACTICE, minutes };
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
    const total = CSCA_LESSONS.length;
    const full = `📐 CSCA Math · тема ${t.block}/${total} (~${t.minutes} мин)\n${t.title}\n\n${t.body}`;
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
  lines.push("Адаптивный тест ~1 ч, балл 10–160. *Твоя цель — 110–120* (этого " +
    "хватает большинству программ; топовые вузы иногда просят 120+). Проверь " +
    "минимум своих вузов заранее.");
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
