// API для проверки авторизации админа
// Используется для защиты Inbox и других админских функций
// 2026-01-XX

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

/**
 * Проверяет авторизацию админа
 * @param {string|number} telegramId - Telegram ID пользователя
 * @param {string} password - Пароль (опционально, для браузерного доступа)
 * @returns {Promise<{isAdmin: boolean, reason?: string}>}
 */
async function verifyAdmin(telegramId, password = null) {
  // Проверка по Telegram ID
  if (telegramId && ADMIN_IDS.includes(Number(telegramId))) {
    return { isAdmin: true };
  }

  // Проверка по паролю (для браузерного доступа)
  if (password && password === process.env.ADMIN_PASSWORD) {
    return { isAdmin: true };
  }

  return { isAdmin: false, reason: 'Not authorized' };
}

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin;
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { telegramId, password } = req.body;

    const result = await verifyAdmin(telegramId, password);

    if (!result.isAdmin) {
      return res.status(403).json({
        isAdmin: false,
        error: result.reason || 'Unauthorized'
      });
    }

    return res.status(200).json({
      isAdmin: true,
      telegramId: telegramId || null
    });

  } catch (error) {
    console.error('Verify admin error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
