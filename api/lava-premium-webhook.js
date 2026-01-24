// Lava.top Webhook для Premium AR Club подписок
// Vercel Serverless Function
// Refactored: 2026-01-24

import { supabase } from './utils/supabase.js';
import { sendTelegramPhoto, sendTelegramMessage, createInviteLinks } from './utils/telegram.js';
import { TARIFF_CARD_IMAGES, CURRENCY_TO_USD, MIN_AMOUNTS } from './utils/tariffs.js';
import {
  getPeriodByPeriodicityOrAmount,
  trackUtmConversion,
  trackStreamConversionFromPayload,
  findTelegramIdByUsername,
  ensureUserExists
} from './utils/payment-helpers.js';
import { logSystemMessage } from './utils/log-system-message.js';

// ============================================
// CONFIGURATION
// ============================================

const LAVA_API_KEY = process.env.LAVA_API_KEY;
const BASIC_AUTH_LOGIN = process.env.LAVA_WEBHOOK_LOGIN;
const ADMIN_ID = '190202791';

const ALLOWED_ORIGINS = [
  'https://ar-arena.games',
  'https://www.ar-arena.games',
  'https://ar-arena-react.vercel.app',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
].filter(Boolean);

// ============================================
// LOGGING
// ============================================

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] [Lava] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [Lava] ${message}`);
  }
}

// ============================================
// LAVA-SPECIFIC HELPERS
// ============================================

function getCurrencyFromPayload(payload) {
  const { buyerCurrency, payment, invoice, currency: rawCurrency } = payload;
  if (buyerCurrency) return buyerCurrency.toUpperCase();
  if (payment?.currency) return payment.currency.toUpperCase();
  if (invoice?.currency) return invoice.currency.toUpperCase();
  if (rawCurrency) return rawCurrency.toUpperCase();
  return 'RUB';
}

function getGrossAmount(payload) {
  const { buyerAmount, invoice, amount: rawAmount } = payload;
  if (buyerAmount) return parseFloat(buyerAmount);
  if (invoice?.amount) return parseFloat(invoice.amount);
  return parseFloat(rawAmount || 0);
}

function getNetAmount(payload) {
  const { payment, shopAmount, amount: rawAmount, buyerAmount } = payload;
  if (payment?.amount) return parseFloat(payment.amount);
  if (shopAmount) return parseFloat(shopAmount);
  // 8% Lava commission
  const grossAmount = parseFloat(buyerAmount || rawAmount || 0);
  return grossAmount * 0.92;
}

async function extractTelegramIdOrUsername(payload) {
  const clientUtm = payload.clientUtm || {};
  const utmValues = [
    clientUtm.utm_source,
    clientUtm.utm_medium,
    clientUtm.utm_campaign,
    clientUtm.utm_term,
    clientUtm.utm_content
  ].filter(Boolean);

  for (const value of utmValues) {
    // Format: "telegram_id=123456789"
    const idMatch = value.match(/telegram_id[=:](\d+)/i);
    if (idMatch) {
      const telegramId = idMatch[1];
      const { data: userData } = await supabase
        .from('users')
        .select('username')
        .eq('telegram_id', parseInt(telegramId))
        .single();
      return { telegramId, username: userData?.username || null };
    }

    // Format: "telegram_username=username"
    const usernameMatch = value.match(/telegram_username[=:](\w+)/i);
    if (usernameMatch) {
      const username = usernameMatch[1];
      const found = await findTelegramIdByUsername(username);
      if (found) return { telegramId: String(found.telegramId), username: found.username };
      return { telegramId: null, username };
    }
  }

  // Fallback: check email
  const possibleEmails = [
    payload.buyer?.email,
    payload.email,
    payload.invoice?.email,
    payload.buyerEmail
  ].filter(Boolean);

  for (const email of possibleEmails) {
    const idMatch = email.match(/^(\d{6,})@/);
    if (idMatch) {
      const telegramId = idMatch[1];
      const { data: userData } = await supabase
        .from('users')
        .select('username')
        .eq('telegram_id', parseInt(telegramId))
        .single();
      return { telegramId, username: userData?.username || null };
    }

    const usernameMatch = email.match(/^([a-zA-Z][a-zA-Z0-9_]+)@/);
    if (usernameMatch) {
      const username = usernameMatch[1];
      const found = await findTelegramIdByUsername(username);
      if (found) return { telegramId: String(found.telegramId), username: found.username };
      return { telegramId: null, username };
    }
  }

  return { telegramId: null, username: null };
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin;
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', service: 'Lava.top Webhook', method: 'POST only' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    log('=== WEBHOOK RECEIVED ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const payload = req.body;

    // ============================================
    // 1. AUTHORIZATION (Basic Auth, Bearer, X-Api-Key)
    // ============================================
    const authHeader = req.headers['authorization'];
    const apiKeyHeader = req.headers['x-api-key'];
    let isAuthorized = false;

    if (authHeader?.startsWith('Basic ')) {
      const base64 = authHeader.replace('Basic ', '').trim();
      const [login] = Buffer.from(base64, 'base64').toString('utf8').split(':');
      if (login === BASIC_AUTH_LOGIN) {
        isAuthorized = true;
        log('Basic Auth verified');
      }
    } else if (authHeader?.startsWith('Bearer ')) {
      if (authHeader.replace('Bearer ', '').trim() === LAVA_API_KEY) {
        isAuthorized = true;
        log('Bearer token verified');
      }
    } else if (apiKeyHeader?.trim() === LAVA_API_KEY) {
      isAuthorized = true;
      log('X-Api-Key verified');
    }

    if (!isAuthorized) {
      log('Unauthorized request');
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // ============================================
    // 2. VALIDATE PAYLOAD
    // ============================================
    if (!payload?.eventType) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const { eventType, contractId, status } = payload;
    const currency = getCurrencyFromPayload(payload);
    const grossAmount = getGrossAmount(payload);
    const netAmount = getNetAmount(payload);

    log(`Event: ${eventType}, Status: ${status}`);
    log(`Gross: ${grossAmount} ${currency}, Net: ${netAmount} ${currency}`);

    const successEvents = ['payment.success', 'subscription.recurring.payment.success'];
    if (!successEvents.includes(eventType)) {
      return res.status(200).json({ message: 'Event not a success payment' });
    }

    const statusLower = status?.toLowerCase();
    if (statusLower !== 'completed' && statusLower !== 'subscription-active') {
      return res.status(200).json({ message: 'Payment not completed' });
    }

    // Filter test payments
    const minAmount = MIN_AMOUNTS[currency] || MIN_AMOUNTS['RUB'];
    if (grossAmount < minAmount) {
      log(`Test payment: ${grossAmount} ${currency} < ${minAmount}`);
      return res.status(200).json({ message: 'Test payment ignored' });
    }

    // ============================================
    // 3. EXTRACT TELEGRAM ID
    // ============================================
    const { telegramId, username: extractedUsername } = await extractTelegramIdOrUsername(payload);

    if (!telegramId && !extractedUsername) {
      return res.status(400).json({ error: 'Missing telegram_id or username' });
    }

    let telegramIdInt = telegramId ? parseInt(telegramId) : null;

    // Try to find telegram_id by username if missing
    if (!telegramIdInt && extractedUsername) {
      const found = await findTelegramIdByUsername(extractedUsername);
      if (found?.telegramId) telegramIdInt = found.telegramId;
    }

    log(`Telegram ID: ${telegramIdInt || 'N/A'}, Username: ${extractedUsername || 'N/A'}`);

    // ============================================
    // 4. DUPLICATE CHECK
    // ============================================
    if (contractId) {
      const { data: existing } = await supabase
        .from('payment_history')
        .select('id')
        .eq('contract_id', contractId)
        .single();

      if (existing) {
        log(`DUPLICATE: contractId ${contractId} exists`);
        return res.status(200).json({ message: 'Payment already processed' });
      }
    }

    // ============================================
    // 5. DETERMINE PERIOD
    // ============================================
    const periodicity = payload.periodicity || payload.offer?.periodicity;
    const period = getPeriodByPeriodicityOrAmount(periodicity, grossAmount, currency);
    log(`Period: ${period.days} days (${period.name})`);

    // ============================================
    // 6. ENSURE USER EXISTS
    // ============================================
    if (telegramIdInt) {
      await ensureUserExists(telegramIdInt, extractedUsername, 'lava_payment');
    }

    // ============================================
    // 7. RECORD PAYMENT HISTORY
    // ============================================
    const paymentHistoryId = contractId || `lava_${Date.now()}_${telegramId || extractedUsername}`;
    const paymentData = {
      telegram_id: telegramIdInt || null,
      amount: grossAmount,
      currency,
      source: 'lava.top',
      contract_id: paymentHistoryId,
      plan: period.tariff,
      days_added: period.days,
      status: 'success',
      created_at: new Date().toISOString()
    };

    const { error: paymentError } = await supabase.from('payment_history').insert(paymentData);

    if (paymentError) {
      log('CRITICAL: Failed to record payment:', paymentError);
      return res.status(500).json({ error: 'Failed to record payment' });
    }

    log('Payment history recorded');

    // ============================================
    // 8. UPSERT PREMIUM_CLIENTS
    // ============================================
    const now = new Date();
    const expiresAt = new Date(now.getTime() + period.days * 24 * 60 * 60 * 1000);

    let existingClient = null;
    if (telegramIdInt) {
      const { data } = await supabase.from('premium_clients').select('*').eq('telegram_id', telegramIdInt).single();
      existingClient = data;
    } else if (extractedUsername) {
      const { data } = await supabase.from('premium_clients').select('*').eq('username', extractedUsername).single();
      existingClient = data;
    }

    let isNewClient = false;
    const usdRate = CURRENCY_TO_USD[currency] || CURRENCY_TO_USD['RUB'];
    const netAmountUsd = netAmount * usdRate;

    if (existingClient) {
      const currentExpires = new Date(existingClient.expires_at);
      const newExpires = currentExpires > now
        ? new Date(currentExpires.getTime() + period.days * 24 * 60 * 60 * 1000)
        : expiresAt;

      await supabase.from('premium_clients').update({
        plan: period.tariff,
        expires_at: newExpires.toISOString(),
        total_paid_usd: (existingClient.total_paid_usd || 0) + netAmountUsd,
        currency,
        original_amount: netAmount,
        payments_count: (existingClient.payments_count || 0) + 1,
        last_payment_at: now.toISOString(),
        last_payment_method: 'lava.top',
        source: 'lava.top',
        ...(contractId && { contract_id: contractId }),
        updated_at: now.toISOString()
      }).eq('id', existingClient.id);

      log(`Client updated, expires: ${newExpires.toISOString()}`);
    } else {
      isNewClient = true;

      const { error: insertError } = await supabase.from('premium_clients').insert({
        telegram_id: telegramIdInt,
        username: extractedUsername,
        plan: period.tariff,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        in_channel: false,
        in_chat: false,
        tags: [],
        source: 'lava.top',
        total_paid_usd: netAmountUsd,
        currency,
        original_amount: netAmount,
        payments_count: 1,
        last_payment_at: now.toISOString(),
        last_payment_method: 'lava.top',
        contract_id: contractId || null,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      });

      if (insertError) throw new Error('Failed to insert client');
      log(`New client created, expires: ${expiresAt.toISOString()}`);
    }

    // ============================================
    // 9. SEND TELEGRAM MESSAGE
    // ============================================
    let finalTelegramId = telegramIdInt || existingClient?.telegram_id;

    if (finalTelegramId) {
      const { channelLink, chatLink } = await createInviteLinks(String(finalTelegramId));

      const welcomeText = isNewClient
        ? `🎉 <b>Добро пожаловать в Premium AR Club!</b>\n\nВаша подписка <b>${period.name}</b> активирована на ${period.days} дней.\n\n👇 Нажмите кнопки ниже для доступа:\n\n📞 Служба заботы: @Andrey_cryptoinvestor`
        : `✅ <b>Подписка продлена!</b>\n\nДобавлено <b>${period.days} дней</b> к вашей подписке ${period.name}.\n\n👇 Нажмите кнопки ниже для доступа:\n\n📞 Служба заботы: @Andrey_cryptoinvestor`;

      const buttons = [];
      if (channelLink) buttons.push([{ text: '📢 Канал Premium', url: channelLink }]);
      if (chatLink) buttons.push([{ text: '💬 Чат Premium', url: chatLink }]);
      const replyMarkup = { inline_keyboard: buttons };

      const cardImageUrl = TARIFF_CARD_IMAGES[period.tariff] || TARIFF_CARD_IMAGES['classic'];
      const photoResult = await sendTelegramPhoto(String(finalTelegramId), cardImageUrl, welcomeText, replyMarkup);

      if (photoResult?.ok) {
        log('Welcome message sent');
        await logSystemMessage({
          telegram_id: finalTelegramId,
          message_type: 'payment_welcome',
          text: welcomeText,
          source: 'lava.top',
          success: true,
          metadata: { is_new_client: isNewClient, tariff: period.name, days: period.days, amount: grossAmount, currency }
        });
      } else {
        const textResult = await sendTelegramMessage(String(finalTelegramId), welcomeText, replyMarkup);
        await logSystemMessage({
          telegram_id: finalTelegramId,
          message_type: 'payment_welcome',
          text: welcomeText,
          source: 'lava.top',
          success: textResult?.ok || false,
          metadata: { fallback_to_text: true, tariff: period.name, days: period.days }
        });
      }
    }

    // ============================================
    // 10. UTM TRACKING
    // ============================================
    if (finalTelegramId) await trackUtmConversion(finalTelegramId);
    await trackStreamConversionFromPayload(payload);

    // ============================================
    // 11. ADMIN NOTIFICATION
    // ============================================
    const adminMessage = `💰 <b>Новый платёж Lava.top!</b>\n\n👤 ID: <code>${finalTelegramId || 'N/A'}</code>\n📋 Тариф: <b>${period.name}</b>\n💵 Сумма: <b>${grossAmount} ${currency}</b>\n💲 В USD: <b>$${(grossAmount * usdRate).toFixed(2)}</b>\n📅 Дней: ${period.days}\n🆕 Новый: ${isNewClient ? 'Да' : 'Нет (продление)'}`;

    await sendTelegramMessage(ADMIN_ID, adminMessage);
    await logSystemMessage({
      telegram_id: ADMIN_ID,
      message_type: 'admin_notification',
      text: adminMessage,
      source: 'lava.top',
      success: true,
      metadata: { user_telegram_id: finalTelegramId, tariff: period.name, amount: grossAmount, currency, is_new_client: isNewClient }
    });

    log('Webhook processed successfully');
    return res.status(200).json({
      success: true,
      message: 'Premium subscription activated',
      telegram_id: telegramId || null,
      period: period.name,
      days: period.days
    });

  } catch (error) {
    log('Webhook error', { error: error.message, stack: error.stack });
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
