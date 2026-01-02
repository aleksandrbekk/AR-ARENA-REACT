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
    // ОТКАТ: используем прямой index.html (iframe trick не работает в Telegram)
    const cacheBuster = Date.now();
    let webAppUrl = `https://ar.skillnetwork.pro/index.html?v=${cacheBuster}`;

    if (startParam) {
        // Telegram передает параметр через startapp в URL
        webAppUrl = `https://ar.skillnetwork.pro/index.html?startapp=${startParam}&v=${cacheBuster}`;
        console.log(`Новый пользователь с параметром: ${startParam}`);
        console.log(`URL для WebApp: ${webAppUrl}`);
    }

    // Отправляем приветствие с кнопкой для открытия Mini App
    ctx.reply(
        '🎮 Добро пожаловать в AR ARENA!\n\n' +
        '💰 Получите 100 AR бонус при регистрации\n' +
        '🎯 Зарабатывайте выполняя задания\n' +
        '🏆 Приглашайте друзей:\n' +
        '   • 200 AR за каждого друга (L1)\n' +
        '   • 100 AR за друзей ваших друзей (L2)\n\n' +
        'Нажмите кнопку ниже для запуска:',
        Markup.inlineKeyboard([
            Markup.button.webApp('🎮 Открыть AR ARENA', webAppUrl)
        ])
    );
});

// Обработка любых других команд
bot.on('text', (ctx) => {
    const cacheBuster = Date.now();
    ctx.reply(
        'Используйте команду /start для начала работы с AR ARENA',
        Markup.inlineKeyboard([
            Markup.button.webApp('🎮 Открыть AR ARENA', `https://ar.skillnetwork.pro/index.html?v=${cacheBuster}`)
        ])
    );
});

// Обработка ошибок
bot.catch((err, ctx) => {
    console.error('[ERROR]', err);
});

// Запуск бота
(async () => {
    try {
        // Удаляем webhook если был установлен
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        console.log('✅ Webhook удалён, pending updates очищены');

        // Запускаем polling
        await bot.launch({
            dropPendingUpdates: true,
            allowedUpdates: ['message', 'callback_query']
        });

        console.log('✅ Бот AR ARENA запущен!');
        console.log('Режим: Long Polling');
        console.log('Время запуска:', new Date().toISOString());
    } catch (error) {
        console.error('❌ Ошибка запуска:', error);
        process.exit(1);
    }
})();

// Корректная остановка
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));