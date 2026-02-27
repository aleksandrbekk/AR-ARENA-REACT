// ============================================
// TELEGRAM API UTILITIES
// Отправка сообщений, создание invite-ссылок
// ============================================

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase.js';
import { NOTIFICATION_ADMIN_IDS } from './config.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const KIKER_BOT_TOKEN = process.env.KIKER_BOT_TOKEN;

// Channel/Chat IDs
const CHANNEL_ID = '-1001634734020';
const CHAT_ID = '-1001828659569';

// ============================================
// HELPERS
// ============================================

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] [TELEGRAM] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [TELEGRAM] ${message}`);
  }
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// SEND PHOTO
// ============================================

export async function sendTelegramPhoto(telegramId, photoUrl, caption, replyMarkup = null, maxRetries = 3) {
  const body = {
    chat_id: telegramId,
    photo: photoUrl,
    caption,
    parse_mode: 'HTML'
  };

  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`Sending photo to ${telegramId}, attempt ${attempt}/${maxRetries}`);

      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      if (result.ok) {
        log(`Photo sent successfully to ${telegramId}`);
        return result;
      }

      log(`sendPhoto failed (attempt ${attempt}/${maxRetries}):`, result);

      if (attempt < maxRetries) {
        const delayMs = 2000 * attempt;
        log(`Retrying in ${delayMs}ms...`);
        await delay(delayMs);
      }
    } catch (error) {
      log(`sendPhoto error (attempt ${attempt}/${maxRetries}):`, { error: error.message });

      if (attempt < maxRetries) {
        const delayMs = 2000 * attempt;
        log(`Retrying in ${delayMs}ms...`);
        await delay(delayMs);
      }
    }
  }

  log(`Failed to send photo after ${maxRetries} attempts`);
  return null;
}

// ============================================
// SEND MESSAGE
// ============================================

export async function sendTelegramMessage(telegramId, text, replyMarkup = null, maxRetries = 3) {
  const body = {
    chat_id: telegramId,
    text,
    parse_mode: 'HTML'
  };

  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`Sending message to ${telegramId}, attempt ${attempt}/${maxRetries}`);

      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      if (result.ok) {
        log(`Message sent successfully to ${telegramId}`);
        return result;
      }

      log(`sendMessage failed (attempt ${attempt}/${maxRetries}):`, result);

      if (attempt < maxRetries) {
        const delayMs = 2000 * attempt;
        log(`Retrying in ${delayMs}ms...`);
        await delay(delayMs);
      }
    } catch (error) {
      log(`sendMessage error (attempt ${attempt}/${maxRetries}):`, { error: error.message });

      if (attempt < maxRetries) {
        const delayMs = 2000 * attempt;
        log(`Retrying in ${delayMs}ms...`);
        await delay(delayMs);
      }
    }
  }

  log(`Failed to send message after ${maxRetries} attempts`);
  return null;
}

// ============================================
// INVITE LINKS
// ============================================

async function createDirectInviteLink(chatId) {
  // Try KIKER_BOT_TOKEN first, then fallback to BOT_TOKEN
  const tokens = [
    { token: KIKER_BOT_TOKEN, name: 'KIKER_BOT' },
    { token: BOT_TOKEN, name: 'MAIN_BOT' }
  ].filter(t => t.token);

  for (const { token, name } of tokens) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/createChatInviteLink`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            member_limit: 1
          })
        }
      );
      const result = await response.json();
      if (result.ok) {
        log(`Invite link created via ${name} for chat ${chatId}`);
        return result.result.invite_link;
      }
      log(`${name} failed to create invite for ${chatId}:`, {
        error_code: result.error_code,
        description: result.description
      });
    } catch (error) {
      log(`${name} invite link error for ${chatId}:`, { error: error.message });
    }
  }

  log(`CRITICAL: All tokens failed to create invite link for chat ${chatId}`);
  return null;
}

export async function createInviteLinks(telegramId) {
  let channelLink = null;
  let chatLink = null;

  try {
    // Try via Edge Function first
    const response = await fetch(`${SUPABASE_URL}/functions/v1/telegram-channel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ action: 'invite', telegram_id: parseInt(telegramId) })
    });

    const result = await response.json();
    log('Edge Function invite response', result);

    channelLink = result.results?.channel?.result?.invite_link || null;
    chatLink = result.results?.chat?.result?.invite_link || null;
  } catch (error) {
    log('Edge Function error, falling back to direct API', { error: error.message });
  }

  // Fallback: create directly if Edge Function failed
  if (!channelLink) {
    log('Channel link missing from Edge Function, creating directly');
    channelLink = await createDirectInviteLink(CHANNEL_ID);
  }
  if (!chatLink) {
    log('Chat link missing from Edge Function, creating directly');
    chatLink = await createDirectInviteLink(CHAT_ID);
  }

  // CRITICAL: Log if both methods failed
  if (!channelLink || !chatLink) {
    log('🚨 CRITICAL: Failed to create invite links!', {
      telegram_id: telegramId,
      channelLink: channelLink ? 'OK' : 'FAILED',
      chatLink: chatLink ? 'OK' : 'FAILED',
      channel_id: CHANNEL_ID,
      chat_id: CHAT_ID,
      has_kiker_token: !!KIKER_BOT_TOKEN,
      has_bot_token: !!BOT_TOKEN
    });
  }

  return { channelLink, chatLink };
}

// ============================================
// SEND TO ALL ADMINS
// ============================================

export async function sendToAllAdmins(text, replyMarkup = null) {
  const adminIds = NOTIFICATION_ADMIN_IDS || ['190202791'];
  const results = [];

  for (const adminId of adminIds) {
    const result = await sendTelegramMessage(adminId, text, replyMarkup);
    results.push({ adminId, ok: result?.ok || false });
  }

  return results;
}
