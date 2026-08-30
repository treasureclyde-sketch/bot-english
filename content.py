"""Библиотека контента для напоминаний.

Слой 3 из структуры: каждое напоминание — это конкретное задание, прямая
ссылка, оценка времени и (в handlers) три кнопки действия. Здесь лежат сами
задания. Треки идут по программе (разблокировка тем по порядку), а не хаотично.

Индекс задания хранится в базе (tracks.content_index) и двигается вперёд на
каждое отправленное напоминание. Когда список заканчивается — начинаем заново
(для 6min это нормально; для CSCA последний блок — бесконечные mock exam'ы).
"""

from config import TRACK_6MIN, TRACK_EGE, TRACK_CSCA


# --- 6 Minute English -------------------------------------------------------
# Реальные выпуски BBC Learning English «6 Minute English». Ссылка ведёт на
# страницу выпуска. Список цикличный — прошёл все, начинаешь сначала.
SIX_MIN_EPISODES = [
    ("Why we hate open offices",
     "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2019/ep-190411"),
    ("Is the customer always right?",
     "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2020/ep-200206"),
    ("Does your age affect your opinions?",
     "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2021/ep-210401"),
    ("The benefits of boredom",
     "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2019/ep-190606"),
    ("How to make decisions",
     "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2020/ep-201029"),
    ("The power of introverts",
     "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2019/ep-190822"),
    ("Why do we cry?",
     "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2021/ep-210617"),
    ("The problem with plastic",
     "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2018/ep-181129"),
    ("Learning a language later in life",
     "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2020/ep-200827"),
    ("The secrets of a good sleep",
     "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2019/ep-191219"),
    ("Can we trust our memories?",
     "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2021/ep-210909"),
    ("How to be a better listener",
     "https://www.bbc.co.uk/learningenglish/features/6-minute-english_2020/ep-200723"),
]

SIX_MIN_HUB = "https://www.bbc.co.uk/learningenglish/features/6-minute-english"


# --- CSCA Mathematics -------------------------------------------------------
# Программа собрана из учебника самоподготовки CSCA (4-месячный план).
# Идёт по порядку: словарь -> Functions (48%) -> Geometry (40%) -> добор тем ->
# timed mocks. Ссылка — на главный тренажёр csca.app (758 задач, бесплатно).
CSCA_APP = "https://csca.app"

CSCA_PROGRAM = [
    # (Заголовок блока, конкретное задание, оценка минут)
    ("Разведка: placement-тест",
     "Пройди placement-тест на csca.app — понять текущий уровень. Незнакомые "
     "слова выписывай в отдельный файл.", 45),
    ("Словарь: General + Functions",
     "Разделы словаря General terms и Functions. Не зубрить — прочитать вдумчиво, "
     "потом 10 задач на csca.app и сверяться.", 40),
    ("Словарь: тригонометрия + последовательности",
     "Разделы Trigonometry и Sequences. Прочитай, затем 10 смешанных задач.", 40),
    ("Functions: область определения (domain)",
     "Модуль Functions — домен логарифмических и дробных функций. 12-15 задач "
     "на csca.app, фильтр Functions.", 45),
    ("Functions: чётность и монотонность",
     "Parity (even/odd) и монотонность на интервалах — стандартные вопросы теста. "
     "12-15 задач.", 40),
    ("Functions: значения тригонометрии",
     "sin/cos/tan стандартных углов, единичная окружность. Формулы sin²+cos²=1, "
     "sin(2θ)=2sinθcosθ — на память. 15 задач.", 45),
    ("Functions: прогрессии",
     "Арифм. aₙ=a₁+(n−1)d, Sₙ=n(a₁+aₙ)/2; геом. aₙ=a₁·qⁿ⁻¹. 15 задач на "
     "общий член и сумму.", 45),
    ("Functions: смешанный блок",
     "Полный прогон модуля Functions вперемешку — 20 задач. Ошибки в mistake log.", 50),
    ("Geometry: прямая и расстояние",
     "Уравнение прямой y−y₀=k(x−x₀), slope, расстояние d=√((x₂−x₁)²+(y₂−y₁)²). "
     "15 задач.", 45),
    ("Geometry: окружность и касательная",
     "(x−a)²+(y−b)²=r², касательная к окружности. 15 задач, фильтр Geometry.", 45),
    ("Geometry: эллипс и гипербола",
     "x²/a²+y²/b²=1, фокусы, e=c/a; гипербола и асимптоты y=±(b/a)x. 15 задач.", 50),
    ("Geometry: векторы",
     "Скалярное произведение →a·→b=a₁b₁+a₂b₂, угол между векторами. 12 задач.", 40),
    ("Geometry: комплексные числа",
     "z=a+bi, модуль |z|=√(a²+b²), сопряжённое. 12 задач.", 40),
    ("Geometry: смешанный блок",
     "Полный прогон модуля Geometry & Algebra — 20 задач. Redo ошибок с нуля.", 50),
    ("Добор: множества и неравенства",
     "A∪B, A∩B, дополнение; квадратичные неравенства (вне/между корнями). "
     "Дешёвые баллы. 12 задач.", 35),
    ("Добор: вероятность и статистика",
     "P(A)=благоприятные/все, P(A∪B)=P(A)+P(B)−P(A∩B), среднее и дисперсия. "
     "12 задач.", 35),
    ("Mistake log: разбор ошибок",
     "Открой свой mistake log, перерешай каждую ошибку с нуля, без подсказок. "
     "Пока не выйдет сам.", 40),
    ("Timed mock: половина теста",
     "24 вопроса за 30 минут по таймеру — тренируем скорость (1 мин 15 сек/вопрос). "
     "Потом разбор.", 45),
    ("Timed mock: полный экзамен",
     "Полный mock: 48 вопросов, 60 минут, таймер. После — разбор всех ошибок, "
     "redo с нуля.", 75),
]

# Дополнительные ресурсы CSCA (для команды /csca и отчётов).
CSCA_RESOURCES = [
    ("csca.app", "https://csca.app", "758 задач, интерактивные пробники, бесплатно"),
    ("crosslineedu.com", "https://crosslineedu.com", "разборы программы, free mock exams"),
    ("cucas.cn/csca", "https://www.cucas.cn/csca", "документы, программа, отзывы"),
]


# --- Пробник ЕГЭ ------------------------------------------------------------
# Раз в неделю — полный timed вариант. Ссылки на банки вариантов.
EGE_VARIANTS = [
    ("Профильный вариант (случайный)", "https://ege.sdamgia.ru/test?a=catgen"),
    ("Досрочный вариант ФИПИ", "https://mathb-ege.sdamgia.ru/"),
    ("Вариант из открытого банка ФИПИ", "https://fipi.ru/ege/otkrytyy-bank-zadaniy-ege"),
]
EGE_HUB = "https://ege.sdamgia.ru"


def six_min_task(index: int):
    """Возвращает (номер_выпуска, заголовок, ссылка, минуты) для 6min."""
    ep = SIX_MIN_EPISODES[index % len(SIX_MIN_EPISODES)]
    number = 142 + index  # сквозная нумерация «как у BBC», просто для вида
    return number, ep[0], ep[1], 10


def csca_task(index: int):
    """Возвращает (номер_блока, заголовок, задание, ссылка, минуты) для CSCA.

    Последний блок (полный mock) повторяется бесконечно после конца программы.
    """
    if index < len(CSCA_PROGRAM):
        title, task, minutes = CSCA_PROGRAM[index]
        block_no = index + 1
    else:
        title, task, minutes = CSCA_PROGRAM[-1]
        block_no = len(CSCA_PROGRAM) + (index - len(CSCA_PROGRAM) + 1)
    return block_no, title, task, CSCA_APP, minutes


def ege_task(index: int):
    """Возвращает (заголовок, ссылка, минуты) для ЕГЭ."""
    title, link = EGE_VARIANTS[index % len(EGE_VARIANTS)]
    return title, link, 120


def program_length(track_id: str) -> int:
    if track_id == TRACK_6MIN:
        return len(SIX_MIN_EPISODES)
    if track_id == TRACK_CSCA:
        return len(CSCA_PROGRAM)
    if track_id == TRACK_EGE:
        return len(EGE_VARIANTS)
    return 0
