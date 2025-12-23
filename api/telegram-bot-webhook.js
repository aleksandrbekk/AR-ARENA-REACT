// Telegram Bot Webhook для AR ARENA
// Обрабатывает /start команды
// 2025-12-23

import { createClient } from '@supabase/supabase-js';

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

const BOT_TOKEN = '***REMOVED***';
const SUPABASE_URL = 'https://syxjkircmiwpnpagznay.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '***REMOVED***';

const WEB_APP_URL = 'https://ararena.pro';
const PRICING_URL = 'https://ararena.pro/pricing';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// HELPER FUNCTIONS
// ============================================

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] [BotWebhook] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [BotWebhook] ${message}`);
  }
}

// Отправить сообщение
async function sendMessage(chatId, text, replyMarkup = null) {
  try {
    const body = {
      chat_id: chatId,
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

    return await response.json();
  } catch (error) {
    log('❌ sendMessage error', { error: error.message });
    return null;
  }
}

// Проверить подписку пользователя
async function checkSubscription(telegramId) {
  try {
    const { data, error } = await supabase
      .from('premium_clients')
      .select('plan, expires_at')
      .eq('telegram_id', telegramId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  } catch (error) {
    log('❌ checkSubscription error', { error: error.message });
    return null;
  }
}

// Форматировать дату
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Название тарифа
function getTariffName(plan) {
  const names = {
    'classic': 'CLASSIC',
    'gold': 'GOLD',
    'platinum': 'PLATINUM',
    'private': 'PRIVATE'
  };
  return names[plan] || plan.toUpperCase();
}

// ============================================
// ОБРАБОТЧИКИ КОМАНД
// ============================================

// /start premium — приветствие для покупки
async function handleStartPremium(chatId, telegramId) {
  // Проверяем есть ли уже подписка
  const subscription = await checkSubscription(telegramId);

  if (subscription) {
    // Уже есть активная подписка
    const tariffName = getTariffName(subscription.plan);
    const expiresDate = formatDate(subscription.expires_at);

    const text = `✅ <b>У тебя уже есть подписка ${tariffName}</b>

Действует до: ${expiresDate}

Хочешь продлить или повысить уровень?`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '📋 Смотреть тарифы', web_app: { url: PRICING_URL } }]
      ]
    };

    await sendMessage(chatId, text, keyboard);
  } else {
    // Нет подписки — показываем приветствие
    const text = `🔐 <b>Добро пожаловать в Premium AR Club</b>

Закрытое сообщество трейдеров и инвесторов.
9 лет опыта. 82% успешных сделок. 5000+ участников.

<b>Выбери свой уровень доступа:</b>

🖤 CLASSIC — старт в крипте
🥇 GOLD — активный трейдинг
💎 PLATINUM — полный арсенал
🍷 PRIVATE — персональное сопровождение

👇 Жми по кнопке. Выбирай клубную карту`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🎴 Выбрать клубную карту', web_app: { url: PRICING_URL } }]
      ]
    };

    await sendMessage(chatId, text, keyboard);
  }
}

// /start (обычный) — стандартное приветствие
async function handleStart(chatId) {
  const text = `🎮 <b>Добро пожаловать в AR ARENA!</b>

Это твоя персональная арена для роста в крипте.

Открой приложение и начни свой путь 👇`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '🚀 Открыть AR ARENA', web_app: { url: WEB_APP_URL } }]
    ]
  };

  await sendMessage(chatId, text, keyboard);
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'AR ARENA Bot Webhook',
      commands: ['/start', '/start premium']
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;
    log('📨 Received update', update);

    // Обрабатываем только сообщения
    if (!update.message) {
      return res.status(200).json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const telegramId = message.from.id;
    const text = message.text || '';

    // Проверяем команду /start
    if (text.startsWith('/start')) {
      const args = text.split(' ').slice(1);
      const param = args[0] || '';

      if (param === 'premium') {
        log(`👤 /start premium from ${telegramId}`);
        await handleStartPremium(chatId, telegramId);
      } else {
        log(`👤 /start from ${telegramId}`);
        await handleStart(chatId);
      }
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    log('❌ Webhook error', { error: error.message, stack: error.stack });
    return res.status(200).json({ ok: true }); // Всегда 200 для Telegram
  }
}
