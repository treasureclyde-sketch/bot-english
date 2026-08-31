# Learning Bot — версия для Cloudflare Workers

Тот же бот, что и Python-версия в корне репозитория, но переписан под
**Cloudflare Workers**: webhook вместо long polling, **Cron Trigger раз в минуту**
вместо постоянного процесса, **D1** (SQLite) вместо локального файла.

Плюсы: бесплатно навсегда, всегда онлайн, свой сервер держать не надо.

Функционал полностью сохранён: 3 трека, кнопки Готово/Позже/Пропустить, перенос
+2ч/завтра, правило воскресенья, детекция 2 пропусков подряд, недельный и
месячный отчёты, стрик, пауза, адаптивное снижение частоты.

---

## Что нужно один раз

1. **Аккаунт Cloudflare** — бесплатный, https://dash.cloudflare.com/sign-up
2. **Node.js** на своём компьютере (только чтобы задеплоить), https://nodejs.org
3. **Токен бота** от [@BotFather](https://t.me/BotFather)
4. **Свой user_id** от [@userinfobot](https://t.me/userinfobot) — у тебя это `8453492110`

---

## Деплой по шагам

Все команды — из папки `worker/`.

### 1. Установить зависимости и войти в Cloudflare

```bash
cd worker
npm install
npx wrangler login          # откроется браузер, разреши доступ
```

### 2. Создать базу D1

```bash
npx wrangler d1 create learning-bot-db
```

Команда выведет строчку вида:

```
[[d1_databases]]
binding = "DB"
database_name = "learning-bot-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Скопируй `database_id` и вставь его в `wrangler.toml` вместо
`REPLACE_WITH_D1_DATABASE_ID`.

### 3. Создать таблицы

```bash
npm run db:init            # это wrangler d1 execute ... --remote --file=schema.sql
```

### 4. Прописать свой Telegram ID

Открой `wrangler.toml` и поставь свой id:

```toml
[vars]
OWNER_ID = "8453492110"
```

### 5. Задать секреты

`BOT_TOKEN` — токен от BotFather. `WEBHOOK_SECRET` — любая случайная строка,
которую придумаешь сам (например, 20+ символов букв/цифр). Она защищает webhook,
чтобы никто, кроме Telegram, не мог дёргать бота.

```bash
npx wrangler secret put BOT_TOKEN
# вставь токен, Enter

npx wrangler secret put WEBHOOK_SECRET
# вставь свою случайную строку, Enter
```

### 6. Задеплоить

```bash
npm run deploy
```

Wrangler выведет адрес воркера, например:
`https://learning-bot.<твой-субдомен>.workers.dev`

### 7. Привязать webhook

Открой в браузере (подставь свой адрес и тот самый WEBHOOK_SECRET):

```
https://learning-bot.<твой-субдомен>.workers.dev/register?secret=ТВОЙ_WEBHOOK_SECRET
```

Должен увидеть `"ok":true`. Всё — webhook привязан, команды бота
зарегистрированы.

### 8. Проверить

Напиши боту в Telegram `/start`. Дальше он сам будет присылать напоминания по
расписанию (крон раз в минуту решает, что пора).

---

## Настройка после запуска

- `/tracks` — включить/выключить трек, сдвинуть время кнопками.
- `/pause 3` — тишина на 3 дня.
- `/tz Asia/Yekaterinburg` — часовой пояс (по умолчанию уже Уфа/UTC+5).
- `/report` — недельный отчёт по запросу.

Расписание по умолчанию: 6min каждый день 08:00, CSCA раз в 2 дня 19:00,
ЕГЭ по субботам 10:00. Воскресенье — выходной.

---

## Обновление кода потом

Поменял что-то → снова `npm run deploy`. Webhook и база остаются на месте,
повторно `/register` дёргать не нужно (только если сменил адрес воркера).

## Полезное

- Логи в реальном времени: `npx wrangler tail`
- Посмотреть базу: `npx wrangler d1 execute learning-bot-db --remote --command "SELECT * FROM history ORDER BY id DESC LIMIT 10"`
- Локальный прогон логики (без Cloudflare): `node tests/test_logic.mjs` и
  `node --experimental-sqlite tests/test_engine.mjs`

## Лимиты бесплатного плана

Крон раз в минуту = ~43 800 запусков в месяц, плюс webhook-вызовы. Бесплатный
план Workers — 100 000 запросов в день, D1 — 5 млн строк чтения в день. Для
личного бота запас огромный, упереться невозможно.
