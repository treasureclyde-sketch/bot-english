# Деплой через браузер (без терминала)

Если не хочешь ставить Node/wrangler — весь бот собран в один файл
[`dist/worker.bundle.js`](dist/worker.bundle.js). Всё делается кликами в
панели Cloudflare.

## 1. Вставить код

1. Открой свой воркер в дашборде → редактор кода (там, где `worker.js`).
2. Скопируй **весь** файл `dist/worker.bundle.js` (на GitHub — кнопка «Copy raw file»).
3. В редакторе выдели всё (Ctrl/Cmd+A), удали, вставь скопированное.
4. Нажми **Deploy**.

## 2. Создать базу D1

1. В левом меню Cloudflare: **Storage & Databases → D1 SQL Database → Create**.
2. Имя: `learning-bot-db`. Создать.
3. Открой базу → вкладка **Console** → вставь содержимое файла
   [`schema.sql`](schema.sql) целиком → **Execute**. Появятся таблицы.

## 3. Привязать базу к воркеру

1. Твой воркер → **Settings → Bindings → Add → D1 database**.
2. Variable name: `DB` (ровно так, заглавными).
3. D1 database: выбери `learning-bot-db`. Сохрани.

## 4. Задать переменные и секреты

Воркер → **Settings → Variables and Secrets → Add**:

| Имя | Тип | Значение |
|-----|-----|----------|
| `OWNER_ID` | Plaintext | `8453492110` |
| `BOT_TOKEN` | Secret | токен от @BotFather |
| `WEBHOOK_SECRET` | Secret | любая своя случайная строка (20+ символов) |

Сохрани.

## 5. Включить крон (раз в минуту)

Воркер → **Settings → Triggers → Cron Triggers → Add Cron Trigger** →
впиши `* * * * *` → Add.

## 6. Передеплоить

Вернись в редактор кода → **Deploy** ещё раз (чтобы подхватились база,
секреты и крон).

## 7. Привязать webhook

Открой в браузере (подставь адрес своего воркера и тот самый `WEBHOOK_SECRET`):

```
https://<твой-воркер>.workers.dev/register?secret=ТВОЙ_WEBHOOK_SECRET
```

Должно ответить `"ok":true`.

## 8. Проверить

Напиши боту в Telegram `/start`. Готово — дальше он сам присылает напоминания
по расписанию.

---

**Обновление потом:** правишь код в редакторе (или пересобираешь бандл) → Deploy.
Базу и настройки заново трогать не нужно.

**Логи:** воркер → Logs (или вкладка Real-time logs) — видно каждый заход крона
и webhook.
