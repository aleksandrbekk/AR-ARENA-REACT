# Настройка бота @ARARENA_BOT для реферальной системы

## Вариант 1: Python (python-telegram-bot)

```python
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes

async def start(update, context):
    # Получаем параметр ref_XXXXXX из команды /start
    args = context.args
    start_param = args[0] if args else None

    # Формируем URL для Mini App с передачей параметра
    if start_param and start_param.startswith('ref_'):
        # ВАЖНО: передаем параметр в Mini App через hash
        web_app_url = f"https://ar.skillnetwork.pro/#tgWebAppStartParam={start_param}"
    else:
        web_app_url = "https://ar.skillnetwork.pro/"

    # Создаем кнопку для открытия Mini App
    keyboard = [[
        InlineKeyboardButton(
            "🎮 Открыть AR ARENA",
            web_app=WebAppInfo(url=web_app_url)
        )
    ]]

    reply_markup = InlineKeyboardMarkup(keyboard)

    # Отправляем приветствие с кнопкой
    await update.message.reply_text(
        "🎮 Добро пожаловать в AR ARENA!\n\n"
        "💰 Получите 50 AR бонус при регистрации\n"
        "🎯 Выполняйте задания и зарабатывайте\n\n"
        "Нажмите кнопку ниже для запуска:",
        reply_markup=reply_markup
    )

# Инициализация бота
def main():
    application = Application.builder().token("YOUR_BOT_TOKEN").build()
    application.add_handler(CommandHandler("start", start))
    application.run_polling()

if __name__ == '__main__':
    main()
```

## Вариант 2: Python (aiogram 3.x)

```python
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart, CommandObject
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

bot = Bot(token="YOUR_BOT_TOKEN")
dp = Dispatcher()

@dp.message(CommandStart())
async def start_command(message: types.Message, command: CommandObject):
    # Получаем параметр из команды /start
    start_param = command.args if command.args else None

    # Формируем URL с параметром
    if start_param and start_param.startswith('ref_'):
        web_app_url = f"https://ar.skillnetwork.pro/#tgWebAppStartParam={start_param}"
    else:
        web_app_url = "https://ar.skillnetwork.pro/"

    # Кнопка для Mini App
    webapp_button = InlineKeyboardButton(
        text="🎮 Открыть AR ARENA",
        web_app=WebAppInfo(url=web_app_url)
    )

    keyboard = InlineKeyboardMarkup(inline_keyboard=[[webapp_button]])

    await message.answer(
        "🎮 Добро пожаловать в AR ARENA!\n\n"
        "💰 Получите 50 AR бонус при регистрации\n"
        "🎯 Выполняйте задания и зарабатывайте\n\n"
        "Нажмите кнопку ниже для запуска:",
        reply_markup=keyboard
    )

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

## Вариант 3: Node.js (telegraf)

```javascript
const { Telegraf, Markup } = require('telegraf')

const bot = new Telegraf('YOUR_BOT_TOKEN')

bot.start((ctx) => {
    // Получаем параметр из команды /start
    const startParam = ctx.message.text.split(' ')[1] || ''

    // Формируем URL с параметром
    let webAppUrl = 'https://ar.skillnetwork.pro/'
    if (startParam && startParam.startsWith('ref_')) {
        webAppUrl = `https://ar.skillnetwork.pro/#tgWebAppStartParam=${startParam}`
    }

    // Отправляем сообщение с кнопкой Web App
    ctx.reply(
        '🎮 Добро пожаловать в AR ARENA!\n\n' +
        '💰 Получите 50 AR бонус при регистрации\n' +
        '🎯 Выполняйте задания и зарабатывайте\n\n' +
        'Нажмите кнопку ниже для запуска:',
        Markup.inlineKeyboard([
            Markup.button.webApp('🎮 Открыть AR ARENA', webAppUrl)
        ])
    )
})

bot.launch()
```

## Вариант 4: Node.js (node-telegram-bot-api)

```javascript
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot('YOUR_BOT_TOKEN', {polling: true});

bot.onText(/\/start(.*)/, (msg, match) => {
    const chatId = msg.chat.id;
    const startParam = match[1] ? match[1].trim() : '';

    // Формируем URL с параметром
    let webAppUrl = 'https://ar.skillnetwork.pro/';
    if (startParam && startParam.startsWith('ref_')) {
        webAppUrl = `https://ar.skillnetwork.pro/#tgWebAppStartParam=${startParam}`;
    }

    // Отправляем кнопку Web App
    bot.sendMessage(chatId,
        '🎮 Добро пожаловать в AR ARENA!\n\n' +
        '💰 Получите 50 AR бонус при регистрации\n' +
        '🎯 Выполняйте задания и зарабатывайте\n\n' +
        'Нажмите кнопку ниже для запуска:',
        {
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: '🎮 Открыть AR ARENA',
                        web_app: { url: webAppUrl }
                    }
                ]]
            }
        }
    );
});
```

## ВАЖНО! Ключевые моменты:

1. **Параметр должен передаваться в URL Mini App**:
   - Неправильно: `https://ar.skillnetwork.pro/`
   - Правильно: `https://ar.skillnetwork.pro/#tgWebAppStartParam=ref_123456`

2. **Формат параметра**: `ref_TELEGRAM_ID`
   - Пример: `ref_190202791`

3. **Проверка работы**:
   - Отправьте боту: `/start ref_190202791`
   - Бот должен открыть Mini App с URL: `https://ar.skillnetwork.pro/#tgWebAppStartParam=ref_190202791`
   - В Mini App параметр будет доступен

## Тестирование:

1. Обновите код бота с одним из вариантов выше
2. Перезапустите бота
3. Отправьте команду: `/start ref_TEST`
4. Нажмите кнопку "Открыть AR ARENA"
5. В Mini App должен появиться параметр

## Если не работает:

Проверьте в консоли браузера (F12):
```javascript
console.log(window.Telegram.WebApp.initDataUnsafe.start_param)
// Должно вывести: ref_TEST
```