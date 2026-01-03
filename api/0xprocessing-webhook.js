// 0xProcessing Webhook для Premium AR Club (крипто-оплата)
// Vercel Serverless Function
// 2025-12-23

import { createClient } from '@supabase/supabase-js';

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

// SECURITY: All secrets from environment variables (set in Vercel)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Validate required env vars
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN) {
  console.error('CRITICAL: Missing required environment variables');
}

// MerchantId для верификации
const MERCHANT_ID = '0xMR3389551';

// Маппинг суммы USD на период подписки
// ПРОДАКШН ЦЕНЫ (крипто) - курс 80₽/$
// Широкие диапазоны чтобы учитывать комиссии сети (могут быть $5-25)
const AMOUNT_TO_PERIOD = [
  { min: 45, max: 80, days: 30, tariff: 'classic', name: 'CLASSIC' },       // $50 (±комиссии)
  { min: 120, max: 180, days: 90, tariff: 'gold', name: 'GOLD' },           // $136 (±комиссии)
  { min: 200, max: 300, days: 180, tariff: 'platinum', name: 'PLATINUM' },  // $249 (±комиссии)
  { min: 400, max: 550, days: 365, tariff: 'private', name: 'PRIVATE' }     // $474 (±комиссии)
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

// Нормализация валюты для крипто-платежей
// Все крипто-валюты (USDT, USDC, BTC, ETH, TON и т.д.) считаются как USD
function normalizeCurrency(currency) {
  if (!currency) return 'USD';
  const upper = currency.toUpperCase();
  // Все криптовалюты и стейблкоины → USD
  if (upper.includes('USDT') || upper.includes('USDC') || upper.includes('USD') ||
    upper.includes('BTC') || upper.includes('ETH') || upper.includes('TON') ||
    upper.includes('TRX') || upper.includes('BNB') || upper.includes('SOL') ||
    upper.includes('CRYPTO')) {
    return 'USD';
  }
  return 'USD'; // Для 0xprocessing всегда USD
}

// Маппинг тарифа на URL картинки
const TARIFF_CARD_IMAGES = {
  'classic': 'https://ararena.pro/cards/classic.png',
  'gold': 'https://ararena.pro/cards/gold.png',
  'platinum': 'https://ararena.pro/cards/platinum.png',
  'private': 'https://ararena.pro/cards/PRIVATE.png'
};

// Отправить фото с подписью в Telegram
async function sendTelegramPhoto(telegramId, photoUrl, caption, replyMarkup = null) {
  try {
    const body = {
      chat_id: telegramId,
      photo: photoUrl,
      caption,
      parse_mode: 'HTML'
    };

    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await response.json();
    if (!result.ok) {
      log('❌ Telegram sendPhoto failed', result);
    }
    return result;
  } catch (error) {
    log('❌ Telegram sendPhoto error', { error: error.message });
    return null;
  }
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

// Бот KIKER для управления каналом/чатом
// SECURITY: Token from environment variable
const KIKER_BOT_TOKEN = process.env.KIKER_BOT_TOKEN;
const CHANNEL_ID = '-1001634734020';
const CHAT_ID = '-1001828659569';

// Трекинг UTM конверсии
async function trackUtmConversion(telegramId) {
  if (!telegramId) return;

  try {
    // Ищем источник пользователя
    const { data: userSource } = await supabase
      .from('user_sources')
      .select('source')
      .eq('telegram_id', telegramId)
      .single();

    if (userSource?.source) {
      // Инкрементируем конверсию
      await supabase.rpc('increment_utm_conversion', { p_slug: userSource.source });
      log(`📊 UTM conversion tracked: ${userSource.source} for user ${telegramId}`);
    }
  } catch (err) {
    log('⚠️ trackUtmConversion error (non-critical)', { error: err.message });
  }
}

// Трекинг конверсии для stream UTM ссылок (извлекает из BillingId)
async function trackStreamConversion(billingId) {
  if (!billingId) return;

  try {
    // BillingId формат: premium_tariff_clientId_timestamp_stream_SLUG
    const streamMatch = billingId.match(/_stream_([a-zA-Z0-9_-]+)$/);
    if (!streamMatch) {
      log('ℹ️ No stream_utm in BillingId');
      return;
    }

    const streamUtmSlug = streamMatch[1];
    log(`📊 Found stream_utm in BillingId: ${streamUtmSlug}`);

    // Увеличиваем conversions в utm_tool_links
    const { data: link } = await supabase
      .from('utm_tool_links')
      .select('id, conversions')
      .eq('slug', streamUtmSlug)
      .single();

    if (link) {
      await supabase
        .from('utm_tool_links')
        .update({
          conversions: (link.conversions || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', link.id);

      log(`✅ Stream conversion tracked for slug: ${streamUtmSlug}`);
    } else {
      log(`⚠️ Stream UTM link not found: ${streamUtmSlug}`);
    }
  } catch (err) {
    log('⚠️ trackStreamConversion error (non-critical)', { error: err.message });
  }
}

// Создать invite-ссылку напрямую через Telegram API
// Ссылка бессрочная, но одноразовая (member_limit=1)
async function createDirectInviteLink(chatId) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${KIKER_BOT_TOKEN}/createChatInviteLink?chat_id=${chatId}&member_limit=1`
    );
    const result = await response.json();
    return result.ok ? result.result.invite_link : null;
  } catch (error) {
    log('❌ Direct invite link error', { error: error.message });
    return null;
  }
}

// Создать invite-ссылки (канал + чат)
async function createInviteLinks(telegramId) {
  try {
    // Пробуем через Edge Function
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

    let channelLink = result.results?.channel?.result?.invite_link || null;
    let chatLink = result.results?.chat?.result?.invite_link || null;

    // Fallback: если Edge Function не вернула ссылки, создаём напрямую
    if (!channelLink) {
      log('⚠️ Channel link missing, creating directly');
      channelLink = await createDirectInviteLink(CHANNEL_ID);
    }
    if (!chatLink) {
      log('⚠️ Chat link missing, creating directly');
      chatLink = await createDirectInviteLink(CHAT_ID);
    }

    return { channelLink, chatLink };
  } catch (error) {
    log('❌ Create invite error, trying direct', { error: error.message });
    // Полный fallback
    const channelLink = await createDirectInviteLink(CHANNEL_ID);
    const chatLink = await createDirectInviteLink(CHAT_ID);
    return { channelLink, chatLink };
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
      WalletAddress,
      MerchantId,
      PaymentId,
      Signature
    } = payload;

    log(`📨 Payment status: ${Status}, ClientId: ${ClientId}, Amount: ${AmountUSD || Amount} ${Currency}`);
    log(`🏪 MerchantId: ${MerchantId}, PaymentId: ${PaymentId}`);

    // Проверяем MerchantId
    if (MerchantId && MerchantId !== MERCHANT_ID) {
      log(`❌ Invalid MerchantId: ${MerchantId}, expected: ${MERCHANT_ID}`);
      return res.status(200).json({ message: 'Invalid merchant' });
    }

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
    // ПРОВЕРКА НА ДУБЛИКАТ (по времени последнего платежа)
    // ============================================
    // Если тот же клиент платил в последние 5 минут — это retry, игнорируем
    const clientIdentifier = /^\d+$/.test(ClientId) ? parseInt(ClientId) : null;
    if (clientIdentifier) {
      const { data: recentClient } = await supabase
        .from('premium_clients')
        .select('last_payment_at')
        .eq('telegram_id', clientIdentifier)
        .single();

      if (recentClient?.last_payment_at) {
        const lastPayment = new Date(recentClient.last_payment_at);
        const now = new Date();
        const minutesSinceLastPayment = (now - lastPayment) / 1000 / 60;

        if (minutesSinceLastPayment < 5) {
          log(`⚠️ Duplicate payment detected: last payment was ${minutesSinceLastPayment.toFixed(1)} min ago - ignoring`);
          return res.status(200).json({ message: 'Payment already processed (duplicate)' });
        }
      }
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
          total_paid_usd: (existingClient.total_paid_usd || 0) + Math.round(parseFloat(amountUSD)),
          payments_count: (existingClient.payments_count || 0) + 1,
          last_payment_at: now.toISOString(),
          last_payment_method: '0xprocessing',
          source: '0xprocessing',
          currency: normalizeCurrency(Currency),
          original_amount: Math.round(parseFloat(amountUSD)),
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
          total_paid_usd: Math.round(parseFloat(amountUSD)),
          payments_count: 1,
          last_payment_at: now.toISOString(),
          last_payment_method: '0xprocessing',
          currency: normalizeCurrency(Currency),
          original_amount: Math.round(parseFloat(amountUSD)),
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

      // НЕ обновляем in_channel/in_chat здесь!
      // Статус обновится через telegram-member-webhook когда юзер РЕАЛЬНО вступит

      // Формируем ОДНО сообщение с приветствием и кнопками
      const welcomeText = isNewClient
        ? `🎉 <b>Добро пожаловать в Premium AR Club!</b>\n\n` +
        `Ваша подписка <b>${period.name}</b> активирована на ${period.days} дней.\n\n` +
        `👇 Нажмите кнопки ниже для доступа:\n\n` +
        `📞 Служба заботы: @Andrey_cryptoinvestor`
        : `✅ <b>Подписка продлена!</b>\n\n` +
        `Добавлено <b>${period.days} дней</b> к вашей подписке ${period.name}.\n\n` +
        `👇 Нажмите кнопки ниже для доступа:\n\n` +
        `📞 Служба заботы: @Andrey_cryptoinvestor`;

      // Формируем кнопки
      const buttons = [];
      if (channelLink) {
        buttons.push([{ text: '📢 Канал Premium', url: channelLink }]);
      }
      if (chatLink) {
        buttons.push([{ text: '💬 Чат Premium', url: chatLink }]);
      }

      const replyMarkup = { inline_keyboard: buttons };

      // Получаем картинку карты для тарифа
      const cardImageUrl = TARIFF_CARD_IMAGES[period.tariff] || TARIFF_CARD_IMAGES['classic'];

      // Отправляем сообщение с картинкой карты
      const photoResult = await sendTelegramPhoto(finalTelegramId, cardImageUrl, welcomeText, replyMarkup);

      if (photoResult?.ok) {
        log('✅ Welcome message with card image sent');
      } else {
        // Fallback на текстовое сообщение если фото не отправилось
        log('⚠️ Photo failed, sending text message');
        await sendTelegramMessage(finalTelegramId, welcomeText, replyMarkup);
        log('✅ Welcome text message sent');
      }
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
    // 6.1. ТРЕКИНГ UTM КОНВЕРСИИ
    // ============================================
    if (finalTelegramId) {
      await trackUtmConversion(finalTelegramId);
    }

    // Трекинг конверсии для stream UTM ссылок
    await trackStreamConversion(BillingId);

    // ============================================
    // 7. УВЕДОМЛЕНИЕ АДМИНУ
    // ============================================
    const ADMIN_ID = '190202791';
    const adminMessage = `💰 <b>Новый платёж 0xProcessing (крипта)!</b>\n\n` +
      `👤 ID: <code>${finalTelegramId || 'N/A'}</code>\n` +
      `📋 Тариф: <b>${period.name}</b>\n` +
      `💵 Сумма: <b>$${amountUSD}</b>\n` +
      `🪙 Валюта: ${Currency || 'CRYPTO'}\n` +
      `📅 Дней: ${period.days}\n` +
      `🆕 Новый: ${isNewClient ? 'Да' : 'Нет (продление)'}`;

    await sendTelegramMessage(ADMIN_ID, adminMessage);
    log('📨 Admin notification sent');

    // ============================================
    // 8. УСПЕШНЫЙ ОТВЕТ (200 OK без body для 0xProcessing)
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
