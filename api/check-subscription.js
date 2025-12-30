// API для проверки подписки на Telegram канал
// Используется в розыгрышах для проверки условий участия
// 2024-12-30

// SECURITY: All secrets from environment variables (set in Vercel)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export default async function handler(req, res) {
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Проверяем наличие BOT_TOKEN
  if (!BOT_TOKEN) {
    console.error('CRITICAL: TELEGRAM_BOT_TOKEN not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { telegram_id, channel_id } = req.body;

  if (!telegram_id || !channel_id) {
    return res.status(400).json({
      error: 'Missing required parameters',
      required: ['telegram_id', 'channel_id']
    });
  }

  try {
    // Форматируем channel_id (если передан без @, добавляем)
    const formattedChannelId = channel_id.startsWith('@')
      ? channel_id
      : `@${channel_id}`;

    // Вызываем Telegram Bot API getChatMember
    const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`;

    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: formattedChannelId,
        user_id: parseInt(telegram_id, 10)
      })
    });

    const data = await response.json();

    if (!data.ok) {
      // Если бот не админ канала или канал не найден
      console.error('Telegram API error:', data);

      // Если бот не имеет доступа к каналу — пропускаем проверку
      if (data.error_code === 400 || data.error_code === 403) {
        return res.status(200).json({
          success: true,
          is_member: true, // Пропускаем если не можем проверить
          status: 'unknown',
          message: 'Cannot verify subscription (bot not admin or channel not found)'
        });
      }

      return res.status(200).json({
        success: false,
        is_member: false,
        error: data.description
      });
    }

    // Проверяем статус пользователя в канале
    const memberStatus = data.result.status;

    // Статусы которые считаются "подписан":
    // - member: обычный участник
    // - administrator: админ
    // - creator: владелец
    // - restricted: ограничен но всё ещё участник
    const isMember = ['member', 'administrator', 'creator', 'restricted'].includes(memberStatus);

    return res.status(200).json({
      success: true,
      is_member: isMember,
      status: memberStatus
    });

  } catch (error) {
    console.error('Check subscription error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
