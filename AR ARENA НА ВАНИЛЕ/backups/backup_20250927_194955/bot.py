#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Бот AR ARENA для поддержки реферальной системы
"""

import logging
import sys

# Проверяем наличие необходимых библиотек
try:
    from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo, Update
    from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters
except ImportError:
    print("\n⚠️  Установите python-telegram-bot:")
    print("pip3 install python-telegram-bot")
    print("или")
    print("pip install python-telegram-bot\n")
    sys.exit(1)

# Токен бота
BOT_TOKEN = '8265126337:AAHBKYlU6fQA09nkJwsMaBQtP16CXSq1Cnc'

# Включаем логирование
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка команды /start с поддержкой реферальных ссылок"""

    # Получаем параметр из команды /start
    args = context.args
    start_param = args[0] if args else None

    # Базовый URL для Mini App
    web_app_url = 'https://ar.skillnetwork.pro/'

    # Если есть реферальный параметр, добавляем его в URL через HASH
    if start_param:
        # ВАЖНО: Передаем через хеш - это работает в Telegram!
        web_app_url = f'https://ar.skillnetwork.pro/#{start_param}'
        logger.info(f'Новый пользователь с параметром: {start_param}')
        logger.info(f'URL для WebApp: {web_app_url}')

    # Создаем кнопку для открытия Mini App
    keyboard = [[
        InlineKeyboardButton(
            "🎮 Открыть AR ARENA",
            web_app=WebAppInfo(url=web_app_url)
        )
    ]]

    reply_markup = InlineKeyboardMarkup(keyboard)

    # Отправляем приветствие
    await update.message.reply_text(
        '🎮 Добро пожаловать в AR ARENA!\n\n'
        '💰 Получите 50 AR бонус при регистрации\n'
        '🎯 Зарабатывайте выполняя задания\n'
        '🏆 Приглашайте друзей и получайте 100 AR за каждого\n\n'
        'Нажмите кнопку ниже для запуска:',
        reply_markup=reply_markup
    )


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка любых текстовых сообщений"""

    keyboard = [[
        InlineKeyboardButton(
            "🎮 Открыть AR ARENA",
            web_app=WebAppInfo(url='https://ar.skillnetwork.pro/')
        )
    ]]

    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        'Используйте команду /start для начала работы с AR ARENA',
        reply_markup=reply_markup
    )


def main():
    """Запуск бота"""

    print('✅ Запуск бота AR ARENA...')
    print('Бот готов к работе!')
    print('Для остановки нажмите Ctrl+C\n')

    # Создаем приложение
    application = Application.builder().token(BOT_TOKEN).build()

    # Добавляем обработчики
    application.add_handler(CommandHandler('start', start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    # Запускаем бота
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()