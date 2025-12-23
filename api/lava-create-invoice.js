// Lava.top Invoice Creation для покупки AR
// FRESH VERSION 2025-12-09 - uses offerId from request

const LAVA_API_KEY = '2q3qBOCGh0nOt1w4rvn8rzH0XwkvTr93rEfiY78h2MaRM8Vmd6jimSeECprrsnTF';
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
    const { email, telegramId, telegramUsername, amount, currency = 'RUB', offerId, periodicity, streamUtmSource } = req.body;

    // Валидация
    if (!offerId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['offerId']
      });
    }

    // Определяем идентификатор пользователя
    const userIdentifier = telegramId || telegramUsername || 'anonymous';

    // Если email не передан, генерируем заглушку
    const finalEmail = email || `${userIdentifier}@ararena.pro`;

    // Формируем clientUTM для webhook
    let clientUTM;
    if (telegramId) {
      clientUTM = `telegram_id=${telegramId}`;
    } else if (telegramUsername) {
      clientUTM = `username=${telegramUsername}`;
    }
    // Добавляем stream_utm если есть
    if (streamUtmSource) {
      clientUTM = clientUTM ? `${clientUTM}&stream_utm=${streamUtmSource}` : `stream_utm=${streamUtmSource}`;
    }

    console.log('Creating invoice:', { email, telegramId, amount, offerId, periodicity });

    // Создание счёта через Lava.top API
    // Если amount передан - используем его, иначе Lava возьмёт цену из продукта
    const invoiceBody = {
      email: finalEmail,
      offerId,
      currency,
      buyerLanguage: 'RU',
      clientUTM,
      successUrl: 'https://ararena.pro/payment-success'
    };

    // Добавляем amount только если передан (для AR покупок)
    if (amount && amount > 0) {
      invoiceBody.amount = parseFloat(amount);
    }

    // Добавляем periodicity для подписок (MONTHLY, QUARTERLY, HALF_YEARLY, YEARLY)
    if (periodicity) {
      invoiceBody.periodicity = periodicity;
    }

    console.log('Invoice request body:', invoiceBody);

    const response = await fetch(LAVA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': LAVA_API_KEY
      },
      body: JSON.stringify(invoiceBody)
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
      offerId,
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
