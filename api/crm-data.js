// API для загрузки CRM-данных с service_role ключом (обходит RLS)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_IDS = [190202791, 144828618, 288542643, 288475216];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fetchAllRows(tableName, selectQuery, orderBy = 'created_at', ascending = false) {
  let allData = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select(selectQuery)
      .order(orderBy, { ascending, nullsFirst: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }
  return allData;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Id, X-Admin-Password');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Auth check
  const authTelegramId = req.headers['x-telegram-id'];
  const authPassword = req.headers['x-admin-password'];
  let isAuthorized = false;

  if (authTelegramId && ADMIN_IDS.includes(Number(authTelegramId))) {
    isAuthorized = true;
  }
  if (!isAuthorized && authPassword && authPassword === ADMIN_PASSWORD) {
    isAuthorized = true;
  }
  if (!isAuthorized) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  try {
    const [usersData, premiumData, botUsersData, paymentData] = await Promise.all([
      fetchAllRows('users', 'id, telegram_id, username, first_name, last_name, avatar_url, created_at'),
      fetchAllRows('premium_clients', '*', 'last_payment_at', false),
      fetchAllRows('bot_users', '*'),
      fetchAllRows('payment_history', '*', 'created_at', false).catch(() => [])
    ]);

    return res.status(200).json({
      success: true,
      users: usersData || [],
      premiumClients: premiumData || [],
      botUsers: botUsersData || [],
      paymentHistory: paymentData || []
    });
  } catch (error) {
    console.error('CRM data load error:', error);
    return res.status(500).json({ error: 'Failed to load CRM data', message: error.message });
  }
}
