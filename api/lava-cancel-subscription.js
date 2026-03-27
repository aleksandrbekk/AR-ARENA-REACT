// Lava.top Subscription Cancellation API
// Vercel Serverless Function
// 2026-01-22
// Отменяет подписку через Lava API и обновляет БД

import { createClient } from '@supabase/supabase-js';

// ============================================
// КОНФИГУРАЦИЯ
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LAVA_API_KEY = process.env.LAVA_API_KEY;

// Supabase клиент
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Админы и пароль для авторизации
const ADMIN_IDS = [190202791, 288542643];
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://ar-arena.games',
  'https://www.ar-arena.games',
  'https://ar-arena-react.vercel.app',
  'https://ararena.pro',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
].filter(Boolean);

// ============================================
// HELPER FUNCTIONS
// ============================================

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] [LavaCancel] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [LavaCancel] ${message}`);
  }
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req, res) {
  try {
    log('[CANCEL] Request received', { method: req.method, body: req.body });

    // CORS
    const origin = req.headers.origin;
    log('[CANCEL] Step 1: CORS setup');
    if (ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    log('[CANCEL] Step 2: CORS headers set');

    if (req.method === 'OPTIONS') {
      log('[CANCEL] OPTIONS request');
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      log('[CANCEL] Invalid method:', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ============================================
    // SECURITY: Проверка авторизации
    // Разрешено: админы, внутренние сервисы (Bearer CRON_SECRET), или сам пользователь (через бот)
    // ============================================
    const authTelegramId = req.headers['x-telegram-id'] || req.body?.authTelegramId;
    const authPassword = req.headers['x-admin-password'] || req.body?.password;
    const authHeader = req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;

    let isAdmin = false;
    let isInternalCall = false;

    // Проверка по Telegram ID (админы)
    if (authTelegramId && ADMIN_IDS.includes(Number(authTelegramId))) {
      isAdmin = true;
    }

    // Проверка по паролю
    if (!isAdmin && authPassword && ADMIN_PASSWORD && authPassword === ADMIN_PASSWORD) {
      isAdmin = true;
    }

    // Проверка по Bearer token (внутренние сервисы, например бот)
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      isInternalCall = true;
    }

    log('[CANCEL] Step 3: Method is POST');
    const { telegram_id } = req.body || {};
    log('[CANCEL] Step 4: Extracted telegram_id:', telegram_id);

    // Если не админ и не внутренний вызов — пользователь может отменить только СВОЮ подписку
    if (!isAdmin && !isInternalCall) {
      // Проверяем что telegram_id вызывающего совпадает с отменяемым
      if (!authTelegramId || String(authTelegramId) !== String(telegram_id)) {
        log('[CANCEL] ❌ Unauthorized cancel attempt', { authTelegramId, target: telegram_id });
        return res.status(403).json({ error: 'Not authorized. You can only cancel your own subscription.' });
      }
    }

    if (!telegram_id) {
      log('[CANCEL] Missing telegram_id');
      return res.status(400).json({ error: 'Missing telegram_id' });
    }

    const telegramIdInt = parseInt(telegram_id);
    log('[CANCEL] Step 5: Processing for telegram_id:', telegramIdInt);

    // 1. НАЙТИ КЛИЕНТА В БД
    log('[CANCEL] Step 6: Querying database...');
    const { data: client, error: clientError } = await supabase
      .from('premium_clients')
      .select('id, telegram_id, username, source, contract_id, parent_contract_id, tags, expires_at')
      .eq('telegram_id', telegramIdInt)
      .single();
    log('[CANCEL] Step 7: Database query completed');

    if (clientError || !client) {
      log('[CANCEL] Client not found:', { telegram_id: telegramIdInt, error: clientError });
      return res.status(404).json({ error: 'Client not found' });
    }

    log('[CANCEL] Found client:', { source: client.source, contract_id: client.contract_id });

    // 2. ПРОВЕРИТЬ УСЛОВИЯ
    if (client.source !== 'lava.top') {
      return res.status(400).json({
        error: 'Not a Lavatop subscription',
        message: 'Подписка не оформлена через Lava.top. Для отмены обратитесь в поддержку.'
      });
    }

    if (!client.contract_id) {
      return res.status(400).json({
        error: 'No contract_id',
        message: 'ID подписки не найден. Возможно, подписка была оформлена до обновления системы. Обратитесь в поддержку.'
      });
    }

    const tags = client.tags || [];
    if (tags.includes('subscription_cancelled')) {
      return res.status(400).json({
        error: 'Already cancelled',
        message: 'Подписка уже отменена. Доступ сохранится до окончания оплаченного периода.'
      });
    }

    // 3. ОТМЕНИТЬ ПОДПИСКУ ЧЕРЕЗ LAVA API
    // ВАЖНО: Для отмены нужен parentContractId (ID подписки в Lava),
    // а не contractId конкретного платежа (он меняется каждый раз).
    // Собираем ВСЕ возможные ID и пробуем каждый.
    log('[CANCEL] Collecting all contract IDs for cancellation...');

    const email = `${telegramIdInt}@premium.ararena.pro`;

    async function tryCancel(contractIdToCancel) {
      const cancelUrl = new URL('https://gate.lava.top/api/v1/subscriptions');
      cancelUrl.searchParams.set('contractId', contractIdToCancel);
      cancelUrl.searchParams.set('email', email);

      const lavaResponse = await fetch(cancelUrl.toString(), {
        method: 'DELETE',
        headers: { 'X-Api-Key': LAVA_API_KEY }
      });

      return lavaResponse;
    }

    // Собираем все уникальные contract ID для попыток отмены
    const contractIdsToTry = new Set();

    // 1) parent_contract_id из БД (приоритет — это ID подписки)
    if (client.parent_contract_id) {
      contractIdsToTry.add(client.parent_contract_id);
    }

    // 2) contract_id из БД
    if (client.contract_id) {
      contractIdsToTry.add(client.contract_id);
    }

    // 3) Ищем parentContractId в webhook_logs (все уникальные)
    try {
      const searchId = client.parent_contract_id || client.contract_id;
      if (searchId) {
        const { data: webhookLogs } = await supabase
          .from('webhook_logs')
          .select('payload')
          .or(`payload.ilike.%${searchId}%,payload.ilike.%${telegramIdInt}%`)
          .eq('source', 'lava.top')
          .order('created_at', { ascending: false })
          .limit(10);

        if (webhookLogs?.length) {
          for (const wl of webhookLogs) {
            try {
              const payload = typeof wl.payload === 'string' ? JSON.parse(wl.payload) : wl.payload;
              if (payload.parentContractId) contractIdsToTry.add(payload.parentContractId);
              if (payload.contractId) contractIdsToTry.add(payload.contractId);
            } catch (parseErr) {
              // skip unparseable
            }
          }
        }
      }
    } catch (searchErr) {
      log('[CANCEL] webhook_logs search error (non-critical):', searchErr.message);
    }

    // 4) Ищем contract_id в payment_history для этого пользователя
    try {
      const { data: payments } = await supabase
        .from('payment_history')
        .select('contract_id')
        .eq('telegram_id', telegramIdInt)
        .eq('source', 'lava.top')
        .order('created_at', { ascending: false })
        .limit(5);

      if (payments?.length) {
        for (const p of payments) {
          if (p.contract_id) contractIdsToTry.add(p.contract_id);
        }
      }
    } catch (phErr) {
      log('[CANCEL] payment_history search error (non-critical):', phErr.message);
    }

    log('[CANCEL] Contract IDs to try:', Array.from(contractIdsToTry));

    try {
      let cancelledSuccessfully = false;
      let alreadyCancelledOnLava = false;
      let successfulContractId = null;

      for (const idToTry of contractIdsToTry) {
        log(`[CANCEL] Trying cancellation with contractId: ${idToTry}`);
        const lavaResponse = await tryCancel(idToTry);
        log(`[CANCEL] Lava API response for ${idToTry}: ${lavaResponse.status}`);

        if (lavaResponse.status === 204) {
          cancelledSuccessfully = true;
          successfulContractId = idToTry;
          log(`[CANCEL] ✅ Successfully cancelled with contractId: ${idToTry}`);
          break;
        }

        if (lavaResponse.status === 404) {
          log(`[CANCEL] contractId ${idToTry} not found on Lava, trying next...`);
          continue;
        }

        // Другие ошибки — проверяем текст
        const responseText = await lavaResponse.text();
        let lavaResult;
        try {
          lavaResult = JSON.parse(responseText);
        } catch (e) {
          lavaResult = { message: responseText || 'Unknown response' };
        }

        const errorMessage = String(lavaResult?.error || lavaResult?.message || '').toLowerCase();
        if (errorMessage.includes('already cancelled') ||
            errorMessage.includes('already canceled') ||
            errorMessage.includes('subscription not active') ||
            errorMessage.includes('cancelled')) {
          alreadyCancelledOnLava = true;
          log(`[CANCEL] Subscription already cancelled on Lava (contractId: ${idToTry})`);
          break;
        }

        log(`[CANCEL] Unexpected Lava response for ${idToTry}:`, lavaResult);
      }

      if (cancelledSuccessfully) {
        log('[CANCEL] Subscription successfully cancelled via Lava API');
        // Сохраняем parent_contract_id для будущих операций
        if (successfulContractId) {
          await supabase.from('premium_clients')
            .update({ parent_contract_id: successfulContractId })
            .eq('id', client.id);
        }
      } else if (alreadyCancelledOnLava) {
        log('[CANCEL] Subscription already cancelled on Lava side, continuing to update DB...');
      } else if (contractIdsToTry.size === 0) {
        log('[CANCEL] No contract IDs found to try!');
        return res.status(500).json({
          error: 'No contract ID',
          message: 'Не найден ID подписки для отмены. Обратитесь в поддержку @Andrey_cryptoinvestor'
        });
      } else {
        log('[CANCEL] All contract IDs failed');
        return res.status(500).json({
          error: 'Lava API error',
          message: 'Не удалось отменить подписку через Lava.top. Попробуйте позже или обратитесь в поддержку @Andrey_cryptoinvestor'
        });
      }

    } catch (lavaError) {
      log('[CANCEL] Lava API network error:', { error: lavaError.message });
      return res.status(500).json({
        error: 'Network error',
        message: 'Ошибка сети при обращении к Lava.top. Попробуйте позже.'
      });
    }

    // 4. ОБНОВИТЬ БД
    log('[CANCEL] Updating premium_clients with cancellation tag...');

    const updatedTags = [...tags, 'subscription_cancelled'];

    const { error: updateError } = await supabase
      .from('premium_clients')
      .update({
        tags: updatedTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', client.id);

    if (updateError) {
      log('[CANCEL] Failed to update tags:', updateError);
    } else {
      log('[CANCEL] Tags updated successfully');
    }

    // 5. ВЕРНУТЬ УСПЕХ
    log('[CANCEL] Subscription cancelled successfully');

    return res.status(200).json({
      success: true,
      message: 'Подписка отменена. Доступ сохранится до окончания оплаченного периода.',
      expires_at: client.expires_at
    });

  } catch (error) {
    log('[CANCEL] Unexpected error:', { 
      error: error.message, 
      stack: error.stack
    });
    
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Произошла непредвиденная ошибка. Попробуйте позже.'
      });
    }
  }
}
