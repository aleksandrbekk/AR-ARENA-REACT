// Parse LAVA.csv and create corrections for Supabase
const fs = require('fs');

const csv = fs.readFileSync('LAVA.csv', 'utf8');
const lines = csv.split('\n').slice(4); // Skip header rows

const transactions = {};

for (const line of lines) {
    if (!line.trim()) continue;

    const parts = line.split(';');
    if (parts.length < 8) continue;

    const email = parts[7] || '';
    const amountStr = parts[4] || '';
    const currency = parts[6] || '';

    // Extract telegram_id from email like "123456@premium.ararena.pro"
    const match = email.match(/^(\d+)@/);
    if (!match) continue; // Skip email-based (no telegram_id)

    const telegramId = parseInt(match[1]);

    // Parse amount (format: "3 680,0000" -> 3680)
    const amount = parseFloat(amountStr.replace(/\s/g, '').replace(',', '.'));

    if (!transactions[telegramId]) {
        transactions[telegramId] = { currency: currency.trim(), total: 0, count: 0 };
    }
    transactions[telegramId].total += amount;
    transactions[telegramId].count++;
}

// Output grouped by currency
const byCurrency = { RUB: {}, USD: {}, EUR: {} };
let totals = { RUB: 0, USD: 0, EUR: 0 };

for (const [id, data] of Object.entries(transactions)) {
    const curr = data.currency;
    if (byCurrency[curr]) {
        byCurrency[curr][id] = Math.round(data.total);
        totals[curr] += data.total;
    }
}

console.log('=== CSV TOTALS (GROSS - what Lava Dashboard shows) ===');
console.log('RUB:', Math.round(totals.RUB).toLocaleString());
console.log('USD:', Math.round(totals.USD).toLocaleString());
console.log('EUR:', Math.round(totals.EUR).toLocaleString());

console.log('\n=== Transactions by currency ===');
console.log('RUB users:', Object.keys(byCurrency.RUB).length);
console.log('USD users:', Object.keys(byCurrency.USD).length);
console.log('EUR users:', Object.keys(byCurrency.EUR).length);

// Output for fixing script
console.log('\n=== RUB corrections (telegram_id: gross_amount) ===');
const rubJson = JSON.stringify(byCurrency.RUB, null, 2);
console.log(rubJson);

console.log('\n=== USD corrections ===');
console.log(JSON.stringify(byCurrency.USD, null, 2));

console.log('\n=== EUR corrections ===');
console.log(JSON.stringify(byCurrency.EUR, null, 2));
