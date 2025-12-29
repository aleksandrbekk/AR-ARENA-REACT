// Авто-кик просроченных подписок
// Vercel Cron Job - запускается ежедневно в 12:00 MSK
// Grace period: 0 дней - кикаем сразу после истечения
// 2025-12-29

import { createClient } from '@supabase/supabase-js';

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

// SECURITY: All secrets from environment variables (set in Vercel)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KIKER_BOT_TOKEN = process.env.KIKER_BOT_TOKEN;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Validate required env vars
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN || !KIKER_BOT_TOKEN) {
  console.error('CRITICAL: Missing required environment variables');
}

// ID канала и чата
const CHANNEL_ID = '-1001634734020';
const CHAT_ID = '-1001828659569';

// Админ для уведомлений
const ADMIN_ID = '190202791';

// ТЕСТОВЫЙ РЕЖИМ - только логировать, не кикать
const TEST_MODE = false;

// Supabase клиент
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// HELPER FUNCTIONS
// ============================================

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] [Cleanup] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [Cleanup] ${message}`);
  }
}

// Кикнуть пользователя из чата/канала
async function kickUser(telegramId, chatId) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${KIKER_BOT_TOKEN}/banChatMember`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          user_id: telegramId,
          revoke_messages: false  // Не удалять сообщения
        })
      }
    );

    const result = await response.json();

    if (result.ok) {
      // Сразу разбаним чтобы мог вернуться после оплаты
      await fetch(
        `https://api.telegram.org/bot${KIKER_BOT_TOKEN}/unbanChatMember`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            user_id: telegramId,
            only_if_banned: true
          })
        }
      );
      return { success: true };
    } else {
      return { success: false, error: result.description };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Отправить сообщение в Telegram
async function sendTelegramMessage(telegramId, text) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: 'HTML'
      })
    });
    return (await response.json()).ok;
  } catch {
    return false;
  }
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Проверка авторизации
  const authHeader = req.headers.authorization;
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isManualTrigger = req.query.key === 'manual_trigger_190202791';

  if (!isVercelCron && !isManualTrigger && process.env.NODE_ENV === 'production') {
    log('⚠️ Unauthorized access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    log('🚀 Starting subscription cleanup job');

    const now = new Date();

    // ============================================
    // 1. НАЙТИ ПРОСРОЧЕННЫЕ ПОДПИСКИ
    // ============================================

    const { data: expiredUsers, error: queryError } = await supabase
      .from('premium_clients')
      .select('id, telegram_id, username, plan, expires_at, source, in_channel, in_chat, tags')
      .lt('expires_at', now.toISOString())  // expires_at < now
      .not('telegram_id', 'is', null)
      .or('in_channel.eq.true,in_chat.eq.true');  // Ещё в канале или чате

    if (queryError) {
      log('❌ Database query error', queryError);
      return res.status(500).json({ error: 'Database error', details: queryError.message });
    }

    log(`📊 Found ${expiredUsers?.length || 0} expired subscriptions`);

    if (!expiredUsers || expiredUsers.length === 0) {
      log('✅ No expired subscriptions to process');
      return res.status(200).json({
        message: 'No cleanup needed',
        expiredFound: 0
      });
    }

    // ============================================
    // 2. КИКАТЬ ПРОСРОЧЕННЫХ
    // ============================================

    const results = {
      kicked: 0,
      failed: 0,
      skipped: 0,
      users: []
    };

    for (const user of expiredUsers) {
      const telegramId = user.telegram_id;
      const daysExpired = Math.floor((now - new Date(user.expires_at)) / (1000 * 60 * 60 * 24));

      log(`🔍 Processing ${telegramId} (${user.username || 'no username'}) - expired ${daysExpired} days ago, plan: ${user.plan}`);

      // В тестовом режиме только логируем
      if (TEST_MODE) {
        log(`⏭️ TEST MODE: Would kick ${telegramId} from channel and chat`);
        results.skipped++;
        results.users.push({
          telegram_id: telegramId,
          username: user.username,
          plan: user.plan,
          days_expired: daysExpired,
          status: 'skipped_test_mode'
        });
        continue;
      }

      let kickedFromChannel = false;
      let kickedFromChat = false;

      // Кикаем из канала
      if (user.in_channel) {
        const channelResult = await kickUser(telegramId, CHANNEL_ID);
        if (channelResult.success) {
          kickedFromChannel = true;
          log(`✅ Kicked ${telegramId} from channel`);
        } else {
          log(`⚠️ Failed to kick ${telegramId} from channel: ${channelResult.error}`);
        }
      }

      // Кикаем из чата
      if (user.in_chat) {
        const chatResult = await kickUser(telegramId, CHAT_ID);
        if (chatResult.success) {
          kickedFromChat = true;
          log(`✅ Kicked ${telegramId} from chat`);
        } else {
          log(`⚠️ Failed to kick ${telegramId} from chat: ${chatResult.error}`);
        }
      }

      // Обновляем статус в базе
      const newTags = user.tags || [];
      if (!newTags.includes('expired')) newTags.push('expired');
      if (!newTags.includes('kicked')) newTags.push('kicked');

      const { error: updateError } = await supabase
        .from('premium_clients')
        .update({
          in_channel: user.in_channel && !kickedFromChannel,
          in_chat: user.in_chat && !kickedFromChat,
          tags: newTags,
          updated_at: now.toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        log(`❌ Failed to update ${telegramId} in database`, updateError);
      }

      // Отправляем сообщение пользователю о истечении подписки
      const expiredMessage = `⚠️ <b>Ваша подписка AR Club истекла</b>

К сожалению, ваш доступ к закрытому каналу и чату был приостановлен.

Чтобы восстановить доступ, продлите подписку:
👉 <a href="https://ararena.pro/pricing">Продлить подписку</a>

📞 Вопросы: @Andrey_cryptoinvestor`;

      await sendTelegramMessage(telegramId, expiredMessage);

      if (kickedFromChannel || kickedFromChat) {
        results.kicked++;
        results.users.push({
          telegram_id: telegramId,
          username: user.username,
          plan: user.plan,
          days_expired: daysExpired,
          status: 'kicked',
          from_channel: kickedFromChannel,
          from_chat: kickedFromChat
        });
      } else {
        results.failed++;
        results.users.push({
          telegram_id: telegramId,
          username: user.username,
          plan: user.plan,
          days_expired: daysExpired,
          status: 'failed'
        });
      }

      // Задержка между операциями
      await new Promise(r => setTimeout(r, 200));
    }

    // ============================================
    // 3. УВЕДОМЛЕНИЕ АДМИНУ
    // ============================================

    // Группируем по тарифам для статистики
    const byPlan = {};
    for (const user of results.users) {
      const plan = user.plan || 'unknown';
      byPlan[plan] = (byPlan[plan] || 0) + 1;
    }

    const planStats = Object.entries(byPlan)
      .map(([plan, count]) => `  • ${plan}: ${count}`)
      .join('\n');

    const adminReport = `🧹 <b>Отчёт о очистке подписок</b>

📊 Найдено просроченных: ${expiredUsers.length}
${TEST_MODE ? '⏭️ Пропущено (тест): ' + results.skipped : '🚪 Кикнуто: ' + results.kicked}
❌ Ошибок: ${results.failed}

📋 По тарифам:
${planStats}

${TEST_MODE ? '⚠️ <i>ТЕСТОВЫЙ РЕЖИМ - никто не кикнут</i>' : ''}`;

    await sendTelegramMessage(ADMIN_ID, adminReport);

    log('✅ Cleanup job completed', results);

    return res.status(200).json({
      message: 'Cleanup job completed',
      testMode: TEST_MODE,
      results
    });

  } catch (error) {
    log('❌ Cleanup job error', { error: error.message, stack: error.stack });

    await sendTelegramMessage(ADMIN_ID, `❌ Ошибка в Cleanup Job:\n${error.message}`);

    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
