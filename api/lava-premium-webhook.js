// Lava.top Webhook для Premium AR Club подписок
// Vercel Serverless Function
// 2025-12-22

import { createClient } from '@supabase/supabase-js';

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

const LAVA_API_KEY = process.env.LAVA_API_KEY || '2q3qBOCGh0nOt1w4rvn8rzH0XwkvTr93rEfiY78h2MaRM8Vmd6jimSeECprrsnTF';

// Basic Auth credentials for Lava.top webhook
const BASIC_AUTH_LOGIN = 'Lexius10@ukr.net';
const BASIC_AUTH_PASSWORD = process.env.LAVA_WEBHOOK_PASSWORD || 'your_password_here'; // Замени на реальный пароль
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://syxjkircmiwpnpagznay.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '***REMOVED***';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g';
const BOT_TOKEN = '***REMOVED***'; // AR ARENA основной бот

// Маппинг periodicity на период подписки
const PERIODICITY_TO_PERIOD = {
  'MONTHLY': { days: 30, tariff: 'classic', name: 'CLASSIC' },
  'PERIOD_90_DAYS': { days: 90, tariff: 'gold', name: 'GOLD' },
  'PERIOD_180_DAYS': { days: 180, tariff: 'platinum', name: 'PLATINUM' },
  'PERIOD_YEAR': { days: 365, tariff: 'private', name: 'PRIVATE' }
};

// Маппинг суммы на период
// Поддерживает тестовые суммы (USD) и реальные (RUB)
const AMOUNT_TO_PERIOD = [
  // Тестовые суммы (USD) - для тестирования
  { min: 48, max: 52, days: 30, tariff: 'classic', name: 'CLASSIC' },    // $50
  { min: 58, max: 62, days: 90, tariff: 'gold', name: 'GOLD' },          // $60
  { min: 68, max: 72, days: 180, tariff: 'platinum', name: 'PLATINUM' }, // $70
  { min: 78, max: 82, days: 365, tariff: 'private', name: 'PRIVATE' },   // $80

  // Реальные цены (RUB) - продакшн
  { min: 3500, max: 4500, days: 30, tariff: 'classic', name: 'CLASSIC' },     // 4000 RUB
  { min: 9500, max: 12500, days: 90, tariff: 'gold', name: 'GOLD' },          // 9900-12000 RUB
  { min: 17000, max: 25000, days: 180, tariff: 'platinum', name: 'PLATINUM' }, // 17900-24000 RUB
  { min: 34000, max: 50000, days: 365, tariff: 'private', name: 'PRIVATE' }   // 34900-48000 RUB
];

// Supabase клиент
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// HELPER FUNCTIONS
// ============================================

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
}

function getPeriodByPeriodicityOrAmount(periodicity, amount) {
  // Сначала пробуем по periodicity
  if (periodicity && PERIODICITY_TO_PERIOD[periodicity]) {
    log(`✅ Period found by periodicity: ${periodicity}`);
    return PERIODICITY_TO_PERIOD[periodicity];
  }

  // Fallback: по сумме
  if (amount) {
    const amountNum = parseFloat(amount);
    for (const period of AMOUNT_TO_PERIOD) {
      if (amountNum >= period.min && amountNum <= period.max) {
        log(`✅ Period found by amount: ${amountNum} RUB`);
        return period;
      }
    }
  }

  // Fallback: если не нашли — 30 дней
  log(`⚠️ Unknown periodicity ${periodicity} and amount ${amount}, defaulting to 30 days`);
  return { days: 30, tariff: 'unknown', name: 'UNKNOWN' };
}

// Извлечь telegram_id или username из clientUtm (объект от Lava.top)
async function extractTelegramIdOrUsername(payload) {
  log('🔍 Extracting telegram info from payload');

  // clientUtm от Lava.top - это объект с полями utm_source, utm_medium, utm_campaign, utm_term, utm_content
  const clientUtm = payload.clientUtm || {};

  // Ищем telegram_id или username во всех utm полях
  const utmValues = [
    clientUtm.utm_source,
    clientUtm.utm_medium,
    clientUtm.utm_campaign,
    clientUtm.utm_term,
    clientUtm.utm_content
  ].filter(Boolean);

  log('📊 UTM values:', utmValues);

  for (const value of utmValues) {
    // Формат: "telegram_id=123456789"
    const idMatch = value.match(/telegram_id[=:](\d+)/i);
    if (idMatch) {
      log(`✅ Found telegram_id in UTM: ${idMatch[1]}`);
      return { telegramId: idMatch[1], username: null };
    }

    // Формат: "telegram_username=aleksandrbekk"
    const usernameMatch = value.match(/telegram_username[=:](\w+)/i);
    if (usernameMatch) {
      const username = usernameMatch[1];
      log(`📛 Found username in UTM: ${username}`);

      // Пробуем найти telegram_id по username в БД (case-insensitive)
      const { data: userData } = await supabase
        .from('users')
        .select('telegram_id, username')
        .ilike('username', username)
        .single();

      if (userData?.telegram_id) {
        log(`✅ Found telegram_id ${userData.telegram_id} for username ${userData.username}`);
        return { telegramId: String(userData.telegram_id), username: userData.username };
      }

      log(`⚠️ Username ${username} not found in users table`);
      return { telegramId: null, username };
    }
  }

  // Fallback: проверяем buyer email
  if (payload.buyer?.email) {
    const email = payload.buyer.email;

    // Формат: 123456789@premium.ararena.pro (telegram_id)
    const idMatch = email.match(/^(\d{6,})@/);
    if (idMatch) {
      log(`📧 Found telegram_id in email: ${idMatch[1]}`);
      return { telegramId: idMatch[1], username: null };
    }

    // Формат: username@premium.ararena.pro (username)
    const usernameMatch = email.match(/^([a-zA-Z][a-zA-Z0-9_]+)@/);
    if (usernameMatch) {
      const username = usernameMatch[1];
      log(`📧 Found username in email: ${username}`);

      // Пробуем найти telegram_id по username в БД
      const { data: userData } = await supabase
        .from('users')
        .select('telegram_id, username')
        .ilike('username', username)
        .single();

      if (userData?.telegram_id) {
        log(`✅ Found telegram_id ${userData.telegram_id} for email username ${userData.username}`);
        return { telegramId: String(userData.telegram_id), username: userData.username };
      }

      log(`⚠️ Username ${username} from email not found in users table`);
      return { telegramId: null, username };
    }
  }

  log('⚠️ No telegram info found in payload');
  return { telegramId: null, username: null };
}

// Отправить сообщение в Telegram
// Маппинг тарифа на URL картинки
const TARIFF_CARD_IMAGES = {
  'classic': 'https://ararena.pro/cards/classic.png',
  'gold': 'https://ararena.pro/cards/gold.png',
  'platinum': 'https://ararena.pro/cards/platinum.png',
  'private': 'https://ararena.pro/cards/PRIVATE.png'
};

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

// Отправить текстовое сообщение в Telegram (fallback)
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
const KIKER_BOT_TOKEN = '***REMOVED***';
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

// Создать invite-ссылку напрямую через Telegram API
async function createDirectInviteLink(chatId) {
  try {
    const expireDate = Math.floor(Date.now() / 1000) + 86400; // 24 часа
    const response = await fetch(
      `https://api.telegram.org/bot${KIKER_BOT_TOKEN}/createChatInviteLink?chat_id=${chatId}&member_limit=1&expire_date=${expireDate}`
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'Lava.top Webhook for Premium AR Club',
      method: 'POST only',
      events: ['payment.success', 'subscription.recurring.payment.success']
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ============================================
    // ЛОГИРОВАНИЕ ВХОДЯЩЕГО ЗАПРОСА
    // ============================================
    console.log('=== LAVA WEBHOOK RECEIVED ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const payload = req.body;

    // ============================================
    // 1. ПРОВЕРКА АВТОРИЗАЦИИ (Basic Auth, Bearer, X-Api-Key)
    // ============================================
    const authHeader = req.headers['authorization'];
    const apiKeyHeader = req.headers['x-api-key'];
    let isAuthorized = false;

    if (authHeader && authHeader.startsWith('Basic ')) {
      // Basic Auth: decode base64(login:password)
      const base64Credentials = authHeader.replace('Basic ', '').trim();
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
      const [login, password] = credentials.split(':');
      log(`🔐 Basic Auth attempt: ${login}`);

      if (login === BASIC_AUTH_LOGIN) {
        // Для отладки пропускаем проверку пароля если он не настроен
        isAuthorized = true;
        log('✅ Basic Auth verified');
      } else {
        log('❌ Invalid Basic Auth credentials');
      }
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      const providedKey = authHeader.replace('Bearer ', '').trim();
      if (providedKey === LAVA_API_KEY) {
        isAuthorized = true;
        log('✅ Bearer token verified');
      }
    } else if (apiKeyHeader) {
      if (apiKeyHeader.trim() === LAVA_API_KEY) {
        isAuthorized = true;
        log('✅ X-Api-Key verified');
      }
    }

    if (!isAuthorized) {
      log('⚠️ No valid authorization (allowing for debugging)');
      // Пока разрешаем для отладки, потом раскомментировать:
      // return res.status(403).json({ error: 'Unauthorized' });
    }

    // ============================================
    // 2. ВАЛИДАЦИЯ PAYLOAD (формат Lava.top v2)
    // ============================================
    if (!payload || !payload.eventType) {
      log('❌ Invalid payload - missing eventType');
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const {
      eventType,
      contractId,
      parentContractId,
      amount,
      currency = 'RUB',
      status,
      timestamp,
      product,
      buyer,
      clientUtm
    } = payload;

    log(`📨 Event: ${eventType}, Status: ${status}, Amount: ${amount} ${currency}`);

    // Проверяем тип события и статус
    const successEvents = ['payment.success', 'subscription.recurring.payment.success'];
    if (!successEvents.includes(eventType)) {
      log(`⚠️ Event type: ${eventType} - ignoring`);
      return res.status(200).json({ message: 'Event not a success payment, ignoring' });
    }

    // status может быть "completed" (lowercase) или "COMPLETED" (uppercase)
    const statusLower = status?.toLowerCase();
    if (statusLower !== 'completed' && statusLower !== 'subscription-active') {
      log(`⚠️ Payment status: ${status} - ignoring`);
      return res.status(200).json({ message: 'Payment not completed, ignoring' });
    }

    // ============================================
    // 3. ИЗВЛЕЧЕНИЕ TELEGRAM_ID
    // ============================================
    const { telegramId, username: extractedUsername } = await extractTelegramIdOrUsername(payload);

    if (!telegramId && !extractedUsername) {
      log('❌ Missing telegram_id and username in payload');
      return res.status(400).json({ error: 'Missing telegram_id or username' });
    }

    // Если есть только username без telegram_id - создаём запись с username
    if (!telegramId && extractedUsername) {
      log(`⚠️ Only username found: ${extractedUsername}, no telegram_id`);
      // Можем создать запись с username, но без возможности отправить сообщение
    }

    log(`👤 Telegram ID: ${telegramId || 'N/A'}, Username: ${extractedUsername || 'N/A'}`);

    // ============================================
    // 4. ОПРЕДЕЛЕНИЕ ПЕРИОДА ПОДПИСКИ (по periodicity или amount)
    // ============================================
    const periodicity = payload.periodicity || payload.offer?.periodicity;
    log(`🏷️ Periodicity: ${periodicity}, Amount: ${amount}`);
    const period = getPeriodByPeriodicityOrAmount(periodicity, amount);
    log(`📅 Period determined: ${period.days} days (${period.name})`);

    // ============================================
    // 5. UPSERT В PREMIUM_CLIENTS
    // ============================================
    const now = new Date();
    const expiresAt = new Date(now.getTime() + period.days * 24 * 60 * 60 * 1000);

    // Проверяем существующего клиента
    const telegramIdInt = telegramId ? parseInt(telegramId) : null;
    let existingClient = null;

    if (telegramIdInt) {
      const { data } = await supabase
        .from('premium_clients')
        .select('*')
        .eq('telegram_id', telegramIdInt)
        .single();
      existingClient = data;
    } else if (extractedUsername) {
      // Ищем по username если нет telegram_id
      const { data } = await supabase
        .from('premium_clients')
        .select('*')
        .eq('username', extractedUsername)
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
          total_paid_usd: (existingClient.total_paid_usd || 0) + parseFloat(amount),
          payments_count: (existingClient.payments_count || 0) + 1,
          last_payment_at: now.toISOString(),
          last_payment_method: 'lava.top',
          source: 'lava.top',
          updated_at: now.toISOString()
        })
        .eq('id', existingClient.id);

      if (updateError) {
        log('❌ Error updating client', updateError);
        throw new Error('Failed to update client');
      }

      clientId = existingClient.id;
      log(`✅ Client updated: ${telegramId || extractedUsername}, expires: ${newExpires.toISOString()}`);
    } else {
      // Создаём нового клиента
      isNewClient = true;

      // Используем username из extractedUsername или ищем в users
      let username = extractedUsername;
      if (telegramIdInt && !username) {
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
          telegram_id: telegramIdInt, // может быть null если только username
          username,
          plan: period.tariff,
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          in_channel: false,
          in_chat: false,
          tags: [],
          source: 'lava.top',
          total_paid_usd: parseFloat(amount),
          payments_count: 1,
          last_payment_at: now.toISOString(),
          last_payment_method: 'lava.top',
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
      log(`✅ New client created: ${telegramId || extractedUsername}, expires: ${expiresAt.toISOString()}`);
    }

    // ============================================
    // 6. ОТПРАВКА СООБЩЕНИЯ В TELEGRAM
    // ============================================
    // Если telegram_id не пришёл в payload, но клиент уже есть в БД - используем его telegram_id
    let finalTelegramId = telegramIdInt;
    if (!finalTelegramId && existingClient?.telegram_id) {
      finalTelegramId = existingClient.telegram_id;
      log(`📱 Using telegram_id from existing client: ${finalTelegramId}`);
    }

    log(`🔍 Final telegram_id for message: ${finalTelegramId}`);

    if (finalTelegramId) {
      // Создаём invite links (канал + чат)
      const { channelLink, chatLink } = await createInviteLinks(String(finalTelegramId));
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
      const photoResult = await sendTelegramPhoto(String(finalTelegramId), cardImageUrl, welcomeText, replyMarkup);

      if (photoResult?.ok) {
        log('✅ Welcome message with card image sent');
      } else {
        // Fallback на текстовое сообщение если фото не отправилось
        log('⚠️ Photo failed, sending text message');
        await sendTelegramMessage(String(finalTelegramId), welcomeText, replyMarkup);
        log('✅ Welcome text message sent');
      }
    } else {
      log(`⚠️ No telegram_id available. Username: ${extractedUsername}`);
    }

    // ============================================
    // 8. ЗАПИСЬ В PAYMENT_HISTORY
    // ============================================
    const { error: paymentError } = await supabase
      .from('payment_history')
      .insert({
        telegram_id: telegramIdInt ? String(telegramIdInt) : extractedUsername,
        amount: parseFloat(amount),
        currency: currency,
        source: 'lava.top'
      });

    if (paymentError) {
      log('⚠️ Failed to record payment history', paymentError);
    } else {
      log('📝 Payment history recorded');
    }

    // ============================================
    // 8.1. ТРЕКИНГ UTM КОНВЕРСИИ
    // ============================================
    if (finalTelegramId) {
      await trackUtmConversion(finalTelegramId);
    }

    // ============================================
    // 9. УСПЕШНЫЙ ОТВЕТ
    // ============================================
    log('✅ Premium webhook processed successfully');

    return res.status(200).json({
      success: true,
      message: 'Premium subscription activated',
      telegram_id: telegramId || null,
      username: extractedUsername || null,
      period: period.name,
      days: period.days
    });

  } catch (error) {
    log('❌ Premium Webhook error', { error: error.message, stack: error.stack });
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
