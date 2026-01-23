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

    log('[CANCEL] Step 3: Method is POST');
    const { telegram_id } = req.body || {};
    log('[CANCEL] Step 4: Extracted telegram_id:', telegram_id);

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
      .select('id, telegram_id, username, source, contract_id, tags, expires_at')
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
    // Правильный endpoint: DELETE /api/v1/subscriptions с query params
    // Документация: https://gate.lava.top/docs
    log('[CANCEL] Calling Lava API:', { contract_id: client.contract_id });

    const email = `${telegramIdInt}@premium.ararena.pro`;

    // Формируем URL с query параметрами (согласно Lava API v1)
    const cancelUrl = new URL('https://gate.lava.top/api/v1/subscriptions');
    cancelUrl.searchParams.set('contractId', client.contract_id);
    cancelUrl.searchParams.set('email', email);

    try {
      const lavaResponse = await fetch(cancelUrl.toString(), {
        method: 'DELETE',
        headers: {
          'X-Api-Key': LAVA_API_KEY
        }
      });

      log('[CANCEL] Lava API response status:', lavaResponse.status);

      // Успешная отмена возвращает 204 No Content
      if (lavaResponse.status === 204) {
        log('[CANCEL] Subscription successfully cancelled via Lava API');
      } else if (!lavaResponse.ok) {
        // Попробуем получить тело ошибки
        const responseText = await lavaResponse.text();
        let lavaResult;

        try {
          lavaResult = JSON.parse(responseText);
        } catch (e) {
          lavaResult = { message: responseText || 'Unknown response' };
        }

        log('[CANCEL] Lava API error response:', lavaResult);

        const errorMessage = String(lavaResult?.error?.message || lavaResult?.error || lavaResult?.message || '').toLowerCase();

        // 404 означает что подписка не найдена - считаем это как "уже отменена"
        const isNotFound = lavaResponse.status === 404;
        const alreadyCancelled = isNotFound ||
          errorMessage.includes('already cancelled') ||
          errorMessage.includes('already canceled') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('subscription not active') ||
          errorMessage.includes('cancelled') ||
          errorMessage.includes('unknown');

        if (!alreadyCancelled) {
          log('[CANCEL] Lava API error:', { status: lavaResponse.status, error: lavaResult });
          return res.status(500).json({
            error: 'Lava API error',
            message: 'Не удалось отменить подписку через Lava.top. Попробуйте позже или обратитесь в поддержку.',
            details: lavaResult?.error?.message || lavaResult?.error || lavaResult?.message
          });
        }

        if (isNotFound) {
          log('[CANCEL] Subscription not found on Lava side (404), treating as already cancelled');
        } else {
          log('[CANCEL] Subscription already cancelled on Lava side, continuing...');
        }
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
