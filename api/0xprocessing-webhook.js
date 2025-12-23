// 0xProcessing Webhook для Premium AR Club (крипто-оплата)
// Vercel Serverless Function
// 2025-12-23

import { createClient } from '@supabase/supabase-js';

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://syxjkircmiwpnpagznay.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NDQxMSwiZXhwIjoyMDczMzQwNDExfQ.7ueEYBhFrxKU3_RJi_iJEDj6EQqWBy3gAXiM4YIALqs';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g';
const BOT_TOKEN = '8265126337:AAHBKYlU6fQA09nkJwsMaBQtP16CXSq1Cnc';

// Маппинг суммы USD на период подписки (круглые суммы)
const AMOUNT_TO_PERIOD = [
  { min: 1, max: 5, days: 30, tariff: 'test', name: 'TEST' },             // $2 тест
  { min: 45, max: 55, days: 30, tariff: 'classic', name: 'CLASSIC' },     // $50
  { min: 95, max: 105, days: 90, tariff: 'trader', name: 'TRADER' },      // $100
  { min: 195, max: 205, days: 180, tariff: 'platinum', name: 'PLATINUM' }, // $200
  { min: 395, max: 405, days: 365, tariff: 'private', name: 'PRIVATE' }   // $400
];

// Supabase клиент
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// HELPER FUNCTIONS
// ============================================

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] [0xProcessing] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [0xProcessing] ${message}`);
  }
}

function getPeriodByAmount(amountUSD) {
  const amount = parseFloat(amountUSD);
  for (const period of AMOUNT_TO_PERIOD) {
    if (amount >= period.min && amount <= period.max) {
      return period;
    }
  }
  // Fallback: 30 дней
  log(`⚠️ Unknown amount ${amountUSD} USD, defaulting to 30 days`);
  return { days: 30, tariff: 'unknown', name: 'UNKNOWN' };
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

// Создать invite-ссылки через Edge Function (канал + чат)
async function createInviteLinks(telegramId) {
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

    const channelLink = result.results?.channel?.result?.invite_link || null;
    const chatLink = result.results?.chat?.result?.invite_link || null;

    return { channelLink, chatLink };
  } catch (error) {
    log('❌ Create invite error', { error: error.message });
    return { channelLink: null, chatLink: null };
  }
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: '0xProcessing Webhook for Premium AR Club',
      method: 'POST only'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ============================================
    // ЛОГИРОВАНИЕ ВХОДЯЩЕГО ЗАПРОСА
    // ============================================
    console.log('=== 0xPROCESSING WEBHOOK RECEIVED ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const payload = req.body;

    // ============================================
    // 1. ВАЛИДАЦИЯ PAYLOAD
    // ============================================
    // 0xProcessing webhook payload содержит:
    // - Status (Success, Cancelled, etc.)
    // - ClientId (наш telegram_id или username)
    // - AmountUSD или Amount
    // - Currency
    // - BillingId
    // - TransactionHash

    const {
      Status,
      ClientId,
      AmountUSD,
      Amount,
      Currency,
      BillingId,
      TransactionHash,
      WalletAddress
    } = payload;

    log(`📨 Payment status: ${Status}, ClientId: ${ClientId}, Amount: ${AmountUSD || Amount} ${Currency}`);

    // Проверяем статус платежа
    if (Status !== 'Success' && Status !== 'Completed') {
      log(`⚠️ Payment status: ${Status} - ignoring`);
      return res.status(200).json({ message: 'Payment not successful, ignoring' });
    }

    if (!ClientId) {
      log('❌ Missing ClientId in payload');
      return res.status(200).json({ message: 'No ClientId found' });
    }

    // ============================================
    // 2. ОПРЕДЕЛЕНИЕ TELEGRAM ID
    // ============================================
    let telegramId = null;
    let username = null;

    // ClientId может быть telegram_id (число) или username (строка)
    if (/^\d+$/.test(ClientId)) {
      telegramId = ClientId;
    } else {
      username = ClientId;
      // Пробуем найти telegram_id по username
      const { data: userData } = await supabase
        .from('users')
        .select('telegram_id, username')
        .ilike('username', username)
        .single();

      if (userData?.telegram_id) {
        telegramId = String(userData.telegram_id);
        username = userData.username;
        log(`✅ Found telegram_id ${telegramId} for username ${username}`);
      }
    }

    log(`👤 Telegram ID: ${telegramId || 'N/A'}, Username: ${username || 'N/A'}`);

    // ============================================
    // 3. ОПРЕДЕЛЕНИЕ ПЕРИОДА ПОДПИСКИ
    // ============================================
    const amountUSD = AmountUSD || Amount;
    const period = getPeriodByAmount(amountUSD);
    log(`📅 Period determined: ${period.days} days (${period.name})`);

    // ============================================
    // 4. UPSERT В PREMIUM_CLIENTS
    // ============================================
    const now = new Date();
    const expiresAt = new Date(now.getTime() + period.days * 24 * 60 * 60 * 1000);
    const telegramIdInt = telegramId ? parseInt(telegramId) : null;

    // Проверяем существующего клиента
    let existingClient = null;

    if (telegramIdInt) {
      const { data } = await supabase
        .from('premium_clients')
        .select('*')
        .eq('telegram_id', telegramIdInt)
        .single();
      existingClient = data;
    } else if (username) {
      const { data } = await supabase
        .from('premium_clients')
        .select('*')
        .eq('username', username)
        .single();
      existingClient = data;
    }

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
          total_paid_usd: (existingClient.total_paid_usd || 0) + parseFloat(amountUSD),
          payments_count: (existingClient.payments_count || 0) + 1,
          last_payment_at: now.toISOString(),
          last_payment_method: '0xprocessing',
          source: '0xprocessing',
          updated_at: now.toISOString()
        })
        .eq('id', existingClient.id);

      if (updateError) {
        log('❌ Error updating client', updateError);
        throw new Error('Failed to update client');
      }

      clientId = existingClient.id;
      log(`✅ Client updated: ${telegramId || username}, expires: ${newExpires.toISOString()}`);
    } else {
      // Создаём нового клиента
      isNewClient = true;

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
          source: '0xprocessing',
          total_paid_usd: parseFloat(amountUSD),
          payments_count: 1,
          last_payment_at: now.toISOString(),
          last_payment_method: '0xprocessing',
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
      log(`✅ New client created: ${telegramId || username}, expires: ${expiresAt.toISOString()}`);
    }

    // ============================================
    // 5. ОТПРАВКА СООБЩЕНИЯ В TELEGRAM
    // ============================================
    let finalTelegramId = telegramIdInt;
    if (!finalTelegramId && existingClient?.telegram_id) {
      finalTelegramId = existingClient.telegram_id;
    }

    if (finalTelegramId) {
      // Создаём invite links (канал + чат)
      const { channelLink, chatLink } = await createInviteLinks(finalTelegramId);
      log(`🔗 Invite links: channel=${channelLink}, chat=${chatLink}`);

      // Обновляем статус в БД
      if (channelLink || chatLink) {
        await supabase
          .from('premium_clients')
          .update({ in_channel: !!channelLink, in_chat: !!chatLink })
          .eq('id', clientId);
      }

      // Формируем ОДНО сообщение с приветствием и кнопками
      const welcomeText = isNewClient
        ? `🎉 <b>Добро пожаловать в Premium AR Club!</b>\n\n` +
          `Ваша подписка <b>${period.name}</b> активирована на ${period.days} дней.\n\n` +
          `👇 Нажмите кнопки ниже для доступа:`
        : `✅ <b>Подписка продлена!</b>\n\n` +
          `Добавлено <b>${period.days} дней</b> к вашей подписке ${period.name}.\n\n` +
          `👇 Нажмите кнопки ниже для доступа:`;

      // Формируем кнопки
      const buttons = [];
      if (channelLink) {
        buttons.push([{ text: '📢 Канал Premium', url: channelLink }]);
      }
      if (chatLink) {
        buttons.push([{ text: '💬 Чат Premium', url: chatLink }]);
      }
      buttons.push([{ text: '🎮 Открыть AR ARENA', web_app: { url: 'https://ararena.pro' } }]);

      const replyMarkup = { inline_keyboard: buttons };

      await sendTelegramMessage(finalTelegramId, welcomeText, replyMarkup);
      log('✅ Welcome message with buttons sent');
    }

    // ============================================
    // 6. ЗАПИСЬ В PAYMENT_HISTORY
    // ============================================
    const { error: paymentError } = await supabase
      .from('payment_history')
      .insert({
        telegram_id: telegramIdInt ? String(telegramIdInt) : username,
        amount: parseFloat(amountUSD),
        currency: 'USD',
        source: '0xprocessing',
        tx_hash: TransactionHash || null
      });

    if (paymentError) {
      log('⚠️ Failed to record payment history', paymentError);
    } else {
      log('📝 Payment history recorded');
    }

    // ============================================
    // 7. УСПЕШНЫЙ ОТВЕТ (200 OK без body для 0xProcessing)
    // ============================================
    log('✅ 0xProcessing webhook processed successfully');

    return res.status(200).end();

  } catch (error) {
    log('❌ 0xProcessing Webhook error', { error: error.message, stack: error.stack });
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
