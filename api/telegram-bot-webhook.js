// Telegram Bot Webhook для AR ARENA
// Обрабатывает все сообщения и сохраняет в Inbox
// 2025-12-27

import { createClient } from '@supabase/supabase-js';

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

const BOT_TOKEN = '8265126337:AAHBKYlU6fQA09nkJwsMaBQtP16CXSq1Cnc';
const SUPABASE_URL = 'https://syxjkircmiwpnpagznay.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NDQxMSwiZXhwIjoyMDczMzQwNDExfQ.7ueEYBhFrxKU3_RJi_iJEDj6EQqWBy3gAXiM4YIALqs';

const WEB_APP_URL = 'https://ararena.pro';
const PRICING_URL = 'https://ararena.pro/pricing';

// File ID для welcome картинки
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

// ============================================
// INBOX FUNCTIONS - Сохранение сообщений
// ============================================

// Получить или создать conversation
async function getOrCreateConversation(telegramId, username, firstName, lastName) {
  try {
    // Проверяем premium статус
    let isPremium = false;
    let premiumPlan = null;

    const { data: premiumData } = await supabase
      .from('premium_clients')
      .select('plan')
      .eq('telegram_id', telegramId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (premiumData) {
      isPremium = true;
      premiumPlan = premiumData.plan;
    }

    // Ищем существующий диалог
    const { data: existing } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('telegram_id', telegramId)
      .single();

    if (existing) {
      // Обновляем данные
      await supabase
        .from('chat_conversations')
        .update({
          username: username || undefined,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          is_premium: isPremium,
          premium_plan: premiumPlan,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      return existing.id;
    }

    // Создаём новый
    const { data: newConv, error } = await supabase
      .from('chat_conversations')
      .insert({
        telegram_id: telegramId,
        username,
        first_name: firstName,
        last_name: lastName,
        is_premium: isPremium,
        premium_plan: premiumPlan
      })
      .select('id')
      .single();

    if (error) {
      log('❌ Create conversation error', error);
      return null;
    }

    return newConv.id;
  } catch (err) {
    log('❌ getOrCreateConversation error', { error: err.message });
    return null;
  }
}

// Сохранить входящее сообщение
async function saveIncomingMessage(conversationId, telegramId, message) {
  try {
    const text = message.text || message.caption || '';
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

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        telegram_id: telegramId,
        message_id: message.message_id,
        text: text || null,
        direction: 'incoming',
        message_type: messageType,
        media_file_id: mediaFileId,
        caption: message.caption || null,
        is_command: isCommand,
        command_name: commandName
      });

    if (error) {
      log('❌ Save message error', error);
    }

    // Обновляем conversation
    await supabase
      .from('chat_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_text: text || '[media]',
        last_message_from: 'user',
        unread_count: supabase.sql`unread_count + 1`,
        is_read: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

  } catch (err) {
    log('❌ saveIncomingMessage error', { error: err.message });
  }
}

// Сохранить исходящее сообщение (ответ бота)
async function saveOutgoingMessage(conversationId, telegramId, text, sentBy = 'bot') {
  try {
    await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        telegram_id: telegramId,
        text,
        direction: 'outgoing',
        message_type: 'text',
        sent_by: sentBy
      });

    // Обновляем conversation
    await supabase
      .from('chat_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_text: text.substring(0, 100),
        last_message_from: 'bot',
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

  } catch (err) {
    log('❌ saveOutgoingMessage error', { error: err.message });
  }
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

async function handleStartPremium(chatId, telegramId, conversationId, utmSource = null) {
  if (utmSource) {
    await trackUtmClick(utmSource);
    await saveUserSource(telegramId, utmSource);
  }

  const subscription = await checkSubscription(telegramId);

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
    await saveOutgoingMessage(conversationId, telegramId, text);
  } else {
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
    await saveOutgoingMessage(conversationId, telegramId, caption);
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
  await saveOutgoingMessage(conversationId, telegramId, text);
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
    await saveOutgoingMessage(conversationId, telegramId, text);
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
    await saveOutgoingMessage(conversationId, telegramId, text);
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
    log('📨 Received update', update);

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

      let source = 'direct';
      if (param.startsWith('premium')) {
        source = param.includes('_') ? param.split('_').slice(1).join('_') : 'premium';
      } else if (param) {
        source = param;
      }

      await trackBotUser(telegramId, username, firstName, source);

      if (param.startsWith('premium')) {
        const utmSource = param.includes('_') ? param.split('_').slice(1).join('_') : null;
        log(`👤 /start premium from ${telegramId}`, { utmSource });
        await handleStartPremium(chatId, telegramId, conversationId, utmSource);
      } else {
        log(`👤 /start from ${telegramId}`);
        await handleStart(chatId, telegramId, conversationId);
      }
    }

    // /status
    if (text === '/status' || text === '/подписка' || text === '/sub' || text === '/subscription') {
      log(`👤 /status from ${telegramId}`);
      await handleStatus(chatId, telegramId, conversationId);
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    log('❌ Webhook error', { error: error.message, stack: error.stack });
    return res.status(200).json({ ok: true });
  }
}
