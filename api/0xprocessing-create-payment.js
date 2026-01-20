// 0xProcessing Payment Creation для Premium AR Club (крипто-оплата)
// Vercel Serverless Function
// 2025-12-23

const OXPROCESSING_URL = 'https://app.0xprocessing.com/Payment';
const MERCHANT_ID = process.env.OXPROCESSING_MERCHANT_ID || '0xMR3389551';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://ar-arena.games',
  'https://www.ar-arena.games',
  'https://ar-arena-react.vercel.app',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
].filter(Boolean);

export default async function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin;
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      telegramId,
      telegramUsername,
      email,
      amountUSD,
      currency, // Опционально - если не указан, 0xProcessing покажет выбор сети
      tariff,
      periodicity,
      streamUtmSource
    } = req.body;

    // Валидация
    if (!amountUSD) {
      return res.status(400).json({
        error: 'Missing required field: amountUSD'
      });
    }

    // ClientId для идентификации пользователя
    const clientId = telegramId || telegramUsername || 'anonymous';

    // Email для 0xProcessing
    const finalEmail = email || `${clientId}@premium.ararena.pro`;

    // BillingId - уникальный ID платежа (для отслеживания)
    // Формат: premium_tariff_clientId_timestamp_streamUtm (если есть)
    const billingId = streamUtmSource
      ? `premium_${tariff}_${clientId}_${Date.now()}_stream_${streamUtmSource}`
      : `premium_${tariff}_${clientId}_${Date.now()}`;

    console.log('[0xProcessing] Creating payment:', {
      clientId,
      amountUSD,
      currency,
      tariff,
      billingId
    });

    // Создаём платёж через 0xProcessing
    // Сеть указывается в формате "USDT (TRC20)", "USDT (BEP20)", "USDT (TON)"
    const finalCurrency = currency || 'USDT (TRC20)';

    // Формируем body вручную с правильным URL-encoding
    // (URLSearchParams кодирует пробел как +, а 0xProcessing требует %20)
    const params = {
      AmountUSD: amountUSD.toString(),
      Currency: finalCurrency,
      Email: finalEmail,
      ClientId: clientId,
      MerchantId: MERCHANT_ID,
      BillingId: billingId,
      SuccessUrl: 'https://ararena.pro/payment-success',
      CancelUrl: 'https://ararena.pro/pricing',
      ReturnUrl: 'true'
    };

    const body = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    console.log('[0xProcessing] Request body:', body);

    const response = await fetch(OXPROCESSING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    const data = await response.json();
    console.log('[0xProcessing] Response:', data);

    if (data.redirectUrl) {
      return res.status(200).json({
        ok: true,
        paymentUrl: data.redirectUrl,
        paymentId: data.id,
        billingId
      });
    } else {
      console.error('[0xProcessing] Error:', data);
      return res.status(400).json({
        error: 'Failed to create payment',
        details: data
      });
    }

  } catch (error) {
    console.error('[0xProcessing] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
