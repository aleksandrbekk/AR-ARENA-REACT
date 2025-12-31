// API для восстановления доступа кикнутому пользователю
// Вызывается когда в CRM продлевают подписку юзеру с тегом 'kicked'

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const KIKER_BOT_TOKEN = process.env.KIKER_BOT_TOKEN;

const CHANNEL_ID = '-1001634734020';
const CHAT_ID = '-1001828659569';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Создать инвайт-ссылку
async function createInviteLink(chatId) {
  try {
    // Пробуем через KIKER бота (он админ)
    const token = KIKER_BOT_TOKEN || BOT_TOKEN;

    const res = await fetch(`https://api.telegram.org/bot${token}/createChatInviteLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        member_limit: 1,
        expire_date: Math.floor(Date.now() / 1000) + 86400 * 7 // 7 дней
      })
    });

    const data = await res.json();
    if (data.ok) {
      return data.result.invite_link;
    }
    console.log('Create invite error:', data);
    return null;
  } catch (err) {
    console.error('Create invite error:', err);
    return null;
  }
}

// Отправить сообщение
async function sendMessage(telegramId, text) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    return (await res.json()).ok;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { telegram_id } = req.body;

  if (!telegram_id) {
    return res.status(400).json({ error: 'telegram_id required' });
  }

  try {
    // Получаем данные пользователя
    const { data: user, error: fetchError } = await supabase
      .from('premium_clients')
      .select('id, telegram_id, username, tags, expires_at, in_channel, in_chat')
      .eq('telegram_id', telegram_id)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tags = user.tags || [];

    // Проверяем что пользователь был кикнут
    if (!tags.includes('kicked')) {
      return res.status(200).json({
        message: 'User not kicked, no action needed',
        sent: false
      });
    }

    // Проверяем что подписка активна
    if (new Date(user.expires_at) < new Date()) {
      return res.status(400).json({
        error: 'Subscription still expired',
        expires_at: user.expires_at
      });
    }

    // Генерируем ссылки
    const channelLink = await createInviteLink(CHANNEL_ID);
    const chatLink = await createInviteLink(CHAT_ID);

    if (!channelLink || !chatLink) {
      return res.status(500).json({
        error: 'Failed to create invite links',
        channelLink,
        chatLink
      });
    }

    // Отправляем сообщение
    const message = `🎉 <b>Ваш доступ к AR Club восстановлен!</b>

Ваша подписка была продлена. Вот новые ссылки для входа:

📺 <b>Канал:</b> ${channelLink}
💬 <b>Чат:</b> ${chatLink}

⚠️ Ссылки одноразовые и действуют 7 дней.
Присоединяйтесь прямо сейчас!`;

    const sent = await sendMessage(telegram_id, message);

    // Обновляем теги - убираем kicked/expired, добавляем reinstated
    const newTags = tags
      .filter(t => t !== 'kicked' && t !== 'expired')
      .concat(['reinstated']);

    await supabase
      .from('premium_clients')
      .update({
        tags: newTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    console.log(`[Reinstate] User ${telegram_id} (@${user.username}) reinstated, message sent: ${sent}`);

    return res.status(200).json({
      success: true,
      sent,
      channelLink,
      chatLink,
      newTags
    });

  } catch (error) {
    console.error('[Reinstate] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
