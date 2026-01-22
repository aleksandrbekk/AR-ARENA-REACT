// Telegram Bot Webhook для AR ARENA
// Обрабатывает все сообщения и сохраняет в Inbox
// 2025-12-27

import { createClient } from '@supabase/supabase-js';
import { sanitizeString } from './utils/sanitize.js';

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

// SECURITY: All secrets from environment variables (set in Vercel)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required env vars
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN) {
  console.error('CRITICAL: Missing required environment variables');
}

const WEB_APP_URL = 'https://ararena.pro';
const PRICING_URL = 'https://ararena.pro/pricing';

// URL для welcome картинки (новая с 3 тарифами)
const WELCOME_IMAGE_URL = 'https://ararena.pro/images/ar_premium_club_welcome.jpg';

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
    console.log(`[${timestamp}] [BotWebhook] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [BotWebhook] ${message}`);
  }
}

// ============================================
// INBOX FUNCTIONS - Сохранение сообщений
// ============================================

// Получить или создать conversation (оптимизированная версия)
async function getOrCreateConversation(telegramId, username, firstName, lastName) {
  try {
    // Используем upsert для атомарной операции
    // Санитизируем имена от битых emoji
    const { data, error } = await supabase
      .from('chat_conversations')
      .upsert({
        telegram_id: telegramId,
        username: sanitizeString(username) || null,
        first_name: sanitizeString(firstName) || null,
        last_name: sanitizeString(lastName) || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'telegram_id',
        ignoreDuplicates: false
      })
      .select('id')
      .single();

    if (error) {
      log('❌ getOrCreateConversation error', error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    log('❌ getOrCreateConversation error', { error: err.message });
    return null;
  }
}

// Сохранить входящее сообщение (оптимизированная версия)
async function saveIncomingMessage(conversationId, telegramId, message) {
  try {
    // Санитизируем текст от битых emoji и Unicode
    const text = sanitizeString(message.text || message.caption || '');
    const isCommand = text.startsWith('/');
    const commandName = isCommand ? text.split(' ')[0] : null;

    // Определяем тип сообщения
    let messageType = 'text';
    let mediaFileId = null;

    if (message.photo) {
      messageType = 'photo';
      mediaFileId = message.photo[message.photo.length - 1].file_id;
    } else if (message.video) {
      messageType = 'video';
      mediaFileId = message.video.file_id;
    } else if (message.document) {
      messageType = 'document';
      mediaFileId = message.document.file_id;
    } else if (message.voice) {
      messageType = 'voice';
      mediaFileId = message.voice.file_id;
    } else if (message.sticker) {
      messageType = 'sticker';
      mediaFileId = message.sticker.file_id;
    } else if (message.location) {
      messageType = 'location';
    } else if (message.contact) {
      messageType = 'contact';
    } else if (isCommand) {
      messageType = 'command';
    }

    // Параллельно: сохраняем сообщение + обновляем conversation
    await Promise.all([
      supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        telegram_id: telegramId,
        message_id: message.message_id,
        text: text || null,
        direction: 'incoming',
        message_type: messageType,
        media_file_id: mediaFileId,
        caption: sanitizeString(message.caption || null),
        is_command: isCommand,
        command_name: commandName
      }),
      supabase.from('chat_conversations').update({
        last_message_at: new Date().toISOString(),
        last_message_text: text || '[media]',
        last_message_from: 'user',
        unread_count: supabase.sql`unread_count + 1`,
        is_read: false,
        updated_at: new Date().toISOString()
      }).eq('id', conversationId)
    ]);

  } catch (err) {
    log('❌ saveIncomingMessage error', { error: err.message });
  }
}

// Сохранить исходящее сообщение (оптимизированная версия, fire-and-forget)
function saveOutgoingMessage(conversationId, telegramId, text, sentBy = 'bot') {
  // Санитизируем текст
  const sanitizedText = sanitizeString(text);
  // Не используем await - fire and forget
  Promise.all([
    supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      telegram_id: telegramId,
      text: sanitizedText,
      direction: 'outgoing',
      message_type: 'text',
      sent_by: sentBy
    }),
    supabase.from('chat_conversations').update({
      last_message_at: new Date().toISOString(),
      last_message_text: sanitizedText.substring(0, 100),
      last_message_from: 'bot',
      updated_at: new Date().toISOString()
    }).eq('id', conversationId)
  ]).catch(err => log('❌ saveOutgoingMessage error', { error: err.message }));
}

// ============================================
// TELEGRAM API FUNCTIONS
// ============================================

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

async function checkSubscription(telegramId) {
  try {
    const { data, error } = await supabase
      .from('premium_clients')
      .select('plan, expires_at, source, contract_id, tags')
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

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

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

async function trackBotUser(telegramId, username, firstName, source = null) {
  try {
    const { error } = await supabase
      .from('bot_users')
      .upsert({
        telegram_id: telegramId,
        username: username || null,
        first_name: firstName || null,
        source: source,
        last_seen_at: new Date().toISOString()
      }, {
        onConflict: 'telegram_id',
        ignoreDuplicates: false
      });

    if (error) {
      log('⚠️ trackBotUser error', { error: error.message });
    } else {
      log(`👤 Bot user tracked: ${telegramId}`);
    }
  } catch (err) {
    log('⚠️ trackBotUser error', { error: err.message });
  }
}

async function trackUtmClick(slug) {
  if (!slug) return;

  try {
    const { error } = await supabase.rpc('increment_utm_clicks', { p_slug: slug });

    if (error) {
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

async function saveUserSource(telegramId, source) {
  if (!source) return;

  try {
    const { error } = await supabase
      .from('user_sources')
      .upsert({
        telegram_id: telegramId,
        source: source,
        created_at: new Date().toISOString()
      }, { onConflict: 'telegram_id' });

    if (error && error.code !== '42P01') {
      log('❌ saveUserSource error', { error: error.message });
    }
  } catch (err) {
    log('❌ saveUserSource error', { error: err.message });
  }
}

// ============================================
// ОБРАБОТЧИКИ КОМАНД
// ============================================

async function handleStartPremium(chatId, telegramId, conversationId, utmSource = null, subscription = null) {
  // UTM-трекинг в фоне (не ждём)
  if (utmSource) {
    trackUtmClick(utmSource);
    saveUserSource(telegramId, utmSource);
  }

  if (subscription) {
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
    saveOutgoingMessage(conversationId, telegramId, text); // fire-and-forget
  } else {
    const caption = `🏆 <b>Добро пожаловать в Premium AR Club</b>

Закрытое сообщество трейдеров и инвесторов.
9 лет опыта. 82% успешных сделок.

<b>Выбери свой уровень доступа:</b>

🖤 CLASSIC — старт в крипте
🥇 GOLD — активный трейдинг
💎 PLATINUM — полный арсенал

👇 Жми по кнопке. Выбирай клубную карту

💬 Служба заботы: @Andrey_cryptoinvestor`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🎴 Тарифы', web_app: { url: PRICING_URL } }],
        [{ text: '💬 Поддержка', url: 'https://t.me/Andrey_cryptoinvestor' }]
      ]
    };

    await sendPhoto(chatId, WELCOME_IMAGE_URL, caption, keyboard);
    saveOutgoingMessage(conversationId, telegramId, caption); // fire-and-forget
  }
}

async function handleStart(chatId, telegramId, conversationId) {
  const text = `🎮 <b>Добро пожаловать в AR ARENA!</b>

Это твоя персональная арена для роста в крипте.

Открой приложение и начни свой путь 👇`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '🚀 Открыть AR ARENA', web_app: { url: WEB_APP_URL } }]
    ]
  };

  await sendMessage(chatId, text, keyboard);
  saveOutgoingMessage(conversationId, telegramId, text); // fire-and-forget
}

async function handleStatus(chatId, telegramId, conversationId) {
  const subscription = await checkSubscription(telegramId);

  if (subscription) {
    const tariffName = getTariffName(subscription.plan);
    const expiresAt = new Date(subscription.expires_at);
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    const expiresDate = formatDate(subscription.expires_at);

    let statusEmoji = '✅';
    let urgencyText = '';
    if (daysLeft <= 3) {
      statusEmoji = '⚠️';
      urgencyText = '\n\n<i>Осталось мало времени — продли подписку!</i>';
    } else if (daysLeft <= 7) {
      statusEmoji = '🔔';
    }

    const tariffEmoji = {
      'classic': '🖤',
      'gold': '🥇',
      'platinum': '💎',
      'private': '🍷'
    };

    // Проверяем, отменена ли уже подписка
    const tags = subscription.tags || [];
    const isAlreadyCancelled = tags.includes('subscription_cancelled');

    let cancelledText = '';
    if (isAlreadyCancelled) {
      cancelledText = '\n\n<i>⚠️ Подписка отменена. Доступ сохранится до окончания периода.</i>';
    }

    const text = `${statusEmoji} <b>Твоя подписка Premium AR Club</b>

${tariffEmoji[subscription.plan] || '💳'} Тариф: <b>${tariffName}</b>
📅 Действует до: <b>${expiresDate}</b>
⏳ Осталось: <b>${daysLeft} ${getDaysWord(daysLeft)}</b>${urgencyText}${cancelledText}`;

    // Формируем кнопки
    const buttons = [
      [{ text: '📋 Продлить / Повысить', web_app: { url: PRICING_URL } }]
    ];

    // Добавляем кнопку отмены только для lava.top подписок с contract_id, которые ещё не отменены
    const canCancel = subscription.source === 'lava.top' &&
      subscription.contract_id &&
      !isAlreadyCancelled;

    if (canCancel) {
      buttons.push([{ text: '❌ Отменить подписку', callback_data: 'cancel_subscription_confirm' }]);
    }

    const keyboard = {
      inline_keyboard: buttons
    };

    await sendMessage(chatId, text, keyboard);
    saveOutgoingMessage(conversationId, telegramId, text); // fire-and-forget
  } else {
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
    saveOutgoingMessage(conversationId, telegramId, text); // fire-and-forget
  }
}

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
// SUBSCRIPTION CANCELLATION HANDLERS
// ============================================

// Показать подтверждение отмены подписки
async function handleCancelSubscriptionConfirm(chatId, telegramId, callbackQueryId) {
  log(`[CANCEL] Showing confirmation to ${telegramId}`);

  // Сначала отвечаем на callback query чтобы убрать "часики"
  await answerCallbackQuery(callbackQueryId);

  const text = `⚠️ <b>Вы уверены, что хотите отменить подписку?</b>

Если вы отмените подписку, то потеряете:
• Доступ к закрытому каналу Premium
• Доступ к закрытому чату трейдеров
• Ежедневную аналитику рынка
• Фьючерсные сделки с сопровождением
• Все остальные преимущества Premium AR Club

⚠️ <i>Подписка будет отменена, но доступ останется до конца текущего оплаченного периода.</i>

Вы точно уверены?`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '✅ Да, отменить', callback_data: `cancel_subscription_yes_${telegramId}` }],
      [{ text: '❌ Нет, оставить', callback_data: 'cancel_subscription_no' }]
    ]
  };

  await sendMessage(chatId, text, keyboard);
}

// Отменить подписку
async function handleCancelSubscriptionYes(chatId, telegramId, callbackQueryId) {
  log(`[CANCEL] User ${telegramId} confirmed cancellation`);

  // Отвечаем на callback query
  await answerCallbackQuery(callbackQueryId, '⏳ Отменяем подписку...');

  try {
    // Вызываем API отмены - используем production URL
    // VERCEL_URL может быть не установлен или иметь неправильный формат
    const apiUrl = 'https://ar-arena-react.vercel.app/api/lava-cancel-subscription';

    log(`[CANCEL] Calling API: ${apiUrl} for telegram_id: ${telegramId}`);

    // Создаем AbortController для таймаута (AbortSignal.timeout может не поддерживаться)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'TelegramBot/1.0'
      },
      body: JSON.stringify({ telegram_id: telegramId }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    log(`[CANCEL] API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      log(`[CANCEL] API error response:`, { status: response.status, body: errorText });
      
      let errorMessage = 'Попробуйте позже или обратитесь в поддержку.';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch (e) {
        // Если не JSON, используем дефолтное сообщение
      }

      const text = `❌ <b>Ошибка отмены подписки</b>

${errorMessage}

Если проблема повторяется, обратитесь в поддержку: @Andrey_cryptoinvestor`;

      await sendMessage(chatId, text);
      return;
    }

    const result = await response.json();
    log(`[CANCEL] API response:`, result);

    if (result.success) {
      log(`[CANCEL] Subscription cancelled successfully for ${telegramId}`);

      const expiresDate = result.expires_at ? formatDate(result.expires_at) : 'конца оплаченного периода';

      const text = `✅ <b>Подписка отменена</b>

Ваш доступ к Premium AR Club сохранится до <b>${expiresDate}</b>.

Мы будем рады видеть вас снова! 🙏`;

      await sendMessage(chatId, text);
    } else {
      log(`[CANCEL] Failed to cancel subscription for ${telegramId}:`, result);

      const errorMessage = result.message || 'Попробуйте позже или обратитесь в поддержку.';

      const text = `❌ <b>Ошибка отмены подписки</b>

${errorMessage}

Если проблема повторяется, обратитесь в поддержку: @Andrey_cryptoinvestor`;

      await sendMessage(chatId, text);
    }
  } catch (error) {
    // Обработка разных типов ошибок
    const errorDetails = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
    
    log(`[CANCEL] Network error for ${telegramId}:`, errorDetails);

    let errorText = 'Не удалось связаться с сервером. Попробуйте позже.';
    
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      errorText = 'Превышено время ожидания ответа сервера. Попробуйте позже.';
    } else if (error.message.includes('fetch')) {
      errorText = 'Ошибка подключения к серверу. Проверьте интернет-соединение.';
    }

    const text = `❌ <b>Ошибка сети</b>

${errorText}

Если проблема повторяется, обратитесь в поддержку: @Andrey_cryptoinvestor`;

    await sendMessage(chatId, text);
  }
}

// Пользователь отказался отменять
async function handleCancelSubscriptionNo(chatId, callbackQueryId) {
  log(`[CANCEL] User declined cancellation`);

  await answerCallbackQuery(callbackQueryId, '✅ Подписка сохранена');

  const text = `✅ <b>Подписка сохранена</b>

Спасибо, что остаётесь с нами! 🙏

Мы продолжим предоставлять вам лучшую аналитику и сигналы.`;

  await sendMessage(chatId, text);
}

// Ответить на callback query (убирает "часики" на кнопке)
async function answerCallbackQuery(callbackQueryId, text = null) {
  try {
    const body = { callback_query_id: callbackQueryId };
    if (text) {
      body.text = text;
      body.show_alert = false;
    }

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (error) {
    log('❌ answerCallbackQuery error', { error: error.message });
  }
}

// ============================================
// AUTOMATION LOGIC
// ============================================

async function checkAndRunAutomation(chatId, telegramId, conversationId, text) {
  if (!text) return;

  try {
    // 1. Получаем все активные правила
    const { data: rules, error } = await supabase
      .from('automation_rules')
      .select('trigger_keyword, response_text, match_type')
      .eq('is_active', true);

    if (error || !rules || rules.length === 0) return;

    const lowerText = text.toLowerCase();

    // 2. Ищем совпадение
    const matchedRule = rules.find(rule => {
      const keyword = rule.trigger_keyword.toLowerCase();

      if (rule.match_type === 'exact') {
        return lowerText === keyword;
      }
      if (rule.match_type === 'starts_with') {
        return lowerText.startsWith(keyword);
      }
      // default: contains
      return lowerText.includes(keyword);
    });

    // 3. Если нашли - отвечаем
    if (matchedRule) {
      log(`⚡ Automation triggered: "${matchedRule.trigger_keyword}" -> responding to ${telegramId}`);

      await sendMessage(chatId, matchedRule.response_text);
      saveOutgoingMessage(conversationId, telegramId, matchedRule.response_text, 'auto_rule'); // sent_by = auto_rule
    }

  } catch (err) {
    log('❌ runAutomation error', { error: err.message });
  }
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin;
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'AR ARENA Bot Webhook with Inbox',
      commands: ['/start', '/start premium', '/status', '/sub', '/подписка'],
      features: ['inbox', 'message_history', 'realtime']
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;
    const updateId = update.update_id;

    log('📨 Received update', { update_id: updateId, message_id: update.message?.message_id });

    // Защита от дублей - атомарная вставка update_id
    // Если уже есть - получим ошибку unique constraint и выйдем
    if (updateId) {
      const { error } = await supabase
        .from('processed_updates')
        .insert({ update_id: updateId });

      // Ошибка 23505 = unique_violation (уже обработано)
      if (error && error.code === '23505') {
        log('⚠️ Duplicate update_id, skipping', { update_id: updateId });
        return res.status(200).json({ ok: true, duplicate: true });
      }
    }

    // ============================================
    // ОБРАБОТКА CALLBACK QUERY (нажатия на inline кнопки)
    // ============================================
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const callbackData = callbackQuery.data;
      const callbackChatId = callbackQuery.message?.chat?.id;
      const callbackTelegramId = callbackQuery.from?.id;
      const callbackQueryId = callbackQuery.id;

      log(`🔘 Callback received: ${callbackData}`, { telegram_id: callbackTelegramId });

      // Обработка отмены подписки
      if (callbackData === 'cancel_subscription_confirm') {
        await handleCancelSubscriptionConfirm(callbackChatId, callbackTelegramId, callbackQueryId);
        return res.status(200).json({ ok: true });
      }

      if (callbackData.startsWith('cancel_subscription_yes_')) {
        const targetTelegramId = parseInt(callbackData.replace('cancel_subscription_yes_', ''));
        // Проверяем что пользователь отменяет свою подписку
        if (targetTelegramId === callbackTelegramId) {
          await handleCancelSubscriptionYes(callbackChatId, callbackTelegramId, callbackQueryId);
        } else {
          log(`⚠️ [CANCEL] Telegram ID mismatch: ${targetTelegramId} vs ${callbackTelegramId}`);
          await answerCallbackQuery(callbackQueryId, '❌ Ошибка авторизации');
        }
        return res.status(200).json({ ok: true });
      }

      if (callbackData === 'cancel_subscription_no') {
        await handleCancelSubscriptionNo(callbackChatId, callbackQueryId);
        return res.status(200).json({ ok: true });
      }

      // Другие callback queries - просто отвечаем
      await answerCallbackQuery(callbackQueryId);
      return res.status(200).json({ ok: true });
    }

    // Обрабатываем только сообщения
    if (!update.message) {
      return res.status(200).json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const telegramId = message.from.id;
    const username = message.from.username;
    const firstName = message.from.first_name;
    const lastName = message.from.last_name;
    const text = message.text || '';

    // ============================================
    // СОХРАНЯЕМ ВСЕ СООБЩЕНИЯ В INBOX
    // ============================================
    const conversationId = await getOrCreateConversation(telegramId, username, firstName, lastName);

    if (conversationId) {
      await saveIncomingMessage(conversationId, telegramId, message);
      log(`💬 Message saved to inbox: ${telegramId}`);
    }

    // ============================================
    // ОБРАБОТКА КОМАНД
    // ============================================

    // /start
    if (text.startsWith('/start')) {
      const args = text.split(' ').slice(1);
      const param = args[0] || '';
      const isPremiumStart = param.startsWith('premium');
      const utmSource = isPremiumStart && param.includes('_') ? param.split('_').slice(1).join('_') : null;

      // Надёжная дедупликация: 30-секундные окна + проверка соседнего бакета
      const timeBucket = Math.floor(Date.now() / 30000);
      const currentKey = `start_${telegramId}_${timeBucket}`;
      const prevKey = `start_${telegramId}_${timeBucket - 1}`;

      // ПАРАЛЛЕЛЬНО: проверка дубликата + проверка подписки (если premium)
      const [locksResult, subscriptionResult] = await Promise.all([
        supabase.from('command_locks').select('lock_key').in('lock_key', [currentKey, prevKey]),
        isPremiumStart ? checkSubscription(telegramId) : Promise.resolve(null)
      ]);

      // Проверяем дубликат
      if (locksResult.data && locksResult.data.length > 0) {
        log(`⏭️ Skipping duplicate /start from ${telegramId} (existing lock found)`);
        return res.status(200).json({ ok: true, skipped: 'duplicate_start' });
      }

      // Атомарная вставка текущего ключа
      const { error: lockError } = await supabase
        .from('command_locks')
        .insert({ lock_key: currentKey });

      if (lockError && lockError.code === '23505') {
        log(`⏭️ Skipping duplicate /start from ${telegramId} (lock exists: ${currentKey})`);
        return res.status(200).json({ ok: true, skipped: 'duplicate_start' });
      }

      log(`🔍 /start command`, { param, currentKey });

      // Трекинг юзера в фоне (не ждём)
      let source = 'direct';
      if (isPremiumStart) {
        source = utmSource || 'premium';
      } else if (param) {
        source = param;
      }
      trackBotUser(telegramId, username, firstName, source);

      if (isPremiumStart) {
        log(`👤 /start premium from ${telegramId}`, { utmSource, param });
        await handleStartPremium(chatId, telegramId, conversationId, utmSource, subscriptionResult);
      } else {
        log(`👤 /start regular from ${telegramId}`, { param });
        await handleStart(chatId, telegramId, conversationId);
      }
    }

    // /status
    if (text === '/status' || text === '/подписка' || text === '/sub' || text === '/subscription') {
      log(`👤 /status from ${telegramId}`);
      await handleStatus(chatId, telegramId, conversationId);
    }

    // ============================================
    // ЗАПУСК АВТОМАТИЗАЦИИ (для обычного текста)
    // ============================================
    if (!text.startsWith('/')) {
      await checkAndRunAutomation(chatId, telegramId, conversationId, text);
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    log('❌ Webhook error', { error: error.message, stack: error.stack });
    return res.status(200).json({ ok: true });
  }
}
