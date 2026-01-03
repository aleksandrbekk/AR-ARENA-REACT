// Find missing Lava transactions
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'LAVA.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(l => l.trim());
const dataLines = lines.slice(4);

// Parse all RUB transactions from CSV
const csvTransactions = {};
for (const line of dataLines) {
    const cols = line.split(';');
    if (cols.length < 7) continue;

    const amountStr = cols[4]?.replace(/\s/g, '').replace(',', '.');
    const currency = cols[6]?.trim();
    const email = cols[7]?.trim();

    if (currency !== 'RUB') continue;

    const amount = parseFloat(amountStr) || 0;
    const match = email?.match(/^(\d+)@/);

    if (match) {
        const telegramId = match[1];
        if (!csvTransactions[telegramId]) {
            csvTransactions[telegramId] = { telegramId, totalAmount: 0, count: 0 };
        }
        csvTransactions[telegramId].totalAmount += amount;
        csvTransactions[telegramId].count++;
    }
}

console.log('=== RUB transactions from CSV ===');
console.log('Unique users with telegram_id:', Object.keys(csvTransactions).length);
console.log('Total GROSS amount:', Object.values(csvTransactions).reduce((sum, t) => sum + t.totalAmount, 0).toFixed(2));
console.log('');

// Output telegram_ids for DB check
console.log('Telegram IDs to check in DB:');
console.log(Object.keys(csvTransactions).join(','));
console.log('');

// Show top 10 by amount
const sorted = Object.values(csvTransactions).sort((a, b) => b.totalAmount - a.totalAmount);
console.log('Top 10 by amount:');
sorted.slice(0, 10).forEach(t => {
    console.log(`  ${t.telegramId}: ${t.totalAmount} RUB (${t.count} payments)`);
});
