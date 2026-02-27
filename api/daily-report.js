// Ежедневный отчёт по подпискам
// Vercel Cron Job — запускается ежедневно в 21:00 MSK
// Отправляет всем админам сводку за день

import { createClient } from '@supabase/supabase-js';
import { NOTIFICATION_ADMIN_IDS, ADMIN_TELEGRAM_ID } from './utils/config.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] [DailyReport] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [DailyReport] ${message}`);
  }
}

async function sendTelegramMessage(telegramId, text) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: 'HTML'
      })
    });
    return (await res.json()).ok;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isManualTrigger = req.query.key === 'manual_trigger_190202791';
  const isCronSecretMissing = !cronSecret;

  if (!isVercelCron && !isManualTrigger && !isCronSecretMissing && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    log('📊 Generating daily report...');

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    // ============================================
    // 1. Активные подписки (всего)
    // ============================================
    const { count: totalActive } = await supabase
      .from('premium_clients')
      .select('*', { count: 'exact', head: true })
      .gt('expires_at', now.toISOString());

    // ============================================
    // 2. Новые клиенты за сегодня
    // ============================================
    const { data: newClients } = await supabase
      .from('premium_clients')
      .select('telegram_id, username, plan, source')
      .gte('started_at', todayISO)
      .order('started_at', { ascending: false });

    // ============================================
    // 3. Платежи за сегодня
    // ============================================
    const { data: todayPayments } = await supabase
      .from('payment_history')
      .select('telegram_id, amount, currency, source, plan, status')
      .gte('created_at', todayISO)
      .eq('status', 'success');

    // Revenue by currency
    let revenueRub = 0, revenueUsd = 0, revenueEur = 0, revenueUsdt = 0;
    (todayPayments || []).forEach(p => {
      const cur = (p.currency || '').toUpperCase();
      if (cur === 'RUB') revenueRub += p.amount || 0;
      else if (cur === 'USD') revenueUsd += p.amount || 0;
      else if (cur === 'EUR') revenueEur += p.amount || 0;
      else revenueUsdt += p.amount || 0;
    });

    // ============================================
    // 4. Кикнутые за сегодня
    // ============================================
    const { data: kickedToday } = await supabase
      .from('premium_clients')
      .select('telegram_id, username, plan')
      .gte('updated_at', todayISO)
      .contains('tags', ['kicked']);

    // ============================================
    // 5. Истекающие в ближайшие 3 дня
    // ============================================
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const { data: expiringSoon } = await supabase
      .from('premium_clients')
      .select('telegram_id, username, plan, expires_at')
      .gt('expires_at', now.toISOString())
      .lt('expires_at', threeDaysLater.toISOString())
      .order('expires_at', { ascending: true });

    // ============================================
    // 6. Отменённые подписки (с пометкой cancelled)
    // ============================================
    const { count: cancelledCount } = await supabase
      .from('premium_clients')
      .select('*', { count: 'exact', head: true })
      .contains('tags', ['subscription_cancelled'])
      .gt('expires_at', now.toISOString());

    // ============================================
    // 7. Потерянные платежи за сегодня
    // ============================================
    const { data: orphanedPayments } = await supabase
      .from('payment_history')
      .select('amount, currency, contract_id')
      .gte('created_at', todayISO)
      .eq('status', 'orphaned_no_user');

    const { data: cancelledPayments } = await supabase
      .from('payment_history')
      .select('amount, currency, telegram_id')
      .gte('created_at', todayISO)
      .eq('status', 'cancelled_refund_needed');

    // ============================================
    // 8. По тарифам
    // ============================================
    const { data: allActive } = await supabase
      .from('premium_clients')
      .select('plan')
      .gt('expires_at', now.toISOString());

    const planCounts = {};
    (allActive || []).forEach(c => {
      const plan = c.plan || 'unknown';
      planCounts[plan] = (planCounts[plan] || 0) + 1;
    });

    const planStats = Object.entries(planCounts)
      .map(([plan, count]) => `  • ${plan.toUpperCase()}: ${count}`)
      .join('\n');

    // ============================================
    // ФОРМИРУЕМ ОТЧЁТ
    // ============================================
    const dateStr = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

    let revenueLines = [];
    if (revenueRub > 0) revenueLines.push(`  ₽ ${revenueRub.toFixed(0)} RUB`);
    if (revenueUsd > 0) revenueLines.push(`  $ ${revenueUsd.toFixed(2)} USD`);
    if (revenueEur > 0) revenueLines.push(`  € ${revenueEur.toFixed(2)} EUR`);
    if (revenueUsdt > 0) revenueLines.push(`  💎 ${revenueUsdt.toFixed(2)} USDT`);
    const revenueText = revenueLines.length > 0 ? revenueLines.join('\n') : '  Нет платежей';

    const newClientsText = (newClients || []).length > 0
      ? (newClients || []).slice(0, 10).map(c =>
          `  • ${c.username ? '@' + c.username : c.telegram_id} (${c.plan || '?'}, ${c.source || '?'})`
        ).join('\n')
      : '  Нет новых';

    const kickedText = (kickedToday || []).length > 0
      ? (kickedToday || []).slice(0, 10).map(c =>
          `  • ${c.username ? '@' + c.username : c.telegram_id} (${c.plan || '?'})`
        ).join('\n')
      : '  Никто не кикнут';

    const expiringText = (expiringSoon || []).length > 0
      ? (expiringSoon || []).slice(0, 10).map(c => {
          const expires = new Date(c.expires_at);
          const daysLeft = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
          return `  • ${c.username ? '@' + c.username : c.telegram_id} — ${daysLeft}д (${c.plan || '?'})`;
        }).join('\n')
      : '  Нет истекающих';

    let alertsText = '';
    if ((orphanedPayments || []).length > 0) {
      alertsText += `\n\n🚨 <b>Потерянные платежи:</b> ${orphanedPayments.length}`;
    }
    if ((cancelledPayments || []).length > 0) {
      alertsText += `\n🚨 <b>Списания с отменённых:</b> ${cancelledPayments.length}`;
    }

    const report = `📊 <b>Ежедневный отчёт AR Club</b>
📅 ${dateStr}

━━━━━━━━━━━━━━━━━
👥 <b>Всего активных:</b> ${totalActive || 0}
${cancelledCount > 0 ? `⚠️ Из них отменены (ждут истечения): ${cancelledCount}` : ''}

📋 <b>По тарифам:</b>
${planStats || '  Нет данных'}

━━━━━━━━━━━━━━━━━
💰 <b>Доход за сегодня:</b>
${revenueText}
📝 Платежей: ${(todayPayments || []).length}

━━━━━━━━━━━━━━━━━
🆕 <b>Новые клиенты (${(newClients || []).length}):</b>
${newClientsText}

━━━━━━━━━━━━━━━━━
🚪 <b>Кикнуто (${(kickedToday || []).length}):</b>
${kickedText}

━━━━━━━━━━━━━━━━━
⏰ <b>Истекают в ближайшие 3 дня (${(expiringSoon || []).length}):</b>
${expiringText}${alertsText}`;

    // Отправляем всем админам
    const adminIds = NOTIFICATION_ADMIN_IDS || [ADMIN_TELEGRAM_ID];
    for (const adminId of adminIds) {
      await sendTelegramMessage(adminId, report);
    }

    log('✅ Daily report sent to admins:', adminIds);

    return res.status(200).json({
      success: true,
      message: 'Daily report sent',
      stats: {
        totalActive,
        newToday: (newClients || []).length,
        paymentsToday: (todayPayments || []).length,
        kickedToday: (kickedToday || []).length,
        expiringSoon: (expiringSoon || []).length
      }
    });

  } catch (error) {
    log('❌ Daily report error:', { error: error.message, stack: error.stack });

    // Notify primary admin about error
    await sendTelegramMessage(ADMIN_TELEGRAM_ID, `❌ Ошибка в Daily Report:\n${error.message}`);

    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
