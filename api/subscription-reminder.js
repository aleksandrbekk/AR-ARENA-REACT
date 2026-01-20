// Напоминания о продлении подписки за 1 день до окончания
// Vercel Cron Job - запускается ежедневно в 10:00 MSK
// 2025-12-29

import { createClient } from '@supabase/supabase-js';
import { logSystemMessage } from './utils/log-system-message.js';

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

// SECURITY: All secrets from environment variables (set in Vercel)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Validate required env vars
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN) {
  console.error('CRITICAL: Missing required environment variables');
}

// Админ для уведомлений и тестов
const ADMIN_ID = '190202791';

// ТЕСТОВЫЙ РЕЖИМ - отправлять только админу
const TEST_MODE = false;

// Supabase клиент
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// HELPER FUNCTIONS
// ============================================

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] [Reminder] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [Reminder] ${message}`);
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
      log(`❌ Telegram error for ${telegramId}`, result);
      return false;
    }
    return true;
  } catch (error) {
    log(`❌ Telegram exception for ${telegramId}`, { error: error.message });
    return false;
  }
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req, res) {
  // Разрешаем только GET (cron) или POST (ручной запуск)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Проверка авторизации для cron (Vercel добавляет header)
  const authHeader = req.headers.authorization;
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isManualTrigger = req.query.key === 'manual_trigger_190202791';

  // Для безопасности - проверяем что это cron или ручной запуск
  if (!isVercelCron && !isManualTrigger && process.env.NODE_ENV === 'production') {
    log('⚠️ Unauthorized access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    log('🚀 Starting subscription reminder job');

    // ============================================
    // 1. НАЙТИ ПОЛЬЗОВАТЕЛЕЙ С ИСТЕКАЮЩЕЙ ПОДПИСКОЙ
    // ============================================

    // Завтра ±3 часа
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const windowStart = new Date(tomorrow.getTime() - 3 * 60 * 60 * 1000); // -3 часа
    const windowEnd = new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000);   // +3 часа

    log(`📅 Checking subscriptions expiring between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`);

    // Запрос пользователей
    // ИСКЛЮЧАЕМ lava.top - у них авто-оплата
    const { data: expiringUsers, error: queryError } = await supabase
      .from('premium_clients')
      .select('telegram_id, username, plan, expires_at, source')
      .gte('expires_at', windowStart.toISOString())
      .lte('expires_at', windowEnd.toISOString())
      .neq('source', 'lava.top')  // Исключаем lava.top (авто-оплата)
      .not('telegram_id', 'is', null);

    if (queryError) {
      log('❌ Database query error', queryError);
      return res.status(500).json({ error: 'Database error', details: queryError.message });
    }

    log(`📊 Found ${expiringUsers?.length || 0} users with expiring subscriptions`);

    if (!expiringUsers || expiringUsers.length === 0) {
      log('✅ No reminders to send');
      return res.status(200).json({
        message: 'No reminders needed',
        checked: { windowStart, windowEnd },
        usersFound: 0
      });
    }

    // ============================================
    // 2. ОТПРАВИТЬ НАПОМИНАНИЯ
    // ============================================

    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      users: []
    };

    for (const user of expiringUsers) {
      const telegramId = user.telegram_id;

      // В тестовом режиме отправляем только админу
      if (TEST_MODE && String(telegramId) !== ADMIN_ID) {
        log(`⏭️ TEST MODE: Skipping ${telegramId} (${user.username || 'no username'})`);
        results.skipped++;
        results.users.push({
          telegram_id: telegramId,
          username: user.username,
          status: 'skipped_test_mode'
        });
        continue;
      }

      // Формируем сообщение
      const expiresDate = new Date(user.expires_at);
      const message = `⏰ <b>Ваша подписка AR Club заканчивается завтра!</b>

📅 Дата окончания: ${expiresDate.toLocaleDateString('ru-RU')}
📋 Тариф: ${user.plan?.toUpperCase() || 'Premium'}

Не забудьте продлить, чтобы сохранить доступ к закрытому каналу и чату.

👉 <a href="https://ararena.pro/pricing">Продлить подписку</a>

📞 Вопросы: @Andrey_cryptoinvestor`;

      const replyMarkup = {
        inline_keyboard: [
          [{ text: '💳 Продлить подписку', url: 'https://ararena.pro/pricing' }]
        ]
      };

      const success = await sendTelegramMessage(telegramId, message, replyMarkup);

      if (success?.ok) {
        log(`✅ Reminder sent to ${telegramId} (${user.username || 'no username'})`);
        results.sent++;
        results.users.push({
          telegram_id: telegramId,
          username: user.username,
          status: 'sent'
        });
        // Логируем успешную отправку
        await logSystemMessage({
          telegram_id: telegramId,
          message_type: 'subscription_reminder',
          text: message,
          source: 'subscription-reminder',
          success: true,
          metadata: {
            username: user.username,
            plan: user.plan,
            expires_at: user.expires_at
          }
        });
      } else {
        log(`❌ Failed to send reminder to ${telegramId}`);
        results.failed++;
        results.users.push({
          telegram_id: telegramId,
          username: user.username,
          status: 'failed'
        });
        // Логируем ошибку
        await logSystemMessage({
          telegram_id: telegramId,
          message_type: 'subscription_reminder',
          text: message,
          source: 'subscription-reminder',
          success: false,
          error: success?.description || success?.error || 'Failed to send message',
          metadata: {
            username: user.username,
            plan: user.plan,
            expires_at: user.expires_at
          }
        });
      }

      // Небольшая задержка между сообщениями
      await new Promise(r => setTimeout(r, 100));
    }

    // ============================================
    // 3. УВЕДОМЛЕНИЕ АДМИНУ О РЕЗУЛЬТАТАХ
    // ============================================

    const adminReport = `📊 <b>Отчёт о напоминаниях</b>

🔍 Проверено: подписки истекающие завтра
📧 Отправлено: ${results.sent}
⏭️ Пропущено (тест): ${results.skipped}
❌ Ошибок: ${results.failed}

${TEST_MODE ? '⚠️ <i>ТЕСТОВЫЙ РЕЖИМ - сообщения только админу</i>' : ''}`;

    await sendTelegramMessage(ADMIN_ID, adminReport);

    log('✅ Reminder job completed', results);

    return res.status(200).json({
      message: 'Reminder job completed',
      testMode: TEST_MODE,
      results
    });

  } catch (error) {
    log('❌ Reminder job error', { error: error.message, stack: error.stack });

    // Уведомляем админа об ошибке
    await sendTelegramMessage(ADMIN_ID, `❌ Ошибка в Reminder Job:\n${error.message}`);

    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
