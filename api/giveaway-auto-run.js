// API для автоматического запуска истёкших розыгрышей
// Вызывается по cron каждые 5 минут (через vercel.json)
// Или напрямую вызывает Supabase Edge Function

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] [GiveawayAutoRun] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [GiveawayAutoRun] ${message}`);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Проверка авторизации (Vercel cron добавляет заголовок)
  const authHeader = req.headers.authorization;
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    log('Unauthorized request attempt');
    // Пока не блокируем для тестирования
  }

  const startTime = Date.now();
  log('Starting giveaway auto-run check');

  try {
    // 1. Находим все активные розыгрыши с истёкшим end_date
    const now = new Date().toISOString();
    const { data: expiredGiveaways, error: fetchError } = await supabase
      .from('giveaways')
      .select('id, name, main_title, end_date')
      .eq('status', 'active')
      .lt('end_date', now);

    if (fetchError) {
      throw new Error(`Failed to fetch expired giveaways: ${fetchError.message}`);
    }

    if (!expiredGiveaways || expiredGiveaways.length === 0) {
      log('No expired giveaways found');
      return res.status(200).json({
        success: true,
        message: 'No expired giveaways',
        processed: 0,
        duration_ms: Date.now() - startTime
      });
    }

    log(`Found ${expiredGiveaways.length} expired giveaways`, expiredGiveaways.map(g => g.id));

    const results = [];

    // 2. Обрабатываем каждый истёкший розыгрыш
    for (const giveaway of expiredGiveaways) {
      const giveawayName = giveaway.main_title || giveaway.name;
      log(`Processing giveaway: ${giveawayName} (${giveaway.id})`);

      try {
        // Вызываем Supabase Edge Function для генерации результатов
        const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-giveaway-result`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify({ giveaway_id: giveaway.id })
        });

        const drawResult = await response.json();

        if (!response.ok || !drawResult.success) {
          log(`Giveaway ${giveaway.id} failed:`, drawResult.error);
          results.push({
            id: giveaway.id,
            name: giveawayName,
            success: false,
            error: drawResult.error || 'Unknown error'
          });
          continue;
        }

        log(`Giveaway ${giveaway.id} completed successfully`, {
          winners: drawResult.winners?.map(w => w.username),
          total_participants: drawResult.total_participants,
          total_tickets: drawResult.total_tickets
        });

        results.push({
          id: giveaway.id,
          name: giveawayName,
          success: true,
          winners: drawResult.winners,
          total_participants: drawResult.total_participants,
          total_tickets: drawResult.total_tickets
        });

      } catch (err) {
        log(`Exception processing giveaway ${giveaway.id}:`, err.message);
        results.push({
          id: giveaway.id,
          name: giveawayName,
          success: false,
          error: err.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const duration = Date.now() - startTime;
    log(`Completed. Success: ${successCount}/${results.length} (${duration}ms)`);

    return res.status(200).json({
      success: true,
      message: `Processed ${results.length} giveaways`,
      processed: results.length,
      successful: successCount,
      failed: results.length - successCount,
      results,
      duration_ms: duration
    });

  } catch (error) {
    log('Fatal error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      duration_ms: Date.now() - startTime
    });
  }
}
