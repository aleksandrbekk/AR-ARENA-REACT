// Скрипт для отправки двух тестовых сообщений в Telegram
const BOT_TOKEN = '8265126337:AAGCjyBRX9hBtFeiHZMnAv1UYV5a8PVpUew';
const CHAT_ID = 190202791;
const PRICING_URL = 'https://ararena.pro/pricing';
const IMAGE_URL = 'https://ararena.pro/images/ar_premium_club_welcome.jpg';

// Сообщение 1: Приветствие при первом /start premium
const welcomeCaption = `🏆 <b>Добро пожаловать в Premium AR Club</b>

Закрытое сообщество трейдеров и инвесторов.
9 лет опыта. 82% успешных сделок. 5000+ участников.

<b>Выбери свой уровень доступа:</b>

🖤 CLASSIC — старт в крипте
🥇 GOLD — активный трейдинг
💎 PLATINUM — полный арсенал

👇 Жми по кнопке. Выбирай клубную карту

💬 Служба заботы: @Andrey_cryptoinvestor`;

const welcomeKeyboard = {
    inline_keyboard: [
        [{ text: '🎴 Тарифы', web_app: { url: PRICING_URL } }],
        [{ text: '💬 Поддержка', url: 'https://t.me/Andrey_cryptoinvestor' }]
    ]
};

// Сообщение 2: После оплаты (из lava-premium-webhook.js)
const paymentText = `🎉 <b>Добро пожаловать в Premium AR Club!</b>

Твоя подписка <b>GOLD</b> активирована!

🗓 Действует до: <b>14 февраля 2026</b>

Ты получаешь доступ к закрытым каналам клуба:
• Аналитика и сделки
• Чат трейдеров
• Обучающие материалы

💬 Служба заботы: @Andrey_cryptoinvestor`;

const paymentKeyboard = {
    inline_keyboard: [
        [{ text: '🚀 Открыть клуб', url: 'https://t.me/+abc123' }],
        [{ text: '💬 Поддержка', url: 'https://t.me/Andrey_cryptoinvestor' }]
    ]
};

async function sendWelcome() {
    console.log('📤 Отправляю приветственное сообщение...');
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                photo: IMAGE_URL,
                caption: welcomeCaption,
                parse_mode: 'HTML',
                reply_markup: welcomeKeyboard
            })
        });
        const result = await response.json();
        console.log('Welcome result:', result.ok ? '✅ OK' : '❌ Error:', result.description || '');
        return result;
    } catch (e) {
        console.error('Error:', e.message);
    }
}

async function sendPaymentConfirm() {
    console.log('📤 Отправляю сообщение после оплаты...');
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: paymentText,
                parse_mode: 'HTML',
                reply_markup: paymentKeyboard
            })
        });
        const result = await response.json();
        console.log('Payment result:', result.ok ? '✅ OK' : '❌ Error:', result.description || '');
        return result;
    } catch (e) {
        console.error('Error:', e.message);
    }
}

async function main() {
    console.log('=== Тест сообщений для', CHAT_ID, '===\n');

    // Сообщение 1
    await sendWelcome();

    // Пауза 2 сек
    await new Promise(r => setTimeout(r, 2000));

    // Сообщение 2
    await sendPaymentConfirm();

    console.log('\n=== Готово! Проверь Telegram ===');
}

main();
