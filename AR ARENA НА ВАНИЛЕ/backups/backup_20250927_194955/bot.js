// Простой бот для AR ARENA с поддержкой реферальных ссылок
const { Telegraf, Markup } = require('telegraf');

// Токен бота @ARARENA_BOT
const BOT_TOKEN = '8265126337:AAHBKYlU6fQA09nkJwsMaBQtP16CXSq1Cnc';

const bot = new Telegraf(BOT_TOKEN);

// Обработка команды /start
bot.start((ctx) => {
    // Получаем реферальный параметр из команды /start
    const startParam = ctx.message.text.split(' ')[1] || '';

    // Формируем URL для Mini App
    // Если есть параметр - добавляем его в URL как startapp
    let webAppUrl = 'https://ar.skillnetwork.pro/';

    if (startParam) {
        // Telegram передает параметр через startapp в URL
        webAppUrl = `https://ar.skillnetwork.pro/?startapp=${startParam}`;
        console.log(`Новый пользователь с параметром: ${startParam}`);
        console.log(`URL для WebApp: ${webAppUrl}`);
    }

    // Отправляем приветствие с кнопкой для открытия Mini App
    ctx.reply(
        '🎮 Добро пожаловать в AR ARENA!\n\n' +
        '💰 Получите 50 AR бонус при регистрации\n' +
        '🎯 Зарабатывайте выполняя задания\n' +
        '🏆 Приглашайте друзей и получайте 100 AR за каждого\n\n' +
        'Нажмите кнопку ниже для запуска:',
        Markup.inlineKeyboard([
            Markup.button.webApp('🎮 Открыть AR ARENA', webAppUrl)
        ])
    );
});

// Обработка любых других команд
bot.on('text', (ctx) => {
    ctx.reply(
        'Используйте команду /start для начала работы с AR ARENA',
        Markup.inlineKeyboard([
            Markup.button.webApp('🎮 Открыть AR ARENA', 'https://ar.skillnetwork.pro/')
        ])
    );
});

// Запуск бота
bot.launch().then(() => {
    console.log('✅ Бот AR ARENA запущен!');
    console.log('Ожидание сообщений...');
});

// Корректная остановка
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));