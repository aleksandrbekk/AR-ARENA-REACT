// 0xProcessing Webhook для Premium AR Club (крипто-оплата)
// Vercel Serverless Function
// Refactored: 2026-01-24

import crypto from 'crypto';
import { supabase } from './utils/supabase.js';
import { sendTelegramPhoto, sendTelegramMessage, createInviteLinks } from './utils/telegram.js';
import { TARIFF_CARD_IMAGES } from './utils/tariffs.js';
import {
  getPeriodByAmountUSD,
  normalizeCryptoCurrency,
  trackUtmConversion,
  trackStreamConversionFromBillingId,
  findUsernameByTelegramId,
  findTelegramIdByUsername,
  ensureUserExists
} from './utils/payment-helpers.js';
import { logSystemMessage } from './utils/log-system-message.js';

// ============================================
// CONFIGURATION
// ============================================

const MERCHANT_ID = '0xMR3389551';
const WEBHOOK_SECRET = process.env.OXPROCESSING_WEBHOOK_SECRET;
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
    console.log(`[${timestamp}] [0xProcessing] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [0xProcessing] ${message}`);
  }
}

// ============================================
// HMAC SIGNATURE VERIFICATION (0xProcessing-specific)
// ============================================

function verifyWebhookSignature(payload, signature, secret) {
  if (!signature || !secret) return false;

  try {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadString);
    const expectedSignature = hmac.digest('hex');

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (signatureBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    log('Signature verification error:', error.message);
    return false;
  }
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Signature, X-Webhook-Signature, X-0x-Signature, Signature');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', service: '0xProcessing Webhook', method: 'POST only' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let webhookLogId = null;  // Track webhook log for error reporting
  
  try {
    log('=== WEBHOOK RECEIVED ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const payload = req.body;

    // Save webhook payload for debugging (with ID for error tracking)
    try {
      const { data: logData } = await supabase.from('webhook_logs').insert({
        source: '0xprocessing',
        event_type: payload.Status || 'unknown',
        payload: JSON.stringify(payload),
        status: 'received',
        created_at: new Date().toISOString()
      }).select('id').single();
      webhookLogId = logData?.id;
      log('Webhook payload saved to webhook_logs, id:', webhookLogId);
    } catch (logError) {
      log('Could not save webhook log:', logError.message);
    }

    // ============================================
    // 1. SECURITY: HMAC VERIFICATION
    // ============================================
    const signature = req.headers['x-signature']
      || req.headers['x-webhook-signature']
      || req.headers['x-0x-signature']
      || req.headers['signature'];

    if (WEBHOOK_SECRET) {
      if (signature) {
        if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
          log('SECURITY: Invalid webhook signature');
          return res.status(401).json({ error: 'Invalid signature' });
        }
        log('SECURITY: Signature verified');
      } else {
        log('SECURITY WARNING: No signature header received');
      }
    }

    // ============================================
    // 2. VALIDATE PAYLOAD
    // ============================================
    const { Status, ClientId, AmountUSD, Amount, Currency, BillingId, TransactionHash, MerchantId, PaymentId } = payload;

    log(`Payment status: ${Status}, ClientId: ${ClientId}, Amount: ${AmountUSD || Amount} ${Currency}`);

    if (MerchantId && MerchantId !== MERCHANT_ID) {
      log(`Invalid MerchantId: ${MerchantId}`);
      return res.status(200).json({ message: 'Invalid merchant' });
    }

    if (Status !== 'Success' && Status !== 'Completed') {
      log(`Payment status: ${Status} - ignoring`);
      return res.status(200).json({ message: 'Payment not successful' });
    }

    if (!ClientId) {
      return res.status(200).json({ message: 'No ClientId found' });
    }

    // ============================================
    // 3. DUPLICATE CHECK
    // ============================================
    const uniquePaymentId = PaymentId || TransactionHash;

    if (uniquePaymentId) {
      const { data: existingPayment } = await supabase
        .from('payment_history')
        .select('id, created_at')
        .eq('contract_id', uniquePaymentId)
        .maybeSingle();

      if (existingPayment) {
        log(`DUPLICATE: Payment ${uniquePaymentId} already processed`);
        return res.status(200).json({ message: 'Payment already processed' });
      }
    }

    // ============================================
    // 4. EXTRACT TELEGRAM ID
    // ============================================
    let telegramId = null;
    let username = null;

    if (/^\d+$/.test(ClientId)) {
      telegramId = ClientId;
      username = await findUsernameByTelegramId(telegramId);
    } else {
      username = ClientId;
      const found = await findTelegramIdByUsername(username);
      if (found) {
        telegramId = String(found.telegramId);
        username = found.username;
      }
    }

    log(`Telegram ID: ${telegramId || 'N/A'}, Username: ${username || 'N/A'}`);
    const telegramIdInt = telegramId ? parseInt(telegramId) : null;

    // ============================================
    // 5. DETERMINE PERIOD
    // ============================================
    let amountUSD = payload.TotalAmountUSD ?? payload.AmountUSD ?? parseFloat(Amount || 0);
    amountUSD = parseFloat(amountUSD);
    log(`Amount USD: ${amountUSD}`);

    const period = getPeriodByAmountUSD(amountUSD);
    log(`Period: ${period.days} days (${period.name})`);

    // ============================================
    // 6. ENSURE USER EXISTS
    // ============================================
    if (telegramIdInt) {
      await ensureUserExists(telegramIdInt, username, '0xprocessing_payment');
    }

    // ============================================
    // 6.1 CRITICAL: telegram_id REQUIRED for payment recording
    // ============================================
    if (!telegramIdInt) {
      log('CRITICAL: No valid telegram_id! Cannot record payment.');
      log(`ClientId: ${ClientId}, username: ${username}`);
      
      // Log for debugging
      try {
        await supabase.from('webhook_logs').insert({
          source: '0xprocessing',
          event_type: 'ERROR_NO_TELEGRAM_ID',
          payload: JSON.stringify({ payload, error: 'No telegram_id resolved', client_id: ClientId, username }),
          status: 'error',
          error_message: 'No telegram_id resolved - user must start bot first',
          created_at: new Date().toISOString()
        });
      } catch (e) {}
      
      return res.status(400).json({ 
        error: 'Missing telegram_id', 
        client_id: ClientId,
        message: 'Cannot activate subscription without telegram_id. User must start bot first.'
      });
    }

    // ============================================
    // 7. RECORD PAYMENT HISTORY (BEFORE premium_clients!)
    // ============================================
    const paymentContractId = PaymentId || TransactionHash || `0x_${Date.now()}_${telegramIdInt || username}`;

    const { data: existingByContract } = await supabase
      .from('payment_history')
      .select('id')
      .eq('contract_id', paymentContractId)
      .maybeSingle();

    if (existingByContract) {
      log(`DUPLICATE: Payment ${paymentContractId} exists`);
      return res.status(200).json({ message: 'Payment already processed' });
    }

    const paymentData = {
      telegram_id: telegramIdInt ? String(telegramIdInt) : username,
      amount: amountUSD,
      currency: 'USD',
      source: '0xprocessing',
      contract_id: paymentContractId,
      tx_hash: TransactionHash || null,
      plan: period.tariff,
      days_added: period.days,  // REQUIRED field!
      status: 'success',
      created_at: new Date().toISOString()
    };

    const { error: paymentError } = await supabase.from('payment_history').insert(paymentData);

    if (paymentError) {
      if (paymentError.code === '23505') {
        log(`DUPLICATE: Unique constraint violation`);
        return res.status(200).json({ message: 'Payment already processed' });
      }
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
    } else if (username) {
      const { data } = await supabase.from('premium_clients').select('*').eq('username', username).single();
      existingClient = data;
    }

    let clientId;
    let isNewClient = false;

    if (existingClient) {
      const currentExpires = new Date(existingClient.expires_at);
      const newExpires = currentExpires > now
        ? new Date(currentExpires.getTime() + period.days * 24 * 60 * 60 * 1000)
        : expiresAt;

      await supabase.from('premium_clients').update({
        plan: period.tariff,
        expires_at: newExpires.toISOString(),
        total_paid_usd: (existingClient.total_paid_usd || 0) + Math.round(amountUSD),
        payments_count: (existingClient.payments_count || 0) + 1,
        last_payment_at: now.toISOString(),
        last_payment_method: '0xprocessing',
        source: '0xprocessing',
        currency: normalizeCryptoCurrency(Currency),
        original_amount: Math.round(amountUSD),
        updated_at: now.toISOString()
      }).eq('id', existingClient.id);

      clientId = existingClient.id;
      log(`Client updated, expires: ${newExpires.toISOString()}`);
    } else {
      isNewClient = true;

      const { data: newClient, error: insertError } = await supabase.from('premium_clients').insert({
        telegram_id: telegramIdInt,
        username,
        plan: period.tariff,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        in_channel: false,
        in_chat: false,
        tags: [],
        source: '0xprocessing',
        total_paid_usd: Math.round(amountUSD),
        payments_count: 1,
        last_payment_at: now.toISOString(),
        last_payment_method: '0xprocessing',
        currency: normalizeCryptoCurrency(Currency),
        original_amount: Math.round(amountUSD),
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      }).select().single();

      if (insertError) throw new Error('Failed to insert client');
      clientId = newClient.id;
      log(`New client created, expires: ${expiresAt.toISOString()}`);
    }

    // ============================================
    // 9. SEND TELEGRAM MESSAGE
    // ============================================
    let finalTelegramId = telegramIdInt || existingClient?.telegram_id;

    if (finalTelegramId) {
      const { channelLink, chatLink } = await createInviteLinks(finalTelegramId);

      const welcomeText = isNewClient
        ? `🎉 <b>Добро пожаловать в Premium AR Club!</b>\n\nВаша подписка <b>${period.name}</b> активирована на ${period.days} дней.\n\n👇 Нажмите кнопки ниже для доступа:\n\n📞 Служба заботы: @Andrey_cryptoinvestor`
        : `✅ <b>Подписка продлена!</b>\n\nДобавлено <b>${period.days} дней</b> к вашей подписке ${period.name}.\n\n👇 Нажмите кнопки ниже для доступа:\n\n📞 Служба заботы: @Andrey_cryptoinvestor`;

      const buttons = [];
      if (channelLink) buttons.push([{ text: '📢 Канал Premium', url: channelLink }]);
      if (chatLink) buttons.push([{ text: '💬 Чат Premium', url: chatLink }]);
      const replyMarkup = { inline_keyboard: buttons };

      const cardImageUrl = TARIFF_CARD_IMAGES[period.tariff] || TARIFF_CARD_IMAGES['classic'];
      const photoResult = await sendTelegramPhoto(finalTelegramId, cardImageUrl, welcomeText, replyMarkup);

      if (photoResult?.ok) {
        log('Welcome message sent');
        await logSystemMessage({
          telegram_id: finalTelegramId,
          message_type: 'payment_welcome',
          text: welcomeText,
          source: '0xprocessing',
          success: true,
          metadata: { is_new_client: isNewClient, tariff: period.name, days: period.days, amount_usd: amountUSD }
        });
      } else {
        const textResult = await sendTelegramMessage(finalTelegramId, welcomeText, replyMarkup);
        await logSystemMessage({
          telegram_id: finalTelegramId,
          message_type: 'payment_welcome',
          text: welcomeText,
          source: '0xprocessing',
          success: textResult?.ok || false,
          metadata: { fallback_to_text: true, tariff: period.name, days: period.days }
        });
      }
    }

    // ============================================
    // 10. UTM TRACKING
    // ============================================
    if (finalTelegramId) await trackUtmConversion(finalTelegramId);
    await trackStreamConversionFromBillingId(BillingId);

    // ============================================
    // 11. ADMIN NOTIFICATION
    // ============================================
    const adminMessage = `💰 <b>Новый платёж 0xProcessing (крипта)!</b>\n\n👤 ID: <code>${finalTelegramId || 'N/A'}</code>\n📋 Тариф: <b>${period.name}</b>\n💵 Сумма: <b>$${amountUSD}</b>\n🪙 Валюта: ${Currency || 'CRYPTO'}\n📅 Дней: ${period.days}\n🆕 Новый: ${isNewClient ? 'Да' : 'Нет (продление)'}`;

    await sendTelegramMessage(ADMIN_ID, adminMessage);
    await logSystemMessage({
      telegram_id: ADMIN_ID,
      message_type: 'admin_notification',
      text: adminMessage,
      source: '0xprocessing',
      success: true,
      metadata: { user_telegram_id: finalTelegramId, tariff: period.name, amount_usd: amountUSD, is_new_client: isNewClient }
    });

    log('Webhook processed successfully');
    return res.status(200).end();

  } catch (error) {
    log('Webhook error', { error: error.message, stack: error.stack });
    
    // Update webhook_logs with error details
    if (webhookLogId) {
      try {
        await supabase.from('webhook_logs').update({
          status: 'error',
          error_message: `${error.message}\n${error.stack?.substring(0, 500)}`
        }).eq('id', webhookLogId);
        log('Webhook error logged to webhook_logs');
      } catch (e) {
        log('Could not update webhook log with error:', e.message);
      }
    }
    
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
