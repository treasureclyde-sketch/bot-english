# Деплой ассистента на Cloudflare Workers

Всё бесплатно (в пределах free-tier Cloudflare) и всегда онлайн. Понадобится
~15 минут.

## 0. Что подготовить заранее

1. **Токен бота.** [@BotFather](https://t.me/BotFather) → `/newbot` → скопируй токен.
2. **Свой user_id.** [@userinfobot](https://t.me/userinfobot) → пришлёт число.
3. **API-ключ Anthropic.** [console.anthropic.com](https://console.anthropic.com)
   → Billing → закинь $5 → API keys → создай ключ (`sk-ant-...`).
   Подписка Claude Pro для этого **не нужна** — это отдельная оплата по токенам.
4. **Случайная строка** для `WEBHOOK_SECRET` (любые 20+ символов).

## 1. Установка инструментов

```bash
npm install
npx wrangler login      # откроет браузер, авторизуйся в Cloudflare
```

## 2. Создать базу D1

```bash
npx wrangler d1 create assistant-db
```

Команда напечатает `database_id = "..."`. Впиши его в `wrangler.toml` вместо
`REPLACE_WITH_YOUR_D1_ID`. Затем создай таблицы:

```bash
npm run db:init
```

## 3. Задать секреты

```bash
npx wrangler secret put BOT_TOKEN          # токен от BotFather
npx wrangler secret put OWNER_ID           # твой user_id (число)
npx wrangler secret put WEBHOOK_SECRET     # твоя случайная строка
npx wrangler secret put ANTHROPIC_API_KEY  # ключ sk-ant-...
```

## 4. Задеплоить

```bash
npm run deploy
```

Wrangler напечатает адрес воркера, например `https://assistant-bot.<твой>.workers.dev`.

## 5. Привязать вебхук

Один раз открой в браузере (подставь свой адрес и секрет):

```
https://assistant-bot.<твой>.workers.dev/register?secret=<WEBHOOK_SECRET>
```

Должно ответить `"ok":true`. Крон (раз в минуту) уже включён из `wrangler.toml`.

## 6. Готово

Напиши боту `/start` и дальше просто общайся текстом.

---

## Обновления

Поменял код → снова `npm run deploy`. Вебхук и база остаются на месте.

## Часовой пояс

По умолчанию `Asia/Yekaterinburg` (UTC+5). Сменить: `/tz Europe/Moscow` и т.п.

## Если что-то не так

- Бот молчит на команды → проверь, что шаг 5 вернул `ok`, и что `OWNER_ID` — это
  именно твой id.
- «Упс, не смог обработать» на свободный текст → скорее всего кончились кредиты
  Anthropic или неверный `ANTHROPIC_API_KEY`; логи: `npx wrangler tail`.
- Напоминания не приходят → проверь `/tz`, и что крон-триггер включён (вкладка
  Triggers у воркера в дашборде Cloudflare).
