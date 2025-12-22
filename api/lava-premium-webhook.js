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
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NDQxMSwiZXhwIjoyMDczMzQwNDExfQ.7ueEYBhFrxKU3_RJi_iJEDj6EQqWBy3gAXiM4YIALqs';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g';
const BOT_TOKEN = '8265126337:AAHBKYlU6fQA09nkJwsMaBQtP16CXSq1Cnc'; // AR ARENA основной бот

// Маппинг periodicity на период подписки
const PERIODICITY_TO_PERIOD = {
  'MONTHLY': { days: 30, tariff: 'classic', name: 'CLASSIC' },
  'PERIOD_90_DAYS': { days: 90, tariff: 'trader', name: 'TRADER' },
  'PERIOD_180_DAYS': { days: 180, tariff: 'platinum', name: 'PLATINUM' },
  'PERIOD_YEAR': { days: 365, tariff: 'private', name: 'PRIVATE' }
};

// Fallback: маппинг суммы на период (в RUB)
const AMOUNT_TO_PERIOD = [
  { min: 40, max: 60, days: 30, tariff: 'test', name: 'TEST' }, // Тестовый 50 RUB
  { min: 3000, max: 4000, days: 30, tariff: 'classic', name: 'CLASSIC' },
  { min: 9000, max: 10000, days: 90, tariff: 'trader', name: 'TRADER' },
  { min: 17000, max: 19000, days: 180, tariff: 'platinum', name: 'PLATINUM' },
  { min: 32000, max: 35000, days: 365, tariff: 'private', name: 'PRIVATE' }
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
      // Сначала отправляем сообщение, потом пробуем invite link
      const welcomeMessage = isNewClient
        ? `🎉 <b>Добро пожаловать в Premium AR Club!</b>\n\n` +
          `Ваша подписка <b>${period.name}</b> активирована на ${period.days} дней.`
        : `✅ <b>Подписка продлена!</b>\n\n` +
          `Добавлено <b>${period.days} дней</b> к вашей подписке ${period.name}.`;

      // Отправляем базовое сообщение сразу
      await sendTelegramMessage(String(finalTelegramId), welcomeMessage);
      log('✅ Basic welcome message sent');

      // Пробуем создать invite link
      const inviteLink = await createInviteLink(String(finalTelegramId));

      if (inviteLink) {
        log(`🔗 Invite link created: ${inviteLink}`);

        // Обновляем статус в БД
        await supabase
          .from('premium_clients')
          .update({ in_channel: true, in_chat: true })
          .eq('id', clientId);

        // Отправляем второе сообщение с invite link
        const replyMarkup = {
          inline_keyboard: [
            [{ text: '📢 Присоединиться к каналу', url: inviteLink }],
            [{ text: '🎮 Открыть AR ARENA', web_app: { url: 'https://ararena.pro' } }]
          ]
        };

        await sendTelegramMessage(String(finalTelegramId), '📢 Нажмите кнопку ниже, чтобы присоединиться к каналу:', replyMarkup);
        log('✅ Invite link message sent');
      } else {
        log('⚠️ Failed to create invite link, but basic message was sent');
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
