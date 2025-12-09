// Lava.top Invoice Creation для покупки AR
// Native fetch (Node.js 18+, Vercel runtime supports it)

const LAVA_API_KEY = 'OZiQUDFJAz5eunrbUrUjA2ToAYjCgXWqaxzK7ibQA23uk3VoR6ijcGEO9Y9lfPjM';
const LAVA_OFFER_ID = '836adba6-5365-40f6-a646-aef9621f3af4';
const LAVA_API_URL = 'https://gate.lava.top/api/v2/invoice';

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
    const { email, telegramId, amount, currency = 'RUB' } = req.body;

    // Валидация
    if (!email || !amount) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'amount']
      });
    }

    if (amount < 1) {
      return res.status(400).json({ error: 'Amount must be at least 1' });
    }

    // Формируем clientUTM с telegram_id для webhook
    const clientUTM = telegramId ? `telegram_id=${telegramId}` : undefined;

    // Создание счёта через Lava.top API
    const response = await fetch(LAVA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': LAVA_API_KEY
      },
      body: JSON.stringify({
        email,
        offerId: LAVA_OFFER_ID,
        currency,
        buyerLanguage: 'RU',
        amount: parseFloat(amount),
        clientUTM
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Lava API error:', data);
      return res.status(response.status).json({
        error: 'Failed to create invoice',
        details: data
      });
    }

    console.log('Invoice created:', {
      email,
      telegramId,
      amount,
      contractId: data.contractId,
      paymentUrl: data.paymentUrl
    });

    // Возвращаем URL для оплаты
    return res.status(200).json({
      ok: true,
      paymentUrl: data.paymentUrl,
      contractId: data.contractId,
      amount: data.amount,
      currency: data.currency
    });

  } catch (error) {
    console.error('Invoice creation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
