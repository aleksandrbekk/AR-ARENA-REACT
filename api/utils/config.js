// Общая конфигурация для API
// Централизованные ID и настройки
// 2026-01-24

// ============================================
// TELEGRAM IDS
// ============================================

// Premium канал и чат
export const PREMIUM_CHANNEL_ID = process.env.PREMIUM_CHANNEL_ID || '-1001634734020';
export const PREMIUM_CHAT_ID = process.env.PREMIUM_CHAT_ID || '-1001828659569';

// Администратор для уведомлений
export const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '190202791';

// ============================================
// ALLOWED ORIGINS (CORS)
// ============================================

export const ALLOWED_ORIGINS = [
  'https://ar-arena.games',
  'https://www.ar-arena.games',
  'https://ar-arena-react.vercel.app',
  'https://ararena.pro',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
].filter(Boolean);

// ============================================
// HELPER: Set CORS headers
// ============================================

export function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
