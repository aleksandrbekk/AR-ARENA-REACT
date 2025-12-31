// API для отправки сообщений из Inbox
// 2025-12-27

import { createClient } from '@supabase/supabase-js';
import { sanitizeString } from './utils/sanitize.js';

// SECURITY: All secrets from environment variables (set in Vercel)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required env vars
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN) {
  console.error('CRITICAL: Missing required environment variables');
}

const ADMIN_IDS = [190202791, 144828618, 288542643, 288475216];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

// Сохранить исходящее сообщение в БД
async function saveOutgoingMessage(conversationId, telegramId, text, sentBy) {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        telegram_id: telegramId,
        text,
        direction: 'outgoing',
        message_type: 'text',
        sent_by: String(sentBy),
        is_read: true
      });

    if (error) {
      console.error('Save message error:', error);
      return false;
    }

    // Обновляем conversation
    await supabase
      .from('chat_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_text: text.substring(0, 100),
        last_message_from: 'bot',
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    return true;
  } catch (err) {
    console.error('saveOutgoingMessage error:', err);
    return false;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { conversationId, telegramId, text, sentBy } = req.body;

    // Санитизируем текст от битых Unicode
    const sanitizedText = sanitizeString(text);

    // Валидация
    if (!conversationId || !telegramId || !sanitizedText) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['conversationId', 'telegramId', 'text']
      });
    }

    // Проверяем что отправитель — админ (опционально)
    // if (sentBy && !ADMIN_IDS.includes(Number(sentBy))) {
    //   return res.status(403).json({ error: 'Not authorized' });
    // }

    // Отправляем в Telegram
    const result = await sendTelegramMessage(telegramId, sanitizedText);

    if (!result.ok) {
      return res.status(500).json({
        error: 'Failed to send message',
        telegram_error: result.description || result.error
      });
    }

    // Сохраняем в БД
    const saved = await saveOutgoingMessage(conversationId, telegramId, sanitizedText, sentBy || 'admin');

    return res.status(200).json({
      success: true,
      message_id: result.result?.message_id,
      saved
    });

  } catch (error) {
    console.error('Inbox send error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
