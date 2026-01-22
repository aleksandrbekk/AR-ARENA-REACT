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

// Validate required env vars
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('CRITICAL: Missing SUPABASE environment variables');
}

if (!LAVA_API_KEY) {
  console.error('CRITICAL: Missing LAVA_API_KEY environment variable');
}

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
  log('[CANCEL] Request received', {
    method: req.method,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      origin: req.headers.origin
    },
    body: req.body
  });

  // CORS
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    log('[CANCEL] OPTIONS request - returning 200');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    log('[CANCEL] Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { telegram_id } = req.body;
    log('[CANCEL] Processing request for telegram_id:', telegram_id);

    if (!telegram_id) {
      log('[CANCEL] Missing telegram_id in request');
      return res.status(400).json({ error: 'Missing telegram_id' });
    }

    const telegramIdInt = parseInt(telegram_id);
    log(`[CANCEL] Request received for telegram_id: ${telegramIdInt}`);

    // ============================================
    // 1. НАЙТИ КЛИЕНТА В БД
    // ============================================
    const { data: client, error: clientError } = await supabase
      .from('premium_clients')
      .select('id, telegram_id, username, source, contract_id, tags, expires_at')
      .eq('telegram_id', telegramIdInt)
      .single();

    if (clientError || !client) {
      log('[CANCEL] Client not found:', { telegram_id: telegramIdInt, error: clientError });
      return res.status(404).json({ error: 'Client not found' });
    }

    log('[CANCEL] Found client:', {
      id: client.id,
      source: client.source,
      contract_id: client.contract_id,
      tags: client.tags
    });

    // ============================================
    // 2. ПРОВЕРИТЬ УСЛОВИЯ ДЛЯ ОТМЕНЫ
    // ============================================

    // Проверить источник подписки
    if (client.source !== 'lava.top') {
      log('[CANCEL] Not a Lavatop subscription:', { source: client.source });
      return res.status(400).json({
        error: 'Not a Lavatop subscription',
        message: 'Подписка не оформлена через Lava.top. Для отмены обратитесь в поддержку.'
      });
    }

    // Проверить наличие contract_id
    if (!client.contract_id) {
      log('[CANCEL] No contract_id found:', { telegram_id: telegramIdInt });
      return res.status(400).json({
        error: 'No contract_id',
        message: 'ID подписки не найден. Возможно, подписка была оформлена до обновления системы. Обратитесь в поддержку.'
      });
    }

    // Проверить, не отменена ли уже подписка
    const tags = client.tags || [];
    if (tags.includes('subscription_cancelled')) {
      log('[CANCEL] Subscription already cancelled:', { telegram_id: telegramIdInt });
      return res.status(400).json({
        error: 'Already cancelled',
        message: 'Подписка уже отменена. Доступ сохранится до окончания оплаченного периода.'
      });
    }

    // ============================================
    // 3. ОТМЕНИТЬ ПОДПИСКУ ЧЕРЕЗ LAVA API
    // ============================================
    log('[CANCEL] Calling Lava API to cancel subscription:', {
      contract_id: client.contract_id,
      telegram_id: telegramIdInt
    });

    // Email для Lava API (формат: telegram_id@premium.ararena.pro)
    const email = `${telegramIdInt}@premium.ararena.pro`;

    try {
      const lavaResponse = await fetch('https://gate.lava.top/api/v2/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': LAVA_API_KEY
        },
        body: JSON.stringify({
          contractId: client.contract_id,
          email: email
        })
      });

      const lavaResult = await lavaResponse.json();

      log('[CANCEL] Lava API response:', {
        status: lavaResponse.status,
        result: lavaResult
      });

      // Проверяем ответ Lava API
      // Успешные коды: 200, 204
      // Также считаем успехом если подписка уже отменена (идемпотентность)
      if (!lavaResponse.ok) {
        // Если ошибка от Lava - логируем и возвращаем ошибку
        // НО: если подписка уже отменена на стороне Lava - это ОК
        const errorMessage = lavaResult?.message || lavaResult?.error || 'Unknown error';

        // Проверяем типичные сообщения об уже отменённой подписке
        const alreadyCancelled = errorMessage.toLowerCase().includes('already cancelled') ||
          errorMessage.toLowerCase().includes('already canceled') ||
          errorMessage.toLowerCase().includes('not found') ||
          errorMessage.toLowerCase().includes('subscription not active');

        if (alreadyCancelled) {
          log('[CANCEL] Subscription already cancelled on Lava side, continuing...');
        } else {
          log('[CANCEL] Lava API error:', { status: lavaResponse.status, error: lavaResult });
          return res.status(500).json({
            error: 'Lava API error',
            message: 'Не удалось отменить подписку через Lava.top. Попробуйте позже или обратитесь в поддержку.',
            details: errorMessage
          });
        }
      }

    } catch (lavaError) {
      log('[CANCEL] Lava API network error:', { error: lavaError.message });
      return res.status(500).json({
        error: 'Network error',
        message: 'Ошибка сети при обращении к Lava.top. Попробуйте позже.'
      });
    }

    // ============================================
    // 4. ОБНОВИТЬ БД - ДОБАВИТЬ ТЕГ
    // ============================================
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
      // Не возвращаем ошибку пользователю - подписка уже отменена в Lava
      // Просто логируем
    } else {
      log('[CANCEL] Tags updated successfully');
    }

    // ============================================
    // 5. ВЕРНУТЬ УСПЕХ
    // ============================================
    log('[CANCEL] Subscription cancelled successfully:', {
      telegram_id: telegramIdInt,
      contract_id: client.contract_id,
      expires_at: client.expires_at
    });

    return res.status(200).json({
      success: true,
      message: 'Подписка отменена. Доступ сохранится до окончания оплаченного периода.',
      expires_at: client.expires_at
    });

  } catch (error) {
    log('[CANCEL] Unexpected error:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Произошла непредвиденная ошибка. Попробуйте позже.'
    });
  }
}
