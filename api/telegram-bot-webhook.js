// Telegram Bot Webhook для AR ARENA
// Обрабатывает /start команды
// 2025-12-23

import { createClient } from '@supabase/supabase-js';

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

const BOT_TOKEN = '8265126337:AAHBKYlU6fQA09nkJwsMaBQtP16CXSq1Cnc';
const SUPABASE_URL = 'https://syxjkircmiwpnpagznay.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NDQxMSwiZXhwIjoyMDczMzQwNDExfQ.7ueEYBhFrxKU3_RJi_iJEDj6EQqWBy3gAXiM4YIALqs';

const WEB_APP_URL = 'https://ararena.pro';
const PRICING_URL = 'https://ararena.pro/pricing';

// File ID для welcome картинки (быстрее чем URL)
const WELCOME_IMAGE_FILE_ID = 'AgACAgIAAxkDAAIBgmlKOHkPSECVGl5g6uKX7gnzOTaGAALkC2sb-DpYSqPtt60_I9skAQADAgADeAADNgQ';

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

// Отправить фото
async function sendPhoto(chatId, photo, caption, replyMarkup = null) {
  try {
    const body = {
      chat_id: chatId,
      photo,
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

    return await response.json();
  } catch (error) {
    log('❌ sendPhoto error', { error: error.message });
    return null;
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
// UTM TRACKING
// ============================================

// Записать клик по UTM-ссылке
async function trackUtmClick(slug) {
  if (!slug) return;

  try {
    // Инкрементируем clicks для этого slug
    const { error } = await supabase.rpc('increment_utm_clicks', { p_slug: slug });

    if (error) {
      // Если функции нет, пробуем обычный update
      await supabase
        .from('utm_links')
        .update({ clicks: supabase.sql`clicks + 1` })
        .eq('slug', slug);
    }

    log(`📊 UTM click tracked: ${slug}`);
  } catch (err) {
    log('❌ trackUtmClick error', { error: err.message });
  }
}

// Сохранить источник для пользователя (для последующего трекинга конверсий)
async function saveUserSource(telegramId, source) {
  if (!source) return;

  try {
    // Сохраняем в таблицу user_sources (если нет - создаём)
    const { error } = await supabase
      .from('user_sources')
      .upsert({
        telegram_id: telegramId,
        source: source,
        created_at: new Date().toISOString()
      }, { onConflict: 'telegram_id' });

    if (error && error.code !== '42P01') { // Игнорируем "table does not exist"
      log('❌ saveUserSource error', { error: error.message });
    }
  } catch (err) {
    log('❌ saveUserSource error', { error: err.message });
  }
}

// ============================================
// ОБРАБОТЧИКИ КОМАНД
// ============================================

// /start premium — приветствие для покупки
async function handleStartPremium(chatId, telegramId, utmSource = null) {
  // Трекаем UTM клик если есть источник
  if (utmSource) {
    await trackUtmClick(utmSource);
    await saveUserSource(telegramId, utmSource);
  }
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
    // Нет подписки — показываем приветствие с картинкой
    const caption = `🔐 <b>Добро пожаловать в Premium AR Club</b>

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

    await sendPhoto(chatId, WELCOME_IMAGE_FILE_ID, caption, keyboard);
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

// /status — проверка подписки
async function handleStatus(chatId, telegramId) {
  const subscription = await checkSubscription(telegramId);

  if (subscription) {
    // Есть активная подписка
    const tariffName = getTariffName(subscription.plan);
    const expiresAt = new Date(subscription.expires_at);
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    const expiresDate = formatDate(subscription.expires_at);

    // Эмодзи в зависимости от оставшихся дней
    let statusEmoji = '✅';
    let urgencyText = '';
    if (daysLeft <= 3) {
      statusEmoji = '⚠️';
      urgencyText = '\n\n<i>Осталось мало времени — продли подписку!</i>';
    } else if (daysLeft <= 7) {
      statusEmoji = '🔔';
    }

    // Карточка тарифа
    const tariffEmoji = {
      'classic': '🖤',
      'gold': '🥇',
      'platinum': '💎',
      'private': '🍷'
    };

    const text = `${statusEmoji} <b>Твоя подписка Premium AR Club</b>

${tariffEmoji[subscription.plan] || '💳'} Тариф: <b>${tariffName}</b>
📅 Действует до: <b>${expiresDate}</b>
⏳ Осталось: <b>${daysLeft} ${getDaysWord(daysLeft)}</b>${urgencyText}`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '📋 Продлить / Повысить', web_app: { url: PRICING_URL } }]
      ]
    };

    await sendMessage(chatId, text, keyboard);
  } else {
    // Нет активной подписки
    const text = `❌ <b>У тебя нет активной подписки</b>

Присоединяйся к Premium AR Club и получи доступ к:
• Ежедневной аналитике рынка
• Фьючерсным сделкам с сопровождением
• Закрытому чату трейдеров
• И многому другому!`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🎴 Выбрать тариф', web_app: { url: PRICING_URL } }]
      ]
    };

    await sendMessage(chatId, text, keyboard);
  }
}

// Склонение слова "день"
function getDaysWord(days) {
  const lastTwo = days % 100;
  const lastOne = days % 10;

  if (lastTwo >= 11 && lastTwo <= 19) {
    return 'дней';
  }
  if (lastOne === 1) {
    return 'день';
  }
  if (lastOne >= 2 && lastOne <= 4) {
    return 'дня';
  }
  return 'дней';
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
      commands: ['/start', '/start premium', '/status', '/sub', '/подписка']
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

      // Парсим UTM: premium_SOURCE или просто premium
      if (param.startsWith('premium')) {
        // Извлекаем источник: premium_instagram -> instagram
        const utmSource = param.includes('_') ? param.split('_').slice(1).join('_') : null;
        log(`👤 /start premium from ${telegramId}`, { utmSource });
        await handleStartPremium(chatId, telegramId, utmSource);
      } else {
        log(`👤 /start from ${telegramId}`);
        await handleStart(chatId);
      }
    }

    // Проверяем команду /status (или /подписка, /sub)
    if (text === '/status' || text === '/подписка' || text === '/sub' || text === '/subscription') {
      log(`👤 /status from ${telegramId}`);
      await handleStatus(chatId, telegramId);
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    log('❌ Webhook error', { error: error.message, stack: error.stack });
    return res.status(200).json({ ok: true }); // Всегда 200 для Telegram
  }
}
