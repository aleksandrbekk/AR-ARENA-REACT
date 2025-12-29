// Auto-Kick Expired Premium Subscriptions
// Vercel Serverless Function (запускать через Vercel cron или вручную)
// 2025-12-23

import { createClient } from '@supabase/supabase-js';

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

// SECURITY: All secrets from environment variables (set in Vercel)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_TELEGRAM_ID = 190202791;

// Validate required env vars
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN) {
  console.error('CRITICAL: Missing required environment variables');
}

// Supabase клиент
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// HELPER FUNCTIONS
// ============================================

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] [AutoKick] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [AutoKick] ${message}`);
  }
}

// Кикнуть пользователя из канала и чата через Edge Function
async function kickUser(telegramId) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/telegram-channel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ action: 'kick', telegram_id: parseInt(telegramId) })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    log(`❌ Kick error for ${telegramId}`, { error: error.message });
    return { success: false, error: error.message };
  }
}

// Отправить сообщение в Telegram
async function sendTelegramMessage(telegramId, text) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: 'HTML'
      })
    });

    return await response.json();
  } catch (error) {
    log(`❌ Telegram message error`, { error: error.message });
    return null;
  }
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Можно вызывать через GET (для Vercel cron) или POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    log('🔄 Starting auto-kick for expired subscriptions...');

    // ============================================
    // 1. НАЙТИ ИСТЁКШИХ КЛИЕНТОВ (in_channel=true ИЛИ in_chat=true)
    // ============================================
    const now = new Date().toISOString();

    const { data: expiredClients, error } = await supabase
      .from('premium_clients')
      .select('id, telegram_id, username, expires_at, in_channel, in_chat')
      .lt('expires_at', now)
      .or('in_channel.eq.true,in_chat.eq.true');

    if (error) {
      log('❌ Error fetching expired clients', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!expiredClients || expiredClients.length === 0) {
      log('✅ No expired clients to kick');
      return res.status(200).json({
        message: 'No expired clients to kick',
        kicked: 0
      });
    }

    log(`📋 Found ${expiredClients.length} expired clients to process`);

    // ============================================
    // 2. КИКНУТЬ КАЖДОГО
    // ============================================
    const results = [];

    for (const client of expiredClients) {
      if (!client.telegram_id) {
        log(`⚠️ Client ${client.id} has no telegram_id, skipping`);
        continue;
      }

      log(`🔨 Kicking client ${client.telegram_id} (@${client.username || 'N/A'})`);

      // Кикаем из канала и чата
      const kickResult = await kickUser(client.telegram_id);

      // Обновляем статус в БД
      const { error: updateError } = await supabase
        .from('premium_clients')
        .update({
          in_channel: false,
          in_chat: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id);

      if (updateError) {
        log(`⚠️ Error updating client ${client.id}`, updateError);
      }

      // Отправляем уведомление пользователю
      await sendTelegramMessage(
        client.telegram_id,
        `⏰ <b>Ваша подписка Premium AR Club истекла</b>\n\n` +
        `Доступ к закрытому каналу и чату приостановлен.\n\n` +
        `Чтобы продлить подписку, откройте AR ARENA и перейдите в раздел Premium.\n\n` +
        `📞 Служба заботы: @Andrey_cryptoinvestor`
      );

      results.push({
        telegram_id: client.telegram_id,
        username: client.username,
        kickResult: kickResult.success ? 'ok' : kickResult.error
      });
    }

    // ============================================
    // 3. ОТПРАВИТЬ ОТЧЁТ АДМИНУ
    // ============================================
    if (results.length > 0) {
      const report = results.map(r =>
        `• ${r.username ? '@' + r.username : r.telegram_id}: ${r.kickResult}`
      ).join('\n');

      await sendTelegramMessage(
        ADMIN_TELEGRAM_ID,
        `🔄 <b>Автокик истёкших подписок</b>\n\n` +
        `Обработано: ${results.length}\n\n` +
        `${report}`
      );
    }

    log(`✅ Auto-kick completed. Kicked: ${results.length}`);

    return res.status(200).json({
      message: 'Auto-kick completed',
      kicked: results.length,
      results
    });

  } catch (error) {
    log('❌ Auto-kick error', { error: error.message, stack: error.stack });
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
