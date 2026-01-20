// Универсальная функция для логирования системных сообщений
// 2026-01-XX

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

/**
 * Логирует системное сообщение в БД
 * @param {Object} params - Параметры сообщения
 * @param {string|number} params.telegram_id - Telegram ID получателя
 * @param {string} params.message_type - Тип сообщения: 'payment_welcome', 'subscription_reminder', 'auto_kick', 'admin_notification', etc.
 * @param {string} params.text - Текст сообщения
 * @param {string} params.source - Источник: '0xprocessing', 'lava', 'toolsy', 'subscription-reminder', etc.
 * @param {boolean} params.success - Успешно ли отправлено
 * @param {string} params.error - Ошибка если не удалось отправить
 * @param {Object} params.metadata - Дополнительные данные (payment_id, tariff, etc.)
 * @returns {Promise<boolean>} - true если успешно записано
 */
export async function logSystemMessage({
  telegram_id,
  message_type,
  text,
  source,
  success = true,
  error = null,
  metadata = {}
}) {
  if (!supabase) {
    console.warn('[logSystemMessage] Supabase not configured, skipping log');
    return false;
  }

  if (!telegram_id || !message_type || !text || !source) {
    console.warn('[logSystemMessage] Missing required fields', { telegram_id, message_type, text, source });
    return false;
  }

  try {
    const { error: insertError } = await supabase
      .from('system_messages')
      .insert({
        telegram_id: String(telegram_id),
        message_type,
        text: text.substring(0, 5000), // Ограничение длины
        source,
        success,
        error: error ? error.substring(0, 1000) : null,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('[logSystemMessage] Failed to log message:', insertError);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[logSystemMessage] Error:', err);
    return false;
  }
}
