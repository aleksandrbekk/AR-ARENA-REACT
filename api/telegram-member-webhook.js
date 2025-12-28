import { createClient } from '@supabase/supabase-js';

// Supabase
const supabaseUrl = 'https://syxjkircmiwpnpagznay.supabase.co';
const supabaseKey = '***REMOVED***';
const supabase = createClient(supabaseUrl, supabaseKey);

// IDs каналов и чатов
const CHANNEL_ID = '-1001634734020';
const CHAT_ID = '-1001828659569';

// Админ для уведомлений
const ADMIN_ID = '190202791';
const BOT_TOKEN = '***REMOVED***';

async function notifyAdmin(message) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });
  } catch (err) {
    console.error('Failed to notify admin:', err);
  }
}

export default async function handler(req, res) {
  // Только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;
    console.log('[MemberWebhook] Received update:', JSON.stringify(update));

    // Обрабатываем только chat_member события
    const chatMember = update.chat_member;
    if (!chatMember) {
      return res.status(200).json({ ok: true, message: 'Not a chat_member update' });
    }

    const chat = chatMember.chat;
    const newMember = chatMember.new_chat_member;
    const user = newMember.user;

    const chatId = chat.id.toString();
    const chatTitle = chat.title || 'Unknown';
    const userId = user.id;
    const username = user.username || null;
    const firstName = user.first_name || null;
    const newStatus = newMember.status; // 'member', 'left', 'kicked', etc.

    console.log(`[MemberWebhook] User ${userId} (${username || firstName}) status: ${newStatus} in chat ${chatId} (${chatTitle})`);

    // Определяем, это канал или чат
    const isChannel = chatId === CHANNEL_ID;
    const isChat = chatId === CHAT_ID;

    if (!isChannel && !isChat) {
      console.log(`[MemberWebhook] Unknown chat ${chatId}, ignoring`);
      return res.status(200).json({ ok: true, message: 'Unknown chat' });
    }

    // Проверяем, есть ли пользователь в premium_clients
    const { data: client, error: fetchError } = await supabase
      .from('premium_clients')
      .select('*')
      .eq('telegram_id', userId)
      .single();

    if (fetchError || !client) {
      console.log(`[MemberWebhook] User ${userId} not found in premium_clients`);
      return res.status(200).json({ ok: true, message: 'User not in premium_clients' });
    }

    // Обновляем статус в зависимости от действия
    const isMember = newStatus === 'member' || newStatus === 'administrator' || newStatus === 'creator';
    const updateField = isChannel ? 'in_channel' : 'in_chat';
    const updateValue = isMember;

    const { error: updateError } = await supabase
      .from('premium_clients')
      .update({
        [updateField]: updateValue,
        updated_at: new Date().toISOString(),
        // Обновляем username/first_name если их не было
        ...(username && !client.username ? { username } : {}),
        ...(firstName && !client.first_name ? { first_name: firstName } : {})
      })
      .eq('telegram_id', userId);

    if (updateError) {
      console.error(`[MemberWebhook] Failed to update user ${userId}:`, updateError);
      return res.status(500).json({ error: 'Failed to update user' });
    }

    const action = isMember ? 'вступил в' : 'покинул';
    const resource = isChannel ? 'канал' : 'чат';

    console.log(`[MemberWebhook] Updated ${updateField}=${updateValue} for user ${userId}`);

    // Уведомляем админа только о вступлении
    if (isMember) {
      await notifyAdmin(
        `✅ <b>Реальное вступление</b>\n\n` +
        `👤 ${firstName || 'User'} ${username ? `(@${username})` : ''}\n` +
        `🆔 <code>${userId}</code>\n` +
        `📍 ${action} ${resource}\n` +
        `📦 Тариф: ${client.plan?.toUpperCase() || 'N/A'}`
      );
    }

    return res.status(200).json({
      ok: true,
      message: `User ${userId} ${action} ${resource}`,
      updated: { [updateField]: updateValue }
    });

  } catch (err) {
    console.error('[MemberWebhook] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
