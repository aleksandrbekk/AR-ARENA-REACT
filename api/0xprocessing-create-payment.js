// 0xProcessing Payment Creation для Premium AR Club (крипто-оплата)
// Vercel Serverless Function
// 2025-12-23

const OXPROCESSING_URL = 'https://app.0xprocessing.com/Payment';
const MERCHANT_ID = process.env.OXPROCESSING_MERCHANT_ID;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
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
      currency = 'USDT',
      tariff,
      periodicity
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
    const billingId = `premium_${tariff}_${clientId}_${Date.now()}`;

    console.log('[0xProcessing] Creating payment:', {
      clientId,
      amountUSD,
      currency,
      tariff,
      billingId
    });

    // Создаём платёж через 0xProcessing
    const formData = new URLSearchParams();
    formData.append('AmountUSD', amountUSD.toString());
    formData.append('Currency', currency);
    formData.append('Email', finalEmail);
    formData.append('ClientId', clientId);
    formData.append('MerchantId', MERCHANT_ID);
    formData.append('BillingId', billingId);
    formData.append('SuccessUrl', 'https://ararena.pro/payment-success');
    formData.append('CancelUrl', 'https://ararena.pro/pricing');
    formData.append('ReturnUrl', 'true'); // Вернуть URL вместо редиректа

    const response = await fetch(OXPROCESSING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
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
