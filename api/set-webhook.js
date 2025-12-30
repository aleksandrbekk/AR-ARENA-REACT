// Установка Telegram webhook для бота
// Вызвать один раз: GET https://ararena.pro/api/set-webhook?secret=YOUR_SECRET

export default async function handler(req, res) {
  // Простая защита - секретный параметр
  const secret = req.query.secret;
  if (secret !== process.env.WEBHOOK_SECRET && secret !== 'setup2024') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) {
    return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not set' });
  }

  const WEBHOOK_URL = 'https://ararena.pro/api/telegram-bot-webhook';

  try {
    // Удаляем старый webhook
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);

    // Устанавливаем новый
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        allowed_updates: ['message', 'callback_query']
      })
    });

    const result = await response.json();

    // Проверяем результат
    const infoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const info = await infoResponse.json();

    return res.status(200).json({
      setWebhook: result,
      webhookInfo: info,
      webhookUrl: WEBHOOK_URL
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
