// Lava.top Webhook Handler для зачисления AR после оплаты
// Native fetch (Node.js 18+, Vercel runtime supports it)

const WEBHOOK_SECRET = 'ararena-webhook-secret-2024';
const SUPABASE_URL = 'https://syxjkircmiwpnpagznay.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MjExMjgsImV4cCI6MjA0ODk5NzEyOH0.r4bFGLJNmrANgRl9uQx7lQYfbKrYZ7sVlN0nKH8uPAQ';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Проверка API ключа
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== WEBHOOK_SECRET) {
    console.log('Unauthorized webhook attempt:', apiKey);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { type, payload } = req.body;

    console.log('Webhook received:', { type, payload });

    // Обрабатываем только успешные платежи
    if (type === 'payment.success') {
      const { email, contractId, amount, currency, clientUTM } = payload;

      // Попытка извлечь telegram_id из clientUTM
      // Формат: telegram_id=123456789 или другой
      let telegramId = null;
      if (clientUTM) {
        const match = clientUTM.match(/telegram_id=(\d+)/);
        if (match) {
          telegramId = match[1];
        }
      }

      // Если telegram_id не найден, ищем по email
      let userId = null;
      if (telegramId) {
        // Поиск пользователя по telegram_id
        const userResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/users?telegram_id=eq.${telegramId}&select=id,ar_balance`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
          }
        );
        const users = await userResponse.json();
        if (users && users.length > 0) {
          userId = users[0].id;
        }
      }

      if (!userId && email) {
        // Поиск по email (если он есть в таблице users)
        const userResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/users?email=eq.${email}&select=id,ar_balance`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
          }
        );
        const users = await userResponse.json();
        if (users && users.length > 0) {
          userId = users[0].id;
        }
      }

      if (!userId) {
        console.error('User not found:', { email, telegramId });
        return res.status(404).json({ error: 'User not found' });
      }

      // Расчёт AR (1 RUB = 1 AR, можно изменить формулу)
      const arAmount = Math.floor(amount);

      // Зачисление AR через RPC функцию
      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/add_ar_balance`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            p_user_id: userId,
            p_amount: arAmount
          })
        }
      );

      if (!updateResponse.ok) {
        console.error('Failed to update balance:', await updateResponse.text());
        return res.status(500).json({ error: 'Failed to update balance' });
      }

      const newBalance = await updateResponse.json();

      // Запись транзакции
      const transactionResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/transactions`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            user_id: userId,
            type: 'purchase_ar',
            amount: arAmount,
            currency: currency || 'RUB',
            lava_contract_id: contractId,
            status: 'completed',
            created_at: new Date().toISOString()
          })
        }
      );

      if (!transactionResponse.ok) {
        console.error('Failed to create transaction:', await transactionResponse.text());
      }

      console.log('Payment processed successfully:', {
        userId,
        arAmount,
        contractId
      });

      return res.status(200).json({
        ok: true,
        userId,
        arAmount,
        message: 'AR credited successfully'
      });
    }

    // Другие типы событий игнорируем
    return res.status(200).json({ ok: true, message: 'Event ignored' });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
