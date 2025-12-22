// Toolsy Webhook для Premium AR Club (крипто-оплата)
// Vercel Serverless Function
// 2025-12-22

import { createClient } from '@supabase/supabase-js';

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

// TOOLSY_SECRET_KEY нужно добавить в Vercel Environment Variables
const TOOLSY_SECRET_KEY = process.env.TOOLSY_SECRET_KEY;
const TOOLSY_PROJECT_ID = 'pro_XP37bqFhuNrucrzD';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://syxjkircmiwpnpagznay.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NDQxMSwiZXhwIjoyMDczMzQwNDExfQ.7ueEYBhFrxKU3_RJi_iJEDj6EQqWBy3gAXiM4YIALqs';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g';
const BOT_TOKEN = '8265126337:AAHBKYlU6fQA09nkJwsMaBQtP16CXSq1Cnc';

// Маппинг суммы на период подписки (в USDT)
const AMOUNT_TO_PERIOD = [
  { min: 0, max: 15, days: 30, tariff: '1month', name: 'TEST' },
  { min: 50, max: 60, days: 30, tariff: '1month', name: 'TRADER' },
  { min: 95, max: 105, days: 60, tariff: '2months', name: 'PRIVATE' },
];

// Supabase клиент
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// HELPER FUNCTIONS
// ============================================

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] [Toolsy] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [Toolsy] ${message}`);
  }
}

function getPeriodByAmount(amount) {
  for (const period of AMOUNT_TO_PERIOD) {
    if (amount >= period.min && amount <= period.max) {
      return period;
    }
  }
  // Fallback: 30 дней
  log(`⚠️ Unknown amount ${amount} USDT, defaulting to 30 days`);
  return { days: 30, tariff: '1month', name: 'UNKNOWN' };
}

// Отправить сообщение в Telegram
async function sendTelegramMessage(telegramId, text, replyMarkup = null) {
  try {
    const body = {
      chat_id: telegramId,
      text,
      parse_mode: 'HTML'
    };

    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await response.json();
    if (!result.ok) {
      log('❌ Telegram sendMessage failed', result);
    }
    return result;
  } catch (error) {
    log('❌ Telegram sendMessage error', { error: error.message });
    return null;
  }
}

// Создать invite-ссылку через Edge Function
async function createInviteLink(telegramId) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/telegram-channel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ action: 'invite', telegram_id: parseInt(telegramId) })
    });

    const result = await response.json();
    log('📨 Invite response', result);

    if (result.success && result.results?.channel?.result?.invite_link) {
      return result.results.channel.result.invite_link;
    }

    return null;
  } catch (error) {
    log('❌ Create invite error', { error: error.message });
    return null;
  }
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ============================================
    // ЛОГИРОВАНИЕ ВХОДЯЩЕГО ЗАПРОСА
    // ============================================
    console.log('=== TOOLSY WEBHOOK RECEIVED ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const payload = req.body;

    // ============================================
    // 1. ВАЛИДАЦИЯ PAYLOAD
    // ============================================
    if (!payload || !payload.type) {
      log('❌ Invalid payload - missing type');
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const { id: eventId, type: eventType, data } = payload;

    log(`📨 Event: ${eventType}, ID: ${eventId}`);

    // Обрабатываем только payment.created и subscription.created
    const supportedEvents = ['payment.created', 'subscription.created', 'subscription.updated'];
    if (!supportedEvents.includes(eventType)) {
      log(`⚠️ Event type: ${eventType} - ignoring`);
      return res.status(200).json({ message: 'Event not supported, ignoring' });
    }

    // ============================================
    // 2. ИЗВЛЕЧЕНИЕ ДАННЫХ
    // ============================================

    // Telegram ID может быть в разных местах в зависимости от события
    let telegramId = null;
    let username = null;
    let amount = 0;
    let currency = 'USDT';

    // Пробуем извлечь telegram_id из разных мест
    // data.visit.client.tgId или data.client.tgId
    if (data?.visit?.client?.tgId) {
      telegramId = data.visit.client.tgId;
      username = data.visit.client.tgUsername || data.visit.client.username;
    } else if (data?.client?.tgId) {
      telegramId = data.client.tgId;
      username = data.client.tgUsername || data.client.username;
    } else if (data?.subscription?.visit?.client?.tgId) {
      telegramId = data.subscription.visit.client.tgId;
      username = data.subscription.visit.client.tgUsername;
    }

    // Извлекаем сумму
    if (data?.amountNet) {
      amount = parseFloat(data.amountNet);
    } else if (data?.price) {
      amount = parseFloat(data.price);
    } else if (data?.subscription?.price) {
      amount = parseFloat(data.subscription.price);
    }

    // Валюта
    if (data?.currency) {
      currency = data.currency;
    }

    // Проверяем статус платежа (если есть)
    const paymentStatus = data?.status?.toLowerCase();
    if (paymentStatus && paymentStatus !== 'completed' && paymentStatus !== 'paid' && paymentStatus !== 'success') {
      log(`⚠️ Payment status: ${paymentStatus} - ignoring`);
      return res.status(200).json({ message: 'Payment not completed, ignoring' });
    }

    log(`👤 Telegram ID: ${telegramId}, Username: ${username}, Amount: ${amount} ${currency}`);

    if (!telegramId) {
      log('❌ Missing telegram_id in payload');
      // Логируем для отладки, но не блокируем
      log('📋 Full data object:', data);
      return res.status(200).json({
        message: 'No telegram_id found, logged for debugging',
        eventType,
        dataKeys: Object.keys(data || {})
      });
    }

    // ============================================
    // 3. ОПРЕДЕЛЕНИЕ ПЕРИОДА ПОДПИСКИ
    // ============================================
    const period = getPeriodByAmount(amount);
    log(`📅 Period determined: ${period.days} days (${period.name})`);

    // ============================================
    // 4. UPSERT В PREMIUM_CLIENTS
    // ============================================
    const now = new Date();
    const expiresAt = new Date(now.getTime() + period.days * 24 * 60 * 60 * 1000);
    const telegramIdInt = parseInt(telegramId);

    // Проверяем существующего клиента
    const { data: existingClient } = await supabase
      .from('premium_clients')
      .select('*')
      .eq('telegram_id', telegramIdInt)
      .single();

    let clientId;
    let isNewClient = false;

    if (existingClient) {
      // Продлеваем подписку
      const currentExpires = new Date(existingClient.expires_at);
      const newExpires = currentExpires > now
        ? new Date(currentExpires.getTime() + period.days * 24 * 60 * 60 * 1000)
        : expiresAt;

      const { error: updateError } = await supabase
        .from('premium_clients')
        .update({
          plan: period.tariff,
          expires_at: newExpires.toISOString(),
          total_paid_usd: (existingClient.total_paid_usd || 0) + amount,
          payments_count: (existingClient.payments_count || 0) + 1,
          last_payment_at: now.toISOString(),
          last_payment_method: 'toolsy',
          source: 'toolsy',
          updated_at: now.toISOString()
        })
        .eq('id', existingClient.id);

      if (updateError) {
        log('❌ Error updating client', updateError);
        throw new Error('Failed to update client');
      }

      clientId = existingClient.id;
      log(`✅ Client updated: ${telegramId}, expires: ${newExpires.toISOString()}`);
    } else {
      // Создаём нового клиента
      isNewClient = true;

      // Пробуем получить username из users таблицы
      if (!username) {
        const { data: userData } = await supabase
          .from('users')
          .select('username, first_name')
          .eq('telegram_id', telegramIdInt)
          .single();

        if (userData?.username) {
          username = userData.username;
        }
      }

      const { data: newClient, error: insertError } = await supabase
        .from('premium_clients')
        .insert({
          telegram_id: telegramIdInt,
          username,
          plan: period.tariff,
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          in_channel: false,
          in_chat: false,
          tags: [],
          source: 'toolsy',
          total_paid_usd: amount,
          payments_count: 1,
          last_payment_at: now.toISOString(),
          last_payment_method: 'toolsy',
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .select()
        .single();

      if (insertError) {
        log('❌ Error inserting client', insertError);
        throw new Error('Failed to insert client');
      }

      clientId = newClient.id;
      log(`✅ New client created: ${telegramId}, expires: ${expiresAt.toISOString()}`);
    }

    // ============================================
    // 5. ОТПРАВКА СООБЩЕНИЯ В TELEGRAM
    // ============================================

    // Сначала отправляем приветствие
    const welcomeMessage = isNewClient
      ? `🎉 <b>Добро пожаловать в Premium AR Club!</b>\n\n` +
        `Ваша подписка <b>${period.name}</b> активирована на ${period.days} дней.\n` +
        `Оплата криптовалютой: ${amount} ${currency}`
      : `✅ <b>Подписка продлена!</b>\n\n` +
        `Добавлено <b>${period.days} дней</b> к вашей подписке ${period.name}.\n` +
        `Оплата криптовалютой: ${amount} ${currency}`;

    await sendTelegramMessage(telegramIdInt, welcomeMessage);
    log('✅ Welcome message sent');

    // Пробуем создать invite link
    const inviteLink = await createInviteLink(telegramIdInt);

    if (inviteLink) {
      log(`🔗 Invite link created: ${inviteLink}`);

      // Обновляем статус в БД
      await supabase
        .from('premium_clients')
        .update({ in_channel: true, in_chat: true })
        .eq('id', clientId);

      // Отправляем invite link
      const replyMarkup = {
        inline_keyboard: [
          [{ text: '📢 Присоединиться к каналу', url: inviteLink }],
          [{ text: '🎮 Открыть AR ARENA', web_app: { url: 'https://ararena.pro' } }]
        ]
      };

      await sendTelegramMessage(telegramIdInt, '📢 Нажмите кнопку ниже, чтобы присоединиться к Premium каналу:', replyMarkup);
      log('✅ Invite link message sent');
    } else {
      log('⚠️ Failed to create invite link');
    }

    // ============================================
    // 6. ЗАПИСЬ В PAYMENT_HISTORY
    // ============================================
    const { error: paymentError } = await supabase
      .from('payment_history')
      .insert({
        telegram_id: String(telegramIdInt),
        amount: amount,
        currency: currency,
        source: 'toolsy'
      });

    if (paymentError) {
      log('⚠️ Failed to record payment history', paymentError);
    } else {
      log('📝 Payment history recorded');
    }

    // ============================================
    // 7. УСПЕШНЫЙ ОТВЕТ
    // ============================================
    log('✅ Toolsy webhook processed successfully');

    return res.status(200).json({
      success: true,
      message: 'Premium subscription activated via Toolsy',
      telegram_id: telegramId,
      period: period.name,
      days: period.days
    });

  } catch (error) {
    log('❌ Toolsy Webhook error', { error: error.message, stack: error.stack });
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
