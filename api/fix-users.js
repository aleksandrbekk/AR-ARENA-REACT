// Временный endpoint для исправления пользователей с истекшей подпиской
// УДАЛИТЬ ПОСЛЕ ИСПОЛЬЗОВАНИЯ!

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KIKER_BOT_TOKEN = process.env.KIKER_BOT_TOKEN;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const CHANNEL_ID = '-1001634734020';
const CHAT_ID = '-1001828659569';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Пользователи для исправления
const USERS_TO_FIX = [
  { telegram_id: 838608031, username: 'vladipo2611', plan: 'platinum', days: 180 },
  { telegram_id: 359743018, username: 'Svitlana_sold', plan: 'platinum', days: 180 },
  { telegram_id: 842849795, username: 'Nurbolkz87', plan: 'private', days: 365 }
];

async function createInviteLink(chatId) {
  try {
    const expireDate = Math.floor(Date.now() / 1000) + 86400;
    const response = await fetch(
      `https://api.telegram.org/bot${KIKER_BOT_TOKEN}/createChatInviteLink`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, member_limit: 1, expire_date: expireDate })
      }
    );
    const result = await response.json();
    return result.ok ? result.result.invite_link : null;
  } catch (error) {
    return null;
  }
}

async function sendMessage(telegramId, text, buttons = null) {
  try {
    const body = { chat_id: telegramId, text, parse_mode: 'HTML' };
    if (buttons) body.reply_markup = { inline_keyboard: buttons };

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return (await response.json()).ok;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  // Защита - только с секретным ключом
  if (req.query.key !== 'fix_190202791_secret') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = [];

  for (const user of USERS_TO_FIX) {
    const result = { telegram_id: user.telegram_id, username: user.username };

    try {
      // 1. Проверяем текущее состояние
      const { data: existing } = await supabase
        .from('premium_clients')
        .select('*')
        .eq('telegram_id', user.telegram_id)
        .single();

      result.existing = existing ? {
        plan: existing.plan,
        expires_at: existing.expires_at,
        last_payment_at: existing.last_payment_at
      } : null;

      // 2. Рассчитываем новую дату
      const now = new Date();
      const expiresAt = new Date(now.getTime() + user.days * 24 * 60 * 60 * 1000);

      // 3. Обновляем или создаём
      if (existing) {
        await supabase
          .from('premium_clients')
          .update({
            plan: user.plan,
            expires_at: expiresAt.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('telegram_id', user.telegram_id);
        result.action = 'updated';
      } else {
        await supabase
          .from('premium_clients')
          .insert({
            telegram_id: user.telegram_id,
            username: user.username,
            plan: user.plan,
            started_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            in_channel: false,
            in_chat: false,
            tags: [],
            source: '0xprocessing',
            total_paid_usd: user.plan === 'private' ? 474 : 249,
            payments_count: 1,
            last_payment_at: now.toISOString(),
            last_payment_method: '0xprocessing',
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          });
        result.action = 'created';
      }
      result.new_expires_at = expiresAt.toISOString();

      // 4. Создаём invite-ссылки
      const channelLink = await createInviteLink(CHANNEL_ID);
      const chatLink = await createInviteLink(CHAT_ID);
      result.channelLink = channelLink;
      result.chatLink = chatLink;

      // 5. Отправляем сообщение
      if (channelLink && chatLink) {
        const planName = user.plan.toUpperCase();
        const message = `🎉 <b>Ваша подписка ${planName} активирована!</b>

Приносим извинения за технические неполадки. Ваш доступ восстановлен на ${user.days} дней.

👇 <b>Нажмите кнопки ниже для доступа:</b>

📞 Служба заботы: @Andrey_cryptoinvestor`;

        const buttons = [
          [{ text: '📺 Канал Premium', url: channelLink }],
          [{ text: '💬 Чат Premium', url: chatLink }]
        ];

        result.messageSent = await sendMessage(user.telegram_id, message, buttons);
      }

      result.status = 'success';
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
    }

    results.push(result);
  }

  return res.status(200).json({ results });
}
