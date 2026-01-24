/**
 * Скрипт для проверки платежей пользователя
 * Использование: node scripts/check-user-payments.js <telegram_id>
 *
 * Требуется: SUPABASE_URL и SUPABASE_SERVICE_KEY в переменных окружения
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Нужны переменные окружения SUPABASE_URL и SUPABASE_SERVICE_KEY');
  console.log('Пример: SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=xxx node scripts/check-user-payments.js 1030058890');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const telegramId = process.argv[2];
if (!telegramId) {
  console.error('❌ Укажите telegram_id');
  console.log('Пример: node scripts/check-user-payments.js 1030058890');
  process.exit(1);
}

async function checkUser(tgId) {
  console.log(`\n🔍 Проверяю пользователя ${tgId}...\n`);

  // 1. Проверяем premium_clients
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 PREMIUM_CLIENTS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const { data: client, error: clientError } = await supabase
    .from('premium_clients')
    .select('*')
    .eq('telegram_id', parseInt(tgId))
    .single();

  if (clientError) {
    console.log('❌ Не найден в premium_clients');
  } else {
    console.log(`✅ Найден!`);
    console.log(`   Username: @${client.username || 'N/A'}`);
    console.log(`   План: ${client.plan}`);
    console.log(`   Истекает: ${client.expires_at}`);
    console.log(`   Осталось дней: ${Math.ceil((new Date(client.expires_at) - new Date()) / (1000*60*60*24))}`);
    console.log(`   Всего оплачено: $${client.total_paid_usd}`);
    console.log(`   Кол-во платежей: ${client.payments_count}`);
    console.log(`   Последний платёж: ${client.last_payment_at}`);
    console.log(`   Источник: ${client.source}`);
    console.log(`   В канале: ${client.in_channel ? 'Да' : 'Нет'}`);
    console.log(`   В чате: ${client.in_chat ? 'Да' : 'Нет'}`);
  }

  // 2. Проверяем payment_history
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💳 PAYMENT_HISTORY (последние 10):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const { data: payments, error: paymentsError } = await supabase
    .from('payment_history')
    .select('*')
    .eq('telegram_id', tgId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (paymentsError || !payments?.length) {
    console.log('❌ Нет записей в payment_history');
  } else {
    console.log(`✅ Найдено ${payments.length} записей:\n`);
    payments.forEach((p, i) => {
      console.log(`   ${i+1}. ${p.created_at}`);
      console.log(`      Сумма: ${p.amount} ${p.currency}`);
      console.log(`      Источник: ${p.source}`);
      console.log(`      План: ${p.plan || 'N/A'}`);
      console.log(`      Contract ID: ${p.contract_id || 'N/A'}`);
      console.log(`      TX Hash: ${p.tx_hash || 'N/A'}`);
      console.log('');
    });
  }

  // 3. Проверяем users
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 USERS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', parseInt(tgId))
    .single();

  if (userError) {
    console.log('❌ Не найден в users');
  } else {
    console.log(`✅ Найден!`);
    console.log(`   Username: @${user.username || 'N/A'}`);
    console.log(`   Статус: ${user.status}`);
    console.log(`   Premium до: ${user.premium_expires || 'N/A'}`);
    console.log(`   Создан: ${user.created_at}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔎 АНАЛИЗ:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!payments?.length && client) {
    console.log('⚠️  Клиент есть, но нет записей в payment_history');
    console.log('   → Возможно webhook не записал платёж');
  }

  if (payments?.length && client) {
    const lastPayment = new Date(payments[0].created_at);
    const lastClientPayment = client.last_payment_at ? new Date(client.last_payment_at) : null;

    if (lastClientPayment && lastPayment > lastClientPayment) {
      console.log('⚠️  Последний платёж в payment_history НОВЕЕ чем last_payment_at в premium_clients!');
      console.log(`   payment_history: ${payments[0].created_at}`);
      console.log(`   premium_clients: ${client.last_payment_at}`);
      console.log('   → Webhook записал платёж, но НЕ обновил подписку!');
    } else {
      console.log('✅ Данные согласованы');
    }
  }
}

checkUser(telegramId).catch(console.error);
