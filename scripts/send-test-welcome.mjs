const BOT_TOKEN = '8265126337:AAGCjyBRX9hBtFeiHZMnAv1UYV5a8PVpUew';
const CHAT_ID = 190202791;
const PRICING_URL = 'https://ararena.pro/pricing';

const caption = `🏆 <b>Добро пожаловать в Premium AR Club</b>

Закрытое сообщество трейдеров и инвесторов.
9 лет опыта. 82% успешных сделок. 5000+ участников.

<b>Выбери свой уровень доступа:</b>

🖤 CLASSIC — старт в крипте
🥇 GOLD — активный трейдинг
💎 PLATINUM — полный арсенал

👇 Жми по кнопке. Выбирай клубную карту

💬 Служба заботы: @Andrey_cryptoinvestor`;

const keyboard = {
    inline_keyboard: [
        [{ text: '🎴 Тарифы', web_app: { url: PRICING_URL } }],
        [{ text: '💬 Поддержка', url: 'https://t.me/Andrey_cryptoinvestor' }]
    ]
};

async function sendMessage() {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: CHAT_ID,
            photo: 'https://ararena.pro/images/ar_premium_club_welcome.jpg',
            caption: caption,
            parse_mode: 'HTML',
            reply_markup: keyboard
        })
    });

    const result = await response.json();
    console.log('Result:', JSON.stringify(result, null, 2));
}

sendMessage();
