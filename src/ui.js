// Общие элементы интерфейса (инлайн-клавиатуры).

// Ряд кнопок «✅ Выполнено» — по одной на задачу. callback_data: "done:<id>".
export function taskKeyboard(tasks) {
  if (!tasks || !tasks.length) return { inline_keyboard: [] };
  const rows = tasks.slice(0, 20).map((t) => {
    const title = t.title.length > 40 ? t.title.slice(0, 38) + "…" : t.title;
    return [{ text: `✅ ${title}`, callback_data: `done:${t.id}` }];
  });
  return { inline_keyboard: rows };
}
