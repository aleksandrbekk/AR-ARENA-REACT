// API для отправки сообщений из админ-панели (безопасная версия)
// Заменяет прямое использование BOT_TOKEN в фронтенде
// 2026-01-XX

import { createClient } from '@supabase/supabase-js';
import { sanitizeString } from './utils/sanitize.js';

// SECURITY: All secrets from environment variables (set in Vercel)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Validate required env vars
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN) {
  console.error('CRITICAL: Missing required environment variables');
}

const ADMIN_IDS = [190202791, 144828618, 288542643, 288475216];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://ar-arena.games',
  'https://www.ar-arena.games',
  'https://ar-arena-react.vercel.app',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
].filter(Boolean);

// Отправить сообщение в Telegram
async function sendTelegramMessage(chatId, text, replyMarkup = null) {
  try {
    const body = {
      chat_id: chatId,
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

    return await response.json();
  } catch (error) {
    console.error('sendTelegramMessage error:', error);
    return { ok: false, error: error.message };
  }
}

// Отправить фото в Telegram
async function sendTelegramPhoto(chatId, photoUrl, caption, replyMarkup = null) {
  try {
    const body = {
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: 'HTML'
    };

    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    return await response.json();
  } catch (error) {
    console.error('sendTelegramPhoto error:', error);
    return { ok: false, error: error.message };
  }
}

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin;
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Telegram-Id, X-Admin-Password');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ============================================
    // SECURITY: Проверка авторизации админа
    // ============================================
    const authTelegramId = req.headers['x-telegram-id'] || req.body.telegramId;
    const authPassword = req.headers['x-admin-password'] || req.body.password;

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
      console.error('❌ Unauthorized admin-send-message attempt', {
        telegramId: authTelegramId,
        hasPassword: !!authPassword,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      });
      return res.status(403).json({ error: 'Not authorized. Admin access required.' });
    }

    // ============================================
    // ВАЛИДАЦИЯ И ОТПРАВКА
    // ============================================
    const { chatId, text, photoUrl, caption, replyMarkup } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: 'Missing chatId' });
    }

    if (!text && !photoUrl) {
      return res.status(400).json({ error: 'Missing text or photoUrl' });
    }

    // Санитизируем текст
    const sanitizedText = text ? sanitizeString(text) : null;
    const sanitizedCaption = caption ? sanitizeString(caption) : null;

    let result;

    if (photoUrl) {
      // Отправляем фото
      result = await sendTelegramPhoto(chatId, photoUrl, sanitizedCaption || sanitizedText, replyMarkup);
    } else {
      // Отправляем текстовое сообщение
      result = await sendTelegramMessage(chatId, sanitizedText, replyMarkup);
    }

    if (!result.ok) {
      return res.status(500).json({
        error: 'Failed to send message',
        telegram_error: result.description || result.error
      });
    }

    return res.status(200).json({
      success: true,
      message_id: result.result?.message_id
    });

  } catch (error) {
    console.error('Admin send message error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
