#!/usr/bin/env node
/**
 * Подсчёт платежей во всех таблицах Supabase
 * Запуск: node scripts/count-payments.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Try multiple env files
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Нужны SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function countPayments() {
  console.log('=== 💰 СТАТИСТИКА ПЛАТЕЖЕЙ ===\n');

  // 1. payment_history (основная таблица)
  const { count: paymentHistoryCount, error: err1 } = await supabase
    .from('payment_history')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 payment_history: ${err1 ? 'ОШИБКА: ' + err1.message : paymentHistoryCount + ' записей'}`);

  // 2. payments (старая таблица)
  const { count: paymentsCount, error: err2 } = await supabase
    .from('payments')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 payments: ${err2 ? 'ОШИБКА: ' + err2.message : paymentsCount + ' записей'}`);

  // 3. premium_clients (подписчики)
  const { count: premiumCount, error: err3 } = await supabase
    .from('premium_clients')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 premium_clients: ${err3 ? 'ОШИБКА: ' + err3.message : premiumCount + ' записей'}`);

  // 4. Активные подписчики
  const { count: activeCount, error: err4 } = await supabase
    .from('premium_clients')
    .select('*', { count: 'exact', head: true })
    .gt('expires_at', new Date().toISOString());

  console.log(`📊 premium_clients (активные): ${err4 ? 'ОШИБКА: ' + err4.message : activeCount + ' записей'}`);

  // 5. Общая сумма платежей
  const { data: sumData, error: err5 } = await supabase
    .from('payment_history')
    .select('amount, currency');

  if (!err5 && sumData) {
    const totalUSD = sumData.filter(p => p.currency === 'USD').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalRUB = sumData.filter(p => p.currency === 'RUB').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalOther = sumData.filter(p => !['USD', 'RUB'].includes(p.currency)).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    console.log(`\n💵 Сумма (payment_history):`);
    console.log(`   USD: $${totalUSD.toFixed(2)}`);
    console.log(`   RUB: ₽${totalRUB.toFixed(2)}`);
    if (totalOther > 0) console.log(`   Другое: ${totalOther.toFixed(2)}`);
  }

  // 6. Сумма из premium_clients
  const { data: premiumData, error: err6 } = await supabase
    .from('premium_clients')
    .select('total_paid_usd, payments_count');

  if (!err6 && premiumData) {
    const totalPaidUSD = premiumData.reduce((sum, p) => sum + parseFloat(p.total_paid_usd || 0), 0);
    const totalPaymentsCount = premiumData.reduce((sum, p) => sum + parseInt(p.payments_count || 0), 0);

    console.log(`\n💵 Сумма (premium_clients.total_paid_usd): $${totalPaidUSD.toFixed(2)}`);
    console.log(`   Всего платежей (payments_count): ${totalPaymentsCount}`);
  }

  // 7. Источники платежей
  const { data: sourceData, error: err7 } = await supabase
    .from('payment_history')
    .select('source');

  if (!err7 && sourceData) {
    const sources = {};
    sourceData.forEach(p => {
      const src = p.source || 'unknown';
      sources[src] = (sources[src] || 0) + 1;
    });

    console.log(`\n📈 Источники платежей:`);
    Object.entries(sources)
      .sort((a, b) => b[1] - a[1])
      .forEach(([src, cnt]) => {
        console.log(`   ${src}: ${cnt}`);
      });
  }

  console.log('\n=== ГОТОВО ===');
}

countPayments().catch(console.error);
