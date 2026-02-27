// Авто-кик просроченных подписок
// Vercel Cron Job - запускается ежедневно в 12:00 MSK
// Grace period: 0 дней - кикаем сразу после истечения
// 2025-12-29

import { createClient } from '@supabase/supabase-js';
import { PREMIUM_CHANNEL_ID, PREMIUM_CHAT_ID, ADMIN_TELEGRAM_ID, NOTIFICATION_ADMIN_IDS } from './utils/config.js';

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

// IDs из конфига
const CHANNEL_ID = PREMIUM_CHANNEL_ID;
const CHAT_ID = PREMIUM_CHAT_ID;
const ADMIN_ID = ADMIN_TELEGRAM_ID;

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
// Используем ban → задержка → unban (Telegram API не имеет "мягкого кика")
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
      // Задержка перед unban — Telegram может не успеть обработать ban
      await new Promise(r => setTimeout(r, 500));

      // Разбаниваем чтобы мог вернуться после оплаты (с проверкой + ретрай)
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const unbanRes = await fetch(
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
          const unbanResult = await unbanRes.json();
          if (unbanResult.ok) {
            log(`✅ Unban ${telegramId} from ${chatId} successful (attempt ${attempt})`);
            break;
          } else {
            log(`⚠️ Unban ${telegramId} from ${chatId} failed (attempt ${attempt}): ${unbanResult.description}`);
            if (attempt < 3) await new Promise(r => setTimeout(r, 1000));
          }
        } catch (unbanErr) {
          log(`⚠️ Unban ${telegramId} error (attempt ${attempt}): ${unbanErr.message}`);
          if (attempt < 3) await new Promise(r => setTimeout(r, 1000));
        }
      }

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
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isManualTrigger = req.query.key === 'manual_trigger_190202791';
  const isCronSecretMissing = !cronSecret;

  if (isCronSecretMissing) {
    log('⚠️ WARNING: CRON_SECRET env var not set!');
  }

  // Allow if: valid cron secret, manual trigger, or not production
  if (!isVercelCron && !isManualTrigger && process.env.NODE_ENV === 'production') {
    log('⚠️ Unauthorized access attempt', { authHeader: authHeader ? 'present' : 'missing', cronSecret: cronSecret ? 'set' : 'NOT SET' });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  log(`Auth: vercelCron=${isVercelCron}, manual=${isManualTrigger}, cronSecretMissing=${isCronSecretMissing}`);

  try {
    log('🚀 Starting subscription cleanup job');

    const now = new Date();

    // ============================================
    // 1. НАЙТИ ПРОСРОЧЕННЫЕ ПОДПИСКИ
    // ============================================

    const { data: expiredUsersRaw, error: queryError } = await supabase
      .from('premium_clients')
      .select('id, telegram_id, username, plan, expires_at, source, in_channel, in_chat, tags, last_payment_at')
      .lt('expires_at', now.toISOString())  // expires_at < now
      .not('telegram_id', 'is', null)
      .or('in_channel.eq.true,in_chat.eq.true');  // Ещё в канале или чате

    if (queryError) {
      log('❌ Database query error', queryError);
      return res.status(500).json({ error: 'Database error', details: queryError.message });
    }

    // ============================================
    // 1.1 GRACE PERIOD: Skip users with recent payments (48h)
    // Prevents race condition between cleanup cron and webhook
    // ============================================
    const GRACE_PERIOD_HOURS = 48;
    const graceCutoff = new Date(now.getTime() - GRACE_PERIOD_HOURS * 60 * 60 * 1000);
    const skippedGrace = [];

    const expiredUsers = (expiredUsersRaw || []).filter(user => {
      if (user.last_payment_at) {
        const lastPayment = new Date(user.last_payment_at);
        if (lastPayment > graceCutoff) {
          log(`⏸️ Grace period: skipping ${user.telegram_id} (${user.username || 'no username'}) - last payment ${user.last_payment_at}`);
          skippedGrace.push({
            telegram_id: user.telegram_id,
            username: user.username,
            last_payment_at: user.last_payment_at,
            expires_at: user.expires_at
          });
          return false;
        }
      }
      return true;
    });

    log(`📊 Found ${expiredUsersRaw?.length || 0} expired subscriptions, ${skippedGrace.length} skipped (grace period), ${expiredUsers.length} to process`);

    if (expiredUsers.length === 0) {
      log('✅ No expired subscriptions to process (after grace period filter)');
      return res.status(200).json({
        message: 'No cleanup needed',
        expiredFound: expiredUsersRaw?.length || 0,
        skippedGracePeriod: skippedGrace.length
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
      const newTags = [...(user.tags || [])];
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

    const graceInfo = skippedGrace.length > 0
      ? `\n⏸️ Grace period (48ч): ${skippedGrace.length} пропущено`
      : '';

    const adminReport = `🧹 <b>Отчёт о очистке подписок</b>

📊 Найдено просроченных: ${(expiredUsersRaw?.length || 0)}${graceInfo}
${TEST_MODE ? '⏭️ Пропущено (тест): ' + results.skipped : '🚪 Кикнуто: ' + results.kicked}
❌ Ошибок: ${results.failed}

📋 По тарифам:
${planStats}

${TEST_MODE ? '⚠️ <i>ТЕСТОВЫЙ РЕЖИМ - никто не кикнут</i>' : ''}`;

    // Send report to all notification admins
    for (const adminId of (NOTIFICATION_ADMIN_IDS || [ADMIN_ID])) {
      await sendTelegramMessage(adminId, adminReport);
    }

    // Record check in subscription_checks for monitoring
    try {
      await supabase.from('subscription_checks').insert({
        checked_at: now.toISOString(),
        expired_found: expiredUsers.length,
        kicked_count: results.kicked,
        failed_count: results.failed,
        source: isManualTrigger ? 'manual' : 'cron'
      });
      log('Cleanup result saved to subscription_checks');
    } catch (checkErr) {
      log('Could not save to subscription_checks:', checkErr.message);
    }

    log('✅ Cleanup job completed', results);

    return res.status(200).json({
      message: 'Cleanup job completed',
      testMode: TEST_MODE,
      results
    });

  } catch (error) {
    log('❌ Cleanup job error', { error: error.message, stack: error.stack });

    for (const adminId of (NOTIFICATION_ADMIN_IDS || [ADMIN_ID])) {
      await sendTelegramMessage(adminId, `❌ Ошибка в Cleanup Job:\n${error.message}`);
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
