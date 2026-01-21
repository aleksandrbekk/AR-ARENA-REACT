// API для получения системных сообщений (с проверкой авторизации)
// 2026-01-XX

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

const ADMIN_IDS = [190202791, 144828618, 288542643, 288475216];

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://ar-arena.games',
  'https://www.ar-arena.games',
  'https://ar-arena-react.vercel.app',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
].filter(Boolean);

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin;
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Telegram-Id, X-Admin-Password');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ============================================
    // SECURITY: Проверка авторизации админа
    // ============================================
    const authTelegramId = req.headers['x-telegram-id'];
    const authPassword = req.headers['x-admin-password'];

    let isAuthorized = false;

    // Проверка по Telegram ID
    if (authTelegramId && ADMIN_IDS.includes(Number(authTelegramId))) {
      isAuthorized = true;
    }

    // Проверка по паролю (для браузерного доступа)
    if (!isAuthorized && authPassword && authPassword === ADMIN_PASSWORD) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      console.error('❌ Unauthorized system-messages access attempt', {
        telegramId: authTelegramId,
        hasPassword: !!authPassword,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      });
      return res.status(403).json({ error: 'Not authorized. Admin access required.' });
    }

    // ============================================
    // ПОЛУЧЕНИЕ ДАННЫХ
    // ============================================
    const { filter = 'all', source = 'all' } = req.query;

    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    let query = supabase
      .from('system_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (filter === 'success') {
      query = query.eq('success', true);
    } else if (filter === 'failed') {
      query = query.eq('success', false);
    } else if (filter === 'payment_welcome') {
      query = query.eq('message_type', 'payment_welcome');
    }

    if (source !== 'all') {
      query = query.eq('source', source);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }

    return res.status(200).json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('System messages error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
