// Слой 3: сборка текста напоминания и клавиатур.
// CSCA — подробный урок (EN -> RU -> практика), шлётся БЕЗ Markdown (математика
// со знаками ^, _, *), при необходимости бьётся на несколько сообщений.

import { TRACK_6MIN, TRACK_EGE, TRACK_CSCA, TRACK_DET, TRACK_TITLES } from "./config.js";
import { sixMinTask, cscaTask, egeTask, detTask } from "./content.js";

const CHUNK_LIMIT = 3500;

export function splitChunks(text, limit = CHUNK_LIMIT) {
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
export function buildReminder(trackId, contentIndex) {
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

export function actionKeyboard(hid, link, label = "Открыть") {
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

export function laterKeyboard(hid) {
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

export function buildSkipQuestion(trackId, hid) {
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

export function whyResponse(trackId, reason) {
  const title = TRACK_TITLES[trackId];
  if (reason === "hard")
    return `Понял. Сделаем *${title}* легче: бери половину задания и просто отметь «Готово». Полдела — уже дело. В следующий раз пришлю как обычно.`;
  if (reason === "notime")
    return `Ок, времени нет. Могу сдвинуть *${title}* на другое время или сделать реже. Напиши /tracks — там поменяем расписание за 10 секунд.`;
  if (reason === "bored")
    return `Формат приелся — нормально. По *${title}* переключу на следующий блок программы, будет другое. Дам передышку на пару дней.`;
  return "Принял.";
}
