// ============================================
// PAYMENT HELPERS
// Функции для обработки платежей
// ============================================

import { supabase } from './supabase.js';
import {
  PERIODICITY_TO_PERIOD,
  AMOUNT_TO_PERIOD_USD,
  AMOUNT_TO_PERIOD,
  CURRENCY_TO_USD
} from './tariffs.js';

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] [PAYMENT] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [PAYMENT] ${message}`);
  }
}

// ============================================
// PERIOD DETECTION
// ============================================

/**
 * Get period by USD amount (for 0xProcessing crypto payments)
 */
export function getPeriodByAmountUSD(amountUSD) {
  const amount = parseFloat(amountUSD);
  for (const period of AMOUNT_TO_PERIOD_USD) {
    if (amount >= period.min && amount <= period.max) {
      return period;
    }
  }
  log(`Unknown amount ${amountUSD} USD, defaulting to 30 days`);
  return { days: 30, tariff: 'unknown', name: 'UNKNOWN' };
}

/**
 * Get period by periodicity or amount (for Lava.top payments)
 */
export function getPeriodByPeriodicityOrAmount(periodicity, amount, currency = 'RUB') {
  // First try by periodicity
  if (periodicity && PERIODICITY_TO_PERIOD[periodicity]) {
    log(`Period found by periodicity: ${periodicity}`);
    return PERIODICITY_TO_PERIOD[periodicity];
  }

  // Fallback: by amount with currency
  if (amount) {
    const amountNum = parseFloat(amount);
    const currencyUpper = (currency || 'RUB').toUpperCase();
    const periodsForCurrency = AMOUNT_TO_PERIOD[currencyUpper] || AMOUNT_TO_PERIOD['RUB'];

    for (const period of periodsForCurrency) {
      if (amountNum >= period.min && amountNum <= period.max) {
        log(`Period found by amount: ${amountNum} ${currencyUpper}`);
        return period;
      }
    }

    // Try converting to USD
    const usdRate = CURRENCY_TO_USD[currencyUpper] || 1;
    const amountUsd = amountNum * usdRate;
    log(`Trying USD conversion: ${amountNum} ${currencyUpper} = ${amountUsd.toFixed(2)} USD`);

    for (const period of AMOUNT_TO_PERIOD['USD']) {
      if (amountUsd >= period.min && amountUsd <= period.max) {
        log(`Period found by USD conversion: ${amountUsd.toFixed(2)} USD`);
        return period;
      }
    }
  }

  log(`Unknown periodicity ${periodicity} and amount ${amount} ${currency}, defaulting to 30 days`);
  return { days: 30, tariff: 'unknown', name: 'UNKNOWN' };
}

// ============================================
// CURRENCY
// ============================================

/**
 * Normalize currency for crypto payments (all crypto = USD)
 */
export function normalizeCryptoCurrency(currency) {
  if (!currency) return 'USD';
  const upper = currency.toUpperCase();
  // All crypto/stablecoins → USD
  if (upper.includes('USDT') || upper.includes('USDC') || upper.includes('USD') ||
    upper.includes('BTC') || upper.includes('ETH') || upper.includes('TON') ||
    upper.includes('TRX') || upper.includes('BNB') || upper.includes('SOL') ||
    upper.includes('CRYPTO')) {
    return 'USD';
  }
  return 'USD'; // Default for 0xprocessing
}

// ============================================
// UTM TRACKING
// ============================================

/**
 * Track UTM conversion from user_sources
 */
export async function trackUtmConversion(telegramId) {
  if (!telegramId) return;

  try {
    const { data: userSource } = await supabase
      .from('user_sources')
      .select('source')
      .eq('telegram_id', telegramId)
      .single();

    if (userSource?.source) {
      await supabase.rpc('increment_utm_conversion', { p_slug: userSource.source });
      log(`UTM conversion tracked: ${userSource.source} for user ${telegramId}`);
    }
  } catch (err) {
    log('trackUtmConversion error (non-critical)', { error: err.message });
  }
}

/**
 * Track stream UTM conversion from BillingId (0xProcessing format)
 */
export async function trackStreamConversionFromBillingId(billingId) {
  if (!billingId) return;

  try {
    // BillingId format: premium_tariff_clientId_timestamp_stream_SLUG
    const streamMatch = billingId.match(/_stream_([a-zA-Z0-9_-]+)$/);
    if (!streamMatch) {
      log('No stream_utm in BillingId');
      return;
    }

    const streamUtmSlug = streamMatch[1];
    log(`Found stream_utm in BillingId: ${streamUtmSlug}`);

    const { data: link } = await supabase
      .from('utm_tool_links')
      .select('id, conversions')
      .eq('slug', streamUtmSlug)
      .single();

    if (link) {
      await supabase
        .from('utm_tool_links')
        .update({
          conversions: (link.conversions || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', link.id);

      log(`Stream conversion tracked for slug: ${streamUtmSlug}`);
    } else {
      log(`Stream UTM link not found: ${streamUtmSlug}`);
    }
  } catch (err) {
    log('trackStreamConversion error (non-critical)', { error: err.message });
  }
}

/**
 * Track stream UTM conversion from Lava payload (clientUtm format)
 */
export async function trackStreamConversionFromPayload(payload) {
  const clientUtm = payload.clientUtm || {};

  const utmValues = [
    clientUtm.utm_source,
    clientUtm.utm_medium,
    clientUtm.utm_campaign,
    clientUtm.utm_term,
    clientUtm.utm_content
  ].filter(Boolean);

  for (const value of utmValues) {
    const streamUtmMatch = value.match(/stream_utm[=:]([a-zA-Z0-9_-]+)/i);
    if (streamUtmMatch) {
      const streamUtmSlug = streamUtmMatch[1];
      log(`Found stream_utm: ${streamUtmSlug}`);

      const { data: link } = await supabase
        .from('utm_tool_links')
        .select('id, conversions')
        .eq('slug', streamUtmSlug)
        .single();

      if (link) {
        await supabase
          .from('utm_tool_links')
          .update({
            conversions: (link.conversions || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', link.id);

        log(`Stream conversion tracked for slug: ${streamUtmSlug}`);
      } else {
        log(`Stream UTM link not found: ${streamUtmSlug}`);
      }
      return;
    }
  }

  log('No stream_utm found in payload');
}

// ============================================
// USER LOOKUP
// ============================================

/**
 * Find telegram_id by username in users or premium_clients
 */
export async function findTelegramIdByUsername(username) {
  if (!username) return null;

  // Try users table first
  const { data: userData } = await supabase
    .from('users')
    .select('telegram_id, username')
    .ilike('username', username)
    .single();

  if (userData?.telegram_id) {
    log(`Found telegram_id ${userData.telegram_id} for username ${username} in users`);
    return { telegramId: userData.telegram_id, username: userData.username };
  }

  // Try premium_clients
  const { data: clientData } = await supabase
    .from('premium_clients')
    .select('telegram_id, username')
    .ilike('username', username)
    .single();

  if (clientData?.telegram_id) {
    log(`Found telegram_id ${clientData.telegram_id} for username ${username} in premium_clients`);
    return { telegramId: clientData.telegram_id, username: clientData.username };
  }

  log(`Username ${username} not found in users or premium_clients`);
  return null;
}

/**
 * Find username by telegram_id in users or premium_clients
 */
export async function findUsernameByTelegramId(telegramId) {
  if (!telegramId) return null;

  const telegramIdInt = parseInt(telegramId);

  // Try users table first
  const { data: userData } = await supabase
    .from('users')
    .select('username')
    .eq('telegram_id', telegramIdInt)
    .single();

  if (userData?.username) {
    log(`Found username ${userData.username} for telegram_id ${telegramId} in users`);
    return userData.username;
  }

  // Try premium_clients
  const { data: clientData } = await supabase
    .from('premium_clients')
    .select('username')
    .eq('telegram_id', telegramIdInt)
    .single();

  if (clientData?.username) {
    log(`Found username ${clientData.username} for telegram_id ${telegramId} in premium_clients`);
    return clientData.username;
  }

  log(`No username found for telegram_id ${telegramId}`);
  return null;
}

/**
 * Ensure user exists in users table (for FK constraint)
 */
export async function ensureUserExists(telegramId, username = null, source = 'payment') {
  if (!telegramId) return false;

  const telegramIdInt = parseInt(telegramId);

  const { data: existingUser } = await supabase
    .from('users')
    .select('telegram_id, username')
    .eq('telegram_id', telegramIdInt)
    .single();

  if (!existingUser) {
    log(`User ${telegramIdInt} not found in users table, creating...`);

    const { error: createUserError } = await supabase
      .from('users')
      .insert({
        telegram_id: telegramIdInt,
        username: username || null,
        first_name: null,
        created_at: new Date().toISOString(),
        source: source
      });

    if (createUserError) {
      if (createUserError.code === '23505') {
        log(`User ${telegramIdInt} already exists (race condition), continuing...`);
        return true;
      }
      log(`Warning: Could not create user record:`, createUserError);
      return false;
    }

    log(`User ${telegramIdInt} created successfully in users table`);
    return true;
  }

  log(`User ${telegramIdInt} already exists in users table`);

  // Update username if we have new one and existing is empty
  if (username && !existingUser.username) {
    await supabase
      .from('users')
      .update({ username, updated_at: new Date().toISOString() })
      .eq('telegram_id', telegramIdInt);
    log(`Updated username to ${username} for user ${telegramIdInt}`);
  }

  return true;
}
