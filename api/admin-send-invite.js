// API для отправки invite-ссылок администратором
// Генерирует новые ссылки и отправляет пользователю (или возвращает для копирования)

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const KIKER_BOT_TOKEN = process.env.KIKER_BOT_TOKEN;

const CHANNEL_ID = '-1001634734020';
const CHAT_ID = '-1001828659569';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://ar-arena.games',
  'https://www.ar-arena.games',
  'https://ar-arena-react.vercel.app',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
].filter(Boolean);

// Создать инвайт-ссылку (с fallback между токенами)
async function createInviteLink(chatId) {
  const tokens = [
    { token: KIKER_BOT_TOKEN, name: 'KIKER_BOT' },
    { token: BOT_TOKEN, name: 'MAIN_BOT' }
  ].filter(t => t.token);

  for (const { token, name } of tokens) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/createChatInviteLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          member_limit: 1
        })
      });

      const data = await res.json();
      if (data.ok) {
        console.log(`[AdminInvite] Invite link created via ${name} for chat ${chatId}`);
        return data.result.invite_link;
      }
      console.log(`[AdminInvite] ${name} failed for chat ${chatId}:`, {
        error_code: data.error_code,
        description: data.description
      });
    } catch (err) {
      console.error(`[AdminInvite] ${name} error for chat ${chatId}:`, err.message);
    }
  }

  console.error(`[AdminInvite] CRITICAL: All tokens failed for chat ${chatId}`);
  return null;
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
  const origin = req.headers.origin;
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { telegram_id, send_to_user = true } = req.body;

  if (!telegram_id) {
    return res.status(400).json({ error: 'telegram_id required' });
  }

  try {
    // Проверяем что пользователь существует в premium_clients
    const { data: user, error: fetchError } = await supabase
      .from('premium_clients')
      .select('id, telegram_id, username, first_name')
      .eq('telegram_id', telegram_id)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ error: 'Premium client not found' });
    }

    // Генерируем ссылки
    const channelLink = await createInviteLink(CHANNEL_ID);
    const chatLink = await createInviteLink(CHAT_ID);

    if (!channelLink || !chatLink) {
      const errorDetails = [];
      if (!channelLink) errorDetails.push(`Канал (${CHANNEL_ID}): бот не имеет права "Invite users via link"`);
      if (!chatLink) errorDetails.push(`Чат (${CHAT_ID}): бот не имеет права "Invite users via link"`);

      return res.status(500).json({
        error: 'Failed to create invite links',
        details: errorDetails.join('; '),
        hint: 'Проверьте что KIKER_BOT или основной бот имеет права "Invite users via link" в канале и чате',
        channelLink,
        chatLink
      });
    }

    let sent = false;

    // Отправляем пользователю если нужно
    if (send_to_user) {
      const displayName = user.username ? `@${user.username}` : user.first_name || 'пользователь';

      const message = `🔗 <b>Новые ссылки для входа в AR Club</b>

Привет! Вот твои персональные ссылки:

📺 <b>Канал:</b> ${channelLink}
💬 <b>Чат:</b> ${chatLink}

⚠️ Ссылки одноразовые.`;

      sent = await sendMessage(telegram_id, message);

      console.log(`[AdminInvite] Sent invite links to ${telegram_id} (${displayName}), success: ${sent}`);
    }

    return res.status(200).json({
      success: true,
      sent,
      channelLink,
      chatLink
    });

  } catch (error) {
    console.error('[AdminInvite] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
