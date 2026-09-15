"""Слой 3: контент напоминания.

Собирает конкретный текст напоминания и три кнопки действия. Каждое
напоминание = задание + прямая ссылка + оценка времени + [Готово][Позже][Пропустить].

CSCA присылается как ПОДРОБНЫЙ урок: сначала на английском, потом на русском,
потом практика. Текст урока математический (со знаками ^, _, *, /), поэтому
идёт БЕЗ Markdown, чтобы Telegram не поломал разметку. Длинный урок бьётся на
несколько сообщений — клавиатура вешается на последнее.
"""

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

import config
import content

# Практический лимит длины сообщения Telegram — 4096. Держим запас.
CHUNK_LIMIT = 3500


def split_chunks(text: str, limit: int = CHUNK_LIMIT):
    """Бьёт длинный текст на части по границам абзацев (не рвёт абзац)."""
    paras = text.split("\n\n")
    chunks, cur = [], ""
    for p in paras:
        piece = (("\n\n" + p) if cur else p)
        if len(cur) + len(piece) <= limit:
            cur += piece
        else:
            if cur:
                chunks.append(cur)
            # Абзац сам по себе длиннее лимита — режем жёстко.
            while len(p) > limit:
                chunks.append(p[:limit])
                p = p[limit:]
            cur = p
    if cur:
        chunks.append(cur)
    return chunks or [text]


def build_reminder(track_id: str, content_index: int):
    """Возвращает dict: chunks (list[str]), link, title, minutes, markdown (bool).

    markdown=False означает «слать без parse_mode» (для математических уроков).
    """
    if track_id == config.TRACK_6MIN:
        number, title, link, minutes = content.six_min_task(content_index)
        text = (
            f"🎧 *6 Minute English #{number}*\n"
            f"«{title}»\n\n"
            f"Послушать + разобрать словарь. ~{minutes} мин."
        )
        return {"chunks": [text], "link": link, "title": title,
                "minutes": minutes, "markdown": True}

    if track_id == config.TRACK_DET:
        number, title, desc, tip, link, minutes = content.det_task(content_index)
        text = (
            f"🦉 *Duolingo Test #{number}*\n"
            f"*{title}*\n\n"
            f"{desc}\n\n"
            f"💡 {tip}\n\n"
            f"~{minutes} мин. Практика — по кнопке ниже."
        )
        return {"chunks": [text], "link": link, "title": title,
                "minutes": minutes, "markdown": True}

    if track_id == config.TRACK_CSCA:
        block_no, title, body, link, minutes = content.csca_task(content_index)
        total = len(content.CSCA_LESSONS)
        full = (
            f"📐 CSCA Math · тема {block_no}/{total} (~{minutes} мин)\n"
            f"{title}\n\n"
            f"{body}"
        )
        return {"chunks": split_chunks(full), "link": link, "title": title,
                "minutes": minutes, "markdown": False}

    if track_id == config.TRACK_EGE:
        title, link, minutes = content.ege_task(content_index)
        text = (
            f"🧮 *Пробник ЕГЭ (профиль)*\n"
            f"{title}\n\n"
            f"Полный вариант по таймеру, ~{minutes} мин. "
            f"После — разбор ошибок."
        )
        return {"chunks": [text], "link": link, "title": title,
                "minutes": minutes, "markdown": True}

    return {"chunks": ["Напоминание"], "link": "", "title": "task",
            "minutes": 0, "markdown": True}


def action_keyboard(hid: int, link: str, link_label="Открыть"):
    """Кнопки: ссылка + Готово / Позже / Пропустить.

    'Позже' раскрывается в под-меню (+2ч / завтра) через отдельный callback.
    """
    return InlineKeyboardMarkup([
        [InlineKeyboardButton(f"🔗 {link_label}", url=link)],
        [
            InlineKeyboardButton("✅ Готово", callback_data=f"done:{hid}"),
            InlineKeyboardButton("🕑 Позже", callback_data=f"later:{hid}"),
            InlineKeyboardButton("⏭ Пропустить", callback_data=f"skip:{hid}"),
        ],
    ])


def later_keyboard(hid: int):
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("+2 часа", callback_data=f"post2h:{hid}"),
            InlineKeyboardButton("Завтра", callback_data=f"posttom:{hid}"),
        ],
        [InlineKeyboardButton("« назад", callback_data=f"back:{hid}")],
    ])


def build_skip_question(track_id: str, hid: int):
    """Правило пропусков: после 2 пропусков подряд — не напоминание, а вопрос."""
    title = config.TRACK_TITLES[track_id]
    text = (
        f"🤔 *{title}* не идёт уже 2 раза подряд.\n"
        f"Что случилось?"
    )
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("😮‍💨 Тяжело", callback_data=f"why:{hid}:hard")],
        [InlineKeyboardButton("⏳ Нет времени", callback_data=f"why:{hid}:notime")],
        [InlineKeyboardButton("😐 Надоел формат", callback_data=f"why:{hid}:bored")],
    ])
    return text, kb


def why_response(track_id: str, reason: str):
    """Ответ бота на причину пропусков + предложение по адаптации."""
    title = config.TRACK_TITLES[track_id]
    if reason == "hard":
        return (
            f"Понял. Сделаем *{title}* легче: бери половину задания и просто "
            f"отметь «Готово». Полдела — уже дело. В следующий раз пришлю как обычно."
        )
    if reason == "notime":
        return (
            f"Ок, времени нет. Могу сдвинуть *{title}* на другое время или сделать "
            f"реже. Напиши /tracks — там поменяем расписание за 10 секунд."
        )
    if reason == "bored":
        return (
            f"Формат приелся — нормально. По *{title}* переключу на следующий блок "
            f"программы, будет другое. Дам передышку на пару дней."
        )
    return "Принял."
