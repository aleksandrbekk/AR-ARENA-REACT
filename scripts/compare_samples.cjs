// Compare specific transactions
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'LAVA.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(l => l.trim());
const dataLines = lines.slice(4);

// Parse first 10 transactions with telegram_id
const samples = [];
for (const line of dataLines) {
    if (samples.length >= 10) break;

    const cols = line.split(';');
    if (cols.length < 7) continue;

    const amountStr = cols[4]?.replace(/\s/g, '').replace(',', '.');
    const feeStr = cols[5]?.replace(/\s/g, '').replace(',', '.');
    const currency = cols[6]?.trim();
    const email = cols[7]?.trim();

    const amount = parseFloat(amountStr) || 0;
    const fee = parseFloat(feeStr) || 0;
    const net = amount - fee;

    const match = email?.match(/^(\d+)@/);
    if (match) {
        samples.push({
            telegramId: match[1],
            gross: amount,
            fee: fee,
            net: net,
            currency: currency
        });
    }
}

console.log('=== Sample transactions from CSV ===');
console.log('| Telegram ID | GROSS | Fee | NET | Currency |');
console.log('|-------------|-------|-----|-----|----------|');
samples.forEach(s => {
    console.log(`| ${s.telegramId} | ${s.gross} | ${s.fee} | ${s.net} | ${s.currency} |`);
});

console.log('\n=== Compare with DB ===');
console.log('Check these telegram_ids in premium_clients:');
console.log('SELECT telegram_id, total_paid_usd, original_amount, currency FROM premium_clients');
console.log('WHERE telegram_id IN (' + samples.map(s => s.telegramId).join(', ') + ');');
