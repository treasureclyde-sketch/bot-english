"""Точка входа. Собирает Application, регистрирует хендлеры и запускает тик.

Запуск:  python bot.py
Нужен .env с BOT_TOKEN и OWNER_ID (см. .env.example).
"""

import logging

from telegram.ext import (Application, CallbackQueryHandler, CommandHandler,
                          ContextTypes)

import config
import handlers
from db import Store
from engine import run_tick

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    level=logging.INFO,
)
logging.getLogger("httpx").setLevel(logging.WARNING)
log = logging.getLogger("bot")


async def _tick_job(context: ContextTypes.DEFAULT_TYPE):
    store = context.application.bot_data["store"]
    await run_tick(context.bot, store)


async def _post_init(app: Application):
    await app.bot.set_my_commands([
        ("start", "запустить / приветствие"),
        ("status", "план на сегодня и стрик"),
        ("tracks", "треки: расписание и вкл/выкл"),
        ("pause", "пауза на N дней"),
        ("resume", "снять паузу"),
        ("report", "недельный отчёт"),
        ("tz", "часовой пояс"),
        ("csca", "ресурсы по математике"),
        ("duo", "про Duolingo Test"),
        ("help", "помощь"),
    ])
    log.info("bot ready")


def main():
    if not config.BOT_TOKEN:
        raise SystemExit("BOT_TOKEN не задан. Скопируй .env.example в .env и заполни.")

    store = Store(config.DB_PATH)

    app = (Application.builder()
           .token(config.BOT_TOKEN)
           .post_init(_post_init)
           .build())
    app.bot_data["store"] = store

    app.add_handler(CommandHandler("start", handlers.cmd_start))
    app.add_handler(CommandHandler("help", handlers.cmd_help))
    app.add_handler(CommandHandler("status", handlers.cmd_status))
    app.add_handler(CommandHandler("tracks", handlers.cmd_tracks))
    app.add_handler(CommandHandler("pause", handlers.cmd_pause))
    app.add_handler(CommandHandler("resume", handlers.cmd_resume))
    app.add_handler(CommandHandler("tz", handlers.cmd_tz))
    app.add_handler(CommandHandler("report", handlers.cmd_report))
    app.add_handler(CommandHandler("csca", handlers.cmd_csca))
    app.add_handler(CommandHandler("duo", handlers.cmd_duo))
    app.add_handler(CallbackQueryHandler(handlers.on_callback))

    # Тик раз в минуту — сердце напоминаний.
    app.job_queue.run_repeating(_tick_job, interval=60, first=10)

    log.info("polling...")
    app.run_polling(allowed_updates=["message", "callback_query"])


if __name__ == "__main__":
    main()
