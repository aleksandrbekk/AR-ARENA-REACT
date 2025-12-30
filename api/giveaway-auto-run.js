// API для автоматического запуска истёкших розыгрышей
// Вызывается по cron каждые 5 минут
// 2024-12-30

import { createClient } from '@supabase/supabase-js';

// SECURITY: All secrets from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

// Validate env vars
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('CRITICAL: Missing Supabase environment variables');
}

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
  // Разрешаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Проверка авторизации (для защиты от внешних вызовов)
  // Vercel cron добавляет заголовок Authorization
  const authHeader = req.headers.authorization;
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    // Если CRON_SECRET установлен, проверяем авторизацию
    // Если не установлен — разрешаем (для тестирования)
    log('Unauthorized request attempt');
    // Пока не блокируем для совместимости
  }

  log('Starting giveaway auto-run check');

  try {
    // Находим все активные розыгрыши с истёкшим end_date
    const now = new Date().toISOString();

    const { data: expiredGiveaways, error: fetchError } = await supabase
      .from('giveaways')
      .select('id, title, end_date')
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
        processed: 0
      });
    }

    log(`Found ${expiredGiveaways.length} expired giveaways`, expiredGiveaways);

    const results = [];

    // Обрабатываем каждый истёкший розыгрыш
    for (const giveaway of expiredGiveaways) {
      log(`Processing giveaway: ${giveaway.title} (${giveaway.id})`);

      try {
        // Вызываем RPC функцию для проведения розыгрыша
        const { data, error } = await supabase.rpc('run_giveaway_draw', {
          p_giveaway_id: giveaway.id
        });

        if (error) {
          log(`Error running giveaway ${giveaway.id}:`, error);
          results.push({
            id: giveaway.id,
            title: giveaway.title,
            success: false,
            error: error.message
          });
          continue;
        }

        log(`Giveaway ${giveaway.id} completed`, data);
        results.push({
          id: giveaway.id,
          title: giveaway.title,
          success: data?.success || false,
          draw: data?.draw,
          prizes: data?.prizes
        });

      } catch (err) {
        log(`Exception processing giveaway ${giveaway.id}:`, err.message);
        results.push({
          id: giveaway.id,
          title: giveaway.title,
          success: false,
          error: err.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    log(`Completed. Success: ${successCount}/${results.length}`);

    return res.status(200).json({
      success: true,
      message: `Processed ${results.length} giveaways`,
      processed: results.length,
      successful: successCount,
      results
    });

  } catch (error) {
    log('Fatal error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
