// Инструменты, которые Claude вызывает, чтобы что-то запомнить/показать/напомнить.
// Определения (JSON-схема) + исполнение поверх db.

import * as db from "./db.js";
import { parseLocal, nextRecurring, fmtLocal } from "./time.js";

export const TOOLS = [
  {
    name: "add_note",
    description: "Сохранить заметку — любой факт/мысль, которую пользователь просит запомнить " +
      "(не задача с дедлайном). Возвращай короткое подтверждение.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Текст заметки" },
        tags: { type: "string", description: "Теги через запятую, опционально" },
      },
      required: ["text"],
    },
  },
  {
    name: "search_notes",
    description: "Найти заметки по подстроке (или последние, если query пустой).",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Что искать; пусто = последние" } },
    },
  },
  {
    name: "delete_note",
    description: "Удалить заметку по id.",
    input_schema: {
      type: "object",
      properties: { id: { type: "integer" } },
      required: ["id"],
    },
  },
  {
    name: "add_task",
    description: "Завести задачу или домашку. due — локальная дата/время в формате " +
      "'YYYY-MM-DD' или 'YYYY-MM-DDTHH:MM' (посчитай от текущего времени, оно дано в системном " +
      "промпте). Если срок не назван — не придумывай, оставь пустым.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        subject: { type: "string", description: "Предмет/категория, опционально" },
        due: { type: "string", description: "Дедлайн 'YYYY-MM-DD[THH:MM]', опционально" },
      },
      required: ["title"],
    },
  },
  {
    name: "list_tasks",
    description: "Показать задачи. status: open (по умолчанию), done или all.",
    input_schema: {
      type: "object",
      properties: { status: { type: "string", enum: ["open", "done", "all"] } },
    },
  },
  {
    name: "complete_task",
    description: "Отметить задачу выполненной по id (id открытых задач даны в системном промпте).",
    input_schema: {
      type: "object",
      properties: { id: { type: "integer" } },
      required: ["id"],
    },
  },
  {
    name: "delete_task",
    description: "Удалить задачу по id.",
    input_schema: {
      type: "object",
      properties: { id: { type: "integer" } },
      required: ["id"],
    },
  },
  {
    name: "add_reminder",
    description: "Поставить напоминание. Разовое: заполни 'at' локальным временем " +
      "'YYYY-MM-DDTHH:MM'. Повторяющееся: заполни 'recurrence' вместо 'at'. " +
      "time — 'HH:MM'; weekday 0=Пн..6=Вс (нужен для weekly).",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "О чём напомнить" },
        at: { type: "string", description: "Разовое: 'YYYY-MM-DDTHH:MM' локально" },
        recurrence: {
          type: "object",
          properties: {
            cadence: { type: "string", enum: ["daily", "every_n_days", "weekly"] },
            n_days: { type: "integer" },
            weekday: { type: "integer" },
            time: { type: "string", description: "'HH:MM'" },
          },
          required: ["cadence", "time"],
        },
      },
      required: ["text"],
    },
  },
  {
    name: "list_reminders",
    description: "Показать активные напоминания.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "cancel_reminder",
    description: "Отменить (деактивировать) напоминание по id.",
    input_schema: {
      type: "object",
      properties: { id: { type: "integer" } },
      required: ["id"],
    },
  },
];

function taskLine(t, tz) {
  const due = t.due_at ? ` (до ${fmtLocal(t.due_at, tz)})` : "";
  const subj = t.subject ? ` [${t.subject}]` : "";
  return `#${t.id} ${t.title}${subj}${due}`;
}

// Выполнить инструмент. Возвращает короткую строку-результат для модели.
export async function executeTool(env, userId, tz, name, input) {
  input = input || {};
  try {
    switch (name) {
      case "add_note": {
        const id = await db.addNote(env, userId, input.text, input.tags);
        return `OK: заметка сохранена (#${id}).`;
      }
      case "search_notes": {
        const rows = await db.searchNotes(env, userId, input.query || "");
        if (!rows.length) return "Заметок не найдено.";
        return rows.map((n) => `#${n.id}: ${n.text}${n.tags ? " [" + n.tags + "]" : ""}`).join("\n");
      }
      case "delete_note": {
        const ok = await db.deleteNote(env, userId, input.id);
        return ok ? `OK: заметка #${input.id} удалена.` : `Заметка #${input.id} не найдена.`;
      }
      case "add_task": {
        const dueAt = input.due ? parseLocal(input.due, tz, 9) : null;
        const id = await db.addTask(env, userId, input.title, input.subject, dueAt);
        return `OK: задача #${id} создана${dueAt ? ", до " + fmtLocal(dueAt, tz) : ""}.`;
      }
      case "list_tasks": {
        const rows = await db.listTasks(env, userId, input.status || "open");
        if (!rows.length) return "Задач нет.";
        return rows.map((t) => `${t.status === "done" ? "✅" : "•"} ${taskLine(t, tz)}`).join("\n");
      }
      case "complete_task": {
        const ok = await db.completeTask(env, userId, input.id);
        return ok ? `OK: задача #${input.id} выполнена.` : `Открытая задача #${input.id} не найдена.`;
      }
      case "delete_task": {
        const ok = await db.deleteTask(env, userId, input.id);
        return ok ? `OK: задача #${input.id} удалена.` : `Задача #${input.id} не найдена.`;
      }
      case "add_reminder": {
        if (input.recurrence && input.recurrence.cadence) {
          const rc = input.recurrence;
          const [hh, mm] = String(rc.time || "09:00").split(":").map(Number);
          const rec = { cadence: rc.cadence, n_days: rc.n_days, weekday: rc.weekday, hour: hh || 9, minute: mm || 0 };
          const next = nextRecurring(rec, tz, Date.now() - 1);
          const id = await db.addReminder(env, userId, input.text, "recurring", next, rec);
          return `OK: повторяющееся напоминание #${id}, ближайшее ${fmtLocal(next, tz)}.`;
        }
        const at = parseLocal(input.at, tz, 9);
        if (!at) return "Не понял время. Дай 'at' как 'YYYY-MM-DDTHH:MM' или recurrence.";
        if (at <= Date.now()) return "Это время уже прошло — уточни дату/время.";
        const id = await db.addReminder(env, userId, input.text, "once", at, null);
        return `OK: напомню #${id} — ${fmtLocal(at, tz)}.`;
      }
      case "list_reminders": {
        const rows = await db.listReminders(env, userId);
        if (!rows.length) return "Активных напоминаний нет.";
        return rows.map((r) => {
          const kind = r.kind === "recurring" ? "🔁" : "⏰";
          return `#${r.id} ${kind} ${r.text} — ${fmtLocal(r.next_fire_at, tz)}`;
        }).join("\n");
      }
      case "cancel_reminder": {
        const ok = await db.deactivateReminder(env, userId, input.id);
        return ok ? `OK: напоминание #${input.id} отменено.` : `Напоминание #${input.id} не найдено.`;
      }
      default:
        return `Неизвестный инструмент: ${name}`;
    }
  } catch (e) {
    console.log(`tool ${name} error:`, e && e.stack || e);
    return `Ошибка при выполнении ${name}: ${e && e.message || e}`;
  }
}
