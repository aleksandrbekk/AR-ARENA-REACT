// Lava.top Invoice Creation для Premium AR Club
// Vercel Serverless Function
// 2025-12-22

const LAVA_API_KEY = process.env.LAVA_PREMIUM_API_KEY || 'ODRiBFn20abCU1iIaN6VrUGELo6bNDq8fPyYM1rj3Cep0AXhlzdQHt9uUmbFWSBr';
const LAVA_API_URL = 'https://gate.lava.top/api/v2/invoice';

// Premium AR Club Product/Offer ID
const PREMIUM_OFFER_ID = 'd6edc26e-00b2-4fe0-9b0b-45fd7548b037';

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
    const { telegramId, telegramUsername, tariffId } = req.body;

    console.log('[Premium Invoice] Request:', { telegramId, telegramUsername, tariffId });

    // Валидация - нужен telegram_id или username
    if (!telegramId && !telegramUsername) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['telegramId или telegramUsername']
      });
    }

    // Формируем clientUTM для передачи в webhook
    const clientUTM = telegramId
      ? `telegram_id=${telegramId}`
      : `telegram_username=${telegramUsername}`;

    // Email-заглушка (Lava требует email)
    const userIdentifier = telegramId || telegramUsername;
    const email = `${userIdentifier}@premium.ararena.pro`;

    console.log('[Premium Invoice] Creating invoice:', { email, clientUTM, offerId: PREMIUM_OFFER_ID });

    // Создание счёта через Lava.top API
    const response = await fetch(LAVA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': LAVA_API_KEY
      },
      body: JSON.stringify({
        email,
        offerId: PREMIUM_OFFER_ID,
        buyerLanguage: 'RU',
        clientUTM,
        successUrl: 'https://ararena.pro/payment-success'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Premium Invoice] Lava API error:', data);
      return res.status(response.status).json({
        error: 'Failed to create invoice',
        details: data
      });
    }

    console.log('[Premium Invoice] Invoice created:', {
      telegramId,
      contractId: data.contractId,
      paymentUrl: data.paymentUrl
    });

    // Возвращаем URL для оплаты
    return res.status(200).json({
      ok: true,
      paymentUrl: data.paymentUrl,
      contractId: data.contractId
    });

  } catch (error) {
    console.error('[Premium Invoice] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
