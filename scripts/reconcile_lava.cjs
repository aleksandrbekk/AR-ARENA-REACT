// Local reconciliation script - run with: node scripts/reconcile_lava.cjs
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

// Parse LAVA.csv
const csvPath = path.join(__dirname, '..', 'LAVA.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(l => l.trim());

// Skip header rows (first 4 lines)
const dataLines = lines.slice(4);

const lavaSums = { RUB: 0, USD: 0, EUR: 0 };
const lavaNetSums = { RUB: 0, USD: 0, EUR: 0 };
const transactions = [];

for (const line of dataLines) {
    const cols = line.split(';');
    if (cols.length < 7) continue;

    const amountStr = cols[4]?.replace(/\s/g, '').replace(',', '.');
    const feeStr = cols[5]?.replace(/\s/g, '').replace(',', '.');
    const currency = cols[6]?.trim();
    const email = cols[7]?.trim();

    const amount = parseFloat(amountStr) || 0;
    const fee = parseFloat(feeStr) || 0;
    const net = amount - fee;

    // Extract telegram_id
    let telegramId = null;
    const match = email?.match(/^(\d+)@/);
    if (match) {
        telegramId = match[1];
    }

    if (currency && lavaSums[currency] !== undefined) {
        lavaSums[currency] += amount;
        lavaNetSums[currency] += net;
    }

    transactions.push({ telegramId, email, amount, fee, net, currency });
}

console.log('=== LAVA CSV Analysis ===');
console.log('Total transactions:', transactions.length);
console.log('');
console.log('GROSS sums (before fee):');
console.log('  RUB:', lavaSums.RUB.toFixed(2));
console.log('  USD:', lavaSums.USD.toFixed(2));
console.log('  EUR:', lavaSums.EUR.toFixed(2));
console.log('');
console.log('NET sums (after 8% fee):');
console.log('  RUB:', lavaNetSums.RUB.toFixed(2), '(expected in Lava balance)');
console.log('  USD:', lavaNetSums.USD.toFixed(2));
console.log('  EUR:', lavaNetSums.EUR.toFixed(2));
console.log('');
console.log('Our CRM shows:');
console.log('  RUB: 841,320 (from reconcile API)');
console.log('  USD: 1,125');
console.log('  EUR: 1,317');
console.log('');
console.log('Lava Dashboard shows:');
console.log('  RUB: 902,101.40');
console.log('  USD: 1,035.20');
console.log('  EUR: 1,147.61');
console.log('');

// Calculate what Lava should show
const expectedLava = {
    RUB: lavaNetSums.RUB,
    USD: lavaNetSums.USD,
    EUR: lavaNetSums.EUR
};

console.log('CSV NET vs Lava Dashboard:');
console.log('  RUB: CSV=' + expectedLava.RUB.toFixed(2) + ' vs Lava=902,101.40 → diff=' + (902101.40 - expectedLava.RUB).toFixed(2));
console.log('  USD: CSV=' + expectedLava.USD.toFixed(2) + ' vs Lava=1,035.20 → diff=' + (1035.20 - expectedLava.USD).toFixed(2));
console.log('  EUR: CSV=' + expectedLava.EUR.toFixed(2) + ' vs Lava=1,147.61 → diff=' + (1147.61 - expectedLava.EUR).toFixed(2));
