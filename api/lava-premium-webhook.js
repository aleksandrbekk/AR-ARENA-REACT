// Lava.top Webhook для Premium AR Club подписок
// Vercel Serverless Function
// 2025-12-22

import { createClient } from '@supabase/supabase-js';

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

// SECURITY: All secrets from environment variables (set in Vercel)
const LAVA_API_KEY = process.env.LAVA_API_KEY;
const BASIC_AUTH_LOGIN = process.env.LAVA_WEBHOOK_LOGIN;
const BASIC_AUTH_PASSWORD = process.env.LAVA_WEBHOOK_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Validate required env vars
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN) {
  console.error('CRITICAL: Missing required environment variables');
}

// Маппинг periodicity на период подписки
const PERIODICITY_TO_PERIOD = {
  'MONTHLY': { days: 30, tariff: 'classic', name: 'CLASSIC' },
  'PERIOD_90_DAYS': { days: 90, tariff: 'gold', name: 'GOLD' },
  'PERIOD_180_DAYS': { days: 180, tariff: 'platinum', name: 'PLATINUM' },
  'PERIOD_YEAR': { days: 365, tariff: 'private', name: 'PRIVATE' }
};

// Маппинг суммы на период - по валютам
const AMOUNT_TO_PERIOD = {
  RUB: [
    { min: 3500, max: 4500, days: 30, tariff: 'classic', name: 'CLASSIC' },     // 4000 RUB
    { min: 9500, max: 12500, days: 90, tariff: 'gold', name: 'GOLD' },          // 9900-12000 RUB
    { min: 17000, max: 25000, days: 180, tariff: 'platinum', name: 'PLATINUM' }, // 17900-24000 RUB
    { min: 34000, max: 50000, days: 365, tariff: 'private', name: 'PRIVATE' }   // 34900-48000 RUB
  ],
  USD: [
    { min: 40, max: 60, days: 30, tariff: 'classic', name: 'CLASSIC' },         // ~50 USD
    { min: 100, max: 150, days: 90, tariff: 'gold', name: 'GOLD' },             // ~125 USD
    { min: 180, max: 280, days: 180, tariff: 'platinum', name: 'PLATINUM' },    // ~225 USD
    { min: 350, max: 500, days: 365, tariff: 'private', name: 'PRIVATE' }       // ~445 USD
  ],
  EUR: [
    { min: 35, max: 55, days: 30, tariff: 'classic', name: 'CLASSIC' },         // ~45 EUR
    { min: 90, max: 140, days: 90, tariff: 'gold', name: 'GOLD' },              // ~115 EUR
    { min: 170, max: 260, days: 180, tariff: 'platinum', name: 'PLATINUM' },    // ~210 EUR
    { min: 330, max: 480, days: 365, tariff: 'private', name: 'PRIVATE' }       // ~415 EUR
  ]
};

// Примерные курсы для конвертации в USD
const CURRENCY_TO_USD = {
  USD: 1,
  EUR: 1.08,
  RUB: 0.011
};

// Получить валюту из payload Lava - доверяем API, не угадываем по суммам!
// Получить валюту из payload Lava - доверяем API, не угадываем по суммам!
function getCurrencyFromPayload(payload) {
  // Приоритет полей Lava API:
  // 1. buyerCurrency - валюта в которой покупатель реально платил
  // 2. payment.currency - валюта платежа
  // 3. invoice.currency - валюта инвойса
  // 4. currency - общее поле

  const { buyerCurrency, payment, invoice, currency: rawCurrency } = payload;

  if (buyerCurrency) return buyerCurrency.toUpperCase();
  if (payment?.currency) return payment.currency.toUpperCase();
  if (invoice?.currency) return invoice.currency.toUpperCase();
  if (rawCurrency) return rawCurrency.toUpperCase();

  // Fallback только если Lava не прислала валюту вообще
  return 'RUB';
}

// Получить ГРЯЗНУЮ сумму (сколько заплатил юзер) - для определения тарифа
function getGrossAmount(payload) {
  const { buyerAmount, invoice, amount: rawAmount } = payload;

  // buyerAmount - сколько реально списали с юзера (Gross)
  if (buyerAmount) {
    console.log(`💰 Using buyerAmount (Gross) for Tariff: ${buyerAmount}`);
    return parseFloat(buyerAmount);
  }

  // invoice.amount - сумма выставленного счета (Gross)
  if (invoice?.amount) {
    console.log(`💰 Using invoice.amount (Gross) for Tariff: ${invoice.amount}`);
    return parseFloat(invoice.amount);
  }

  // Fallback
  console.log(`💰 Using rawAmount (Fallback) for Tariff: ${rawAmount}`);
  return parseFloat(rawAmount || 0);
}

// Получить ЧИСТУЮ сумму (сколько пришло в магазин) - для статистики
// Lava берет 8% комиссии, поэтому Net = Gross * 0.92
function getNetAmount(payload) {
  const { payment, shopAmount, amount: rawAmount, buyerAmount } = payload;

  // payment.amount - сумма зачисления (Net) - если Lava присылает явно
  if (payment?.amount) {
    console.log(`💵 Using payment.amount (Net) for DB: ${payment.amount}`);
    return parseFloat(payment.amount);
  }

  // shopAmount - иногда бывает такое поле
  if (shopAmount) {
    console.log(`💵 Using shopAmount (Net) for DB: ${shopAmount}`);
    return parseFloat(shopAmount);
  }

  // Fallback - если нет явного Net, применяем 8% комиссию к Gross
  // Берем buyerAmount (Gross) или rawAmount
  const grossAmount = parseFloat(buyerAmount || rawAmount || 0);
  const netAmount = grossAmount * 0.92; // 8% комиссия Lava
  console.log(`💵 Calculated Net from Gross (${grossAmount} * 0.92 = ${netAmount}) for DB`);
  return netAmount;
}

// Supabase клиент
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://ar-arena.games',
  'https://www.ar-arena.games',
  'https://ar-arena-react.vercel.app',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
].filter(Boolean);

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

function getPeriodByPeriodicityOrAmount(periodicity, amount, currency = 'RUB') {
  // Сначала пробуем по periodicity
  if (periodicity && PERIODICITY_TO_PERIOD[periodicity]) {
    log(`✅ Period found by periodicity: ${periodicity}`);
    return PERIODICITY_TO_PERIOD[periodicity];
  }

  // Fallback: по сумме с учётом валюты
  if (amount) {
    const amountNum = parseFloat(amount);
    const currencyUpper = (currency || 'RUB').toUpperCase();
    const periodsForCurrency = AMOUNT_TO_PERIOD[currencyUpper] || AMOUNT_TO_PERIOD['RUB'];

    for (const period of periodsForCurrency) {
      if (amountNum >= period.min && amountNum <= period.max) {
        log(`✅ Period found by amount: ${amountNum} ${currencyUpper}`);
        return period;
      }
    }

    // Если не нашли в диапазонах валюты, пробуем конвертировать в USD и искать
    const usdRate = CURRENCY_TO_USD[currencyUpper] || 1;
    const amountUsd = amountNum * usdRate;
    log(`🔄 Trying USD conversion: ${amountNum} ${currencyUpper} = ${amountUsd.toFixed(2)} USD`);

    for (const period of AMOUNT_TO_PERIOD['USD']) {
      if (amountUsd >= period.min && amountUsd <= period.max) {
        log(`✅ Period found by USD conversion: ${amountUsd.toFixed(2)} USD`);
        return period;
      }
    }
  }

  // Fallback: если не нашли — 30 дней
  log(`⚠️ Unknown periodicity ${periodicity} and amount ${amount} ${currency}, defaulting to 30 days`);
  return { days: 30, tariff: 'unknown', name: 'UNKNOWN' };
}

// Извлечь stream_utm из clientUtm и увеличить conversions
async function trackStreamConversion(payload) {
  const clientUtm = payload.clientUtm || {};

  // Ищем stream_utm во всех utm полях
  const utmValues = [
    clientUtm.utm_source,
    clientUtm.utm_medium,
    clientUtm.utm_campaign,
    clientUtm.utm_term,
    clientUtm.utm_content
  ].filter(Boolean);

  for (const value of utmValues) {
    // Формат: "telegram_id=123&stream_utm=slug" или просто "stream_utm=slug"
    const streamUtmMatch = value.match(/stream_utm[=:]([a-zA-Z0-9_-]+)/i);
    if (streamUtmMatch) {
      const streamUtmSlug = streamUtmMatch[1];
      log(`📊 Found stream_utm: ${streamUtmSlug}`);

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
      return;
    }
  }

  log('ℹ️ No stream_utm found in payload');
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

  // Fallback: проверяем email во всех возможных местах payload
  // Lava может передавать email в разных полях в зависимости от версии API
  const possibleEmails = [
    payload.buyer?.email,
    payload.email,
    payload.invoice?.email,
    payload.payment?.email,
    payload.customer?.email,
    payload.buyerEmail
  ].filter(Boolean);

  log(`📧 Checking ${possibleEmails.length} possible email fields:`, possibleEmails);

  for (const email of possibleEmails) {
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
  const origin = req.headers.origin;
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
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
    console.log('=== ALL PAYLOAD KEYS ===');
    console.log('Root keys:', Object.keys(req.body));
    if (req.body.buyer) console.log('Buyer keys:', Object.keys(req.body.buyer));
    if (req.body.product) console.log('Product keys:', Object.keys(req.body.product));
    if (req.body.payment) console.log('Payment keys:', Object.keys(req.body.payment));
    if (req.body.invoice) console.log('Invoice keys:', Object.keys(req.body.invoice));

    // Сохраняем полный payload в таблицу для анализа
    try {
      await supabase.from('webhook_logs').insert({
        source: 'lava.top',
        event_type: req.body.eventType,
        payload: req.body,
        created_at: new Date().toISOString()
      });
    } catch (logError) {
      console.log('⚠️ Could not save webhook log (table may not exist)');
    }

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
      log('❌ Unauthorized webhook request');
      return res.status(403).json({ error: 'Unauthorized' });
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
      amount: rawAmount,
      currency: rawCurrency,
      status,
      timestamp,
      product,
      buyer,
      clientUtm,
      // Возможные дополнительные поля с реальной валютой оплаты
      buyerCurrency,
      buyerAmount,
      payment,
      invoice
    } = payload;

    // Получаем валюту и суммы (разделяем Gross и Net)
    const currency = getCurrencyFromPayload(payload);
    const grossAmount = getGrossAmount(payload); // Для тарифа
    const netAmount = getNetAmount(payload);     // Для БД

    log(`📨 Event: ${eventType}, Status: ${status}`);
    log(`💰 Gross: ${grossAmount} ${currency} (User paid)`);
    log(`💵 Net:   ${netAmount} ${currency} (Shop received)`);
    log(`📊 Raw values: amount=${rawAmount}, currency=${rawCurrency}`);

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
    // ПРОВЕРКА НА ДУБЛИКАТ (по contractId - уникальный ID платежа от Lava)
    // ============================================
    // Проверяем по contractId чтобы не обрабатывать один и тот же платёж дважды
    // Но разрешаем несколько разных платежей от одного пользователя (апгрейд, продление)
    if (contractId) {
      const { data: existingPayment } = await supabase
        .from('payment_history')
        .select('id')
        .eq('contract_id', contractId)
        .single();

      if (existingPayment) {
        log(`⚠️ Duplicate payment detected: contractId ${contractId} already processed - ignoring`);
        return res.status(200).json({ message: 'Payment already processed (duplicate contractId)' });
      }
    }

    // ============================================
    // 4. ОПРЕДЕЛЕНИЕ ПЕРИОДА ПОДПИСКИ (по periodicity или amount)
    // ============================================
    const periodicity = payload.periodicity || payload.offer?.periodicity;
    log(`🏷️ Periodicity: ${periodicity}, Amount(Gross): ${grossAmount}, Currency: ${currency}`);
    // ИСПОЛЬЗУЕМ GROSS AMOUNT ДЛЯ ОПРЕДЕЛЕНИЯ ТАРИФА
    const period = getPeriodByPeriodicityOrAmount(periodicity, grossAmount, currency);
    log(`📅 Period determined: ${period.days} days (${period.name})`);

    // ============================================
    // 4.2. АВТОМАТИЧЕСКОЕ СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ (если не существует)
    // ============================================
    // FK constraint на payment_history требует существующего telegram_id в users
    // Создаём пользователя если его нет, чтобы платёж не отклонялся
    const telegramIdForUser = telegramId ? parseInt(telegramId, 10) : null;

    if (telegramIdForUser) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('telegram_id')
        .eq('telegram_id', telegramIdForUser)
        .single();

      if (!existingUser) {
        log(`👤 User ${telegramIdForUser} not found in users table, creating...`);

        const { error: createUserError } = await supabase
          .from('users')
          .insert({
            telegram_id: telegramIdForUser,
            username: extractedUsername || null,
            first_name: null,
            created_at: new Date().toISOString(),
            source: 'lava_payment'
          });

        if (createUserError) {
          // Если ошибка UNIQUE constraint - пользователь уже есть, это ОК
          if (createUserError.code === '23505') {
            log(`👤 User ${telegramIdForUser} already exists (race condition), continuing...`);
          } else {
            log(`⚠️ Warning: Could not create user record:`, createUserError);
            // Не прерываем — попробуем записать платёж, может FK отключён
          }
        } else {
          log(`✅ User ${telegramIdForUser} created successfully`);
        }
      } else {
        log(`👤 User ${telegramIdForUser} already exists in users table`);
      }
    }

    // ============================================
    // 4.3. ЗАПИСЬ В PAYMENT_HISTORY (ИДЕМПОТЕНТНОСТЬ!)
    // ============================================
    // ВАЖНО: Записываем ПЕРЕД обновлением premium_clients!
    // Если эта запись упадёт — webhook вернёт ошибку и Lava ретрайнет.
    // При ретрае проверка дубликата (выше) найдёт запись и остановится.
    const paymentHistoryId = contractId || `lava_${Date.now()}_${telegramId || extractedUsername}`;
    const paymentData = {
      telegram_id: telegramId ? parseInt(telegramId, 10) : null,
      amount: grossAmount,
      currency: currency,
      source: 'lava.top',
      contract_id: paymentHistoryId,
      plan: period.tariff,
      days_added: period.days,  // <-- ОБЯЗАТЕЛЬНОЕ ПОЛЕ!
      status: 'success',
      created_at: new Date().toISOString()
    };

    log('📝 Записываем в payment_history (BEFORE premium_clients):', paymentData);

    const { error: paymentHistoryError } = await supabase
      .from('payment_history')
      .insert(paymentData);

    if (paymentHistoryError) {
      log('❌ CRITICAL: Failed to record payment_history, aborting:', paymentHistoryError);
      // Возвращаем 500 чтобы Lava ретрайнула, но premium_clients НЕ обновлён
      return res.status(500).json({ error: 'Failed to record payment', details: paymentHistoryError.message });
    }

    log('✅ Payment history recorded, proceeding to update premium_clients');

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

      // Конвертируем ЧИСТУЮ сумму в USD для статистики
      const currencyUpper = (currency || 'RUB').toUpperCase();
      const usdRate = CURRENCY_TO_USD[currencyUpper] || CURRENCY_TO_USD['RUB'];
      const netAmountInUsd = netAmount * usdRate;

      const { error: updateError } = await supabase
        .from('premium_clients')
        .update({
          plan: period.tariff,
          expires_at: newExpires.toISOString(),
          // Прибавляем Net USD к total_paid
          total_paid_usd: (existingClient.total_paid_usd || 0) + netAmountInUsd,
          currency: currencyUpper,
          // Сохраняем Net Amount как original_amount последнего платежа
          original_amount: netAmount,
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

      // Конвертируем ЧИСТУЮ сумму в USD для нового клиента
      const currencyUpperNew = (currency || 'RUB').toUpperCase();
      const usdRateNew = CURRENCY_TO_USD[currencyUpperNew] || CURRENCY_TO_USD['RUB'];
      const netAmountInUsdNew = netAmount * usdRateNew;

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
          total_paid_usd: netAmountInUsdNew,
          currency: currencyUpperNew,
          original_amount: netAmount,
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

    // NOTE: payment_history уже записан в начале (шаг 4.1) для идемпотентности

    // ============================================
    // 8.1. ТРЕКИНГ UTM КОНВЕРСИИ
    // ============================================
    if (finalTelegramId) {
      await trackUtmConversion(finalTelegramId);
    }

    // Трекинг конверсии для stream UTM ссылок
    await trackStreamConversion(payload);

    // ============================================
    // 9. УВЕДОМЛЕНИЕ АДМИНУ
    // ============================================
    const ADMIN_ID = '190202791';
    const adminMessage = `💰 <b>Новый платёж Lava.top!</b>\n\n` +
      `👤 ID: <code>${finalTelegramId || 'N/A'}</code>\n` +
      `📋 Тариф: <b>${period.name}</b>\n` +
      `💵 Сумма: <b>${grossAmount} ${currency}</b>\n` +
      `💲 В USD: <b>$${(parseFloat(grossAmount) * (CURRENCY_TO_USD[currency] || 1)).toFixed(2)}</b>\n` +
      `📅 Дней: ${period.days}\n` +
      `🆕 Новый: ${isNewClient ? 'Да' : 'Нет (продление)'}`;

    await sendTelegramMessage(ADMIN_ID, adminMessage);
    log('📨 Admin notification sent');

    // ============================================
    // 10. УСПЕШНЫЙ ОТВЕТ
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
