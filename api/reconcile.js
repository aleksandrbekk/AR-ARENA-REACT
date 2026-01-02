// Lava CSV Reconciliation Script
// Parses LAVA.csv and compares with premium_clients

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    try {
        // 1. Read and parse CSV
        const csvPath = path.join(process.cwd(), 'LAVA.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.split('\n').filter(l => l.trim());

        // Skip header rows (first 4 lines)
        const dataLines = lines.slice(4);

        const lavaTransactions = [];
        const lavaSums = { RUB: 0, USD: 0, EUR: 0 };
        const lavaNetSums = { RUB: 0, USD: 0, EUR: 0 };

        for (const line of dataLines) {
            const cols = line.split(';');
            if (cols.length < 7) continue;

            const txId = cols[0];
            const amountStr = cols[4]?.replace(/\s/g, '').replace(',', '.');
            const feeStr = cols[5]?.replace(/\s/g, '').replace(',', '.');
            const currency = cols[6]?.trim();
            const email = cols[7]?.trim();

            const amount = parseFloat(amountStr) || 0;
            const fee = parseFloat(feeStr) || 0;
            const net = amount - fee;

            // Extract telegram_id from email like "123456@premium.ararena.pro"
            let telegramId = null;
            const match = email?.match(/^(\d+)@/);
            if (match) {
                telegramId = parseInt(match[1]);
            }

            if (currency && lavaSums[currency] !== undefined) {
                lavaSums[currency] += amount;
                lavaNetSums[currency] += net;
            }

            lavaTransactions.push({
                txId,
                telegramId,
                email,
                amount,
                fee,
                net,
                currency
            });
        }

        // 2. Get our DB data
        const { data: clients, error } = await supabase
            .from('premium_clients')
            .select('*')
            .eq('source', 'lava.top');

        if (error) return res.json({ error });

        const dbSums = { RUB: 0, USD: 0, EUR: 0 };
        const dbByTelegramId = {};

        clients.forEach(c => {
            const curr = c.currency || 'RUB';
            if (dbSums[curr] !== undefined) {
                dbSums[curr] += (c.total_paid_usd || 0);
            }
            if (c.telegram_id) {
                dbByTelegramId[c.telegram_id] = c;
            }
        });

        // 3. Find missing transactions
        const missing = [];
        const found = [];

        for (const tx of lavaTransactions) {
            if (tx.telegramId && dbByTelegramId[tx.telegramId]) {
                found.push({
                    telegramId: tx.telegramId,
                    lavaNet: tx.net,
                    dbTotal: dbByTelegramId[tx.telegramId].total_paid_usd,
                    currency: tx.currency
                });
            } else if (tx.telegramId) {
                missing.push({
                    telegramId: tx.telegramId,
                    email: tx.email,
                    net: tx.net,
                    currency: tx.currency
                });
            }
        }

        // 4. Calculate differences
        const diff = {
            RUB: { lavaGross: lavaSums.RUB, lavaNet: lavaNetSums.RUB, db: dbSums.RUB, diff: dbSums.RUB - lavaNetSums.RUB },
            USD: { lavaGross: lavaSums.USD, lavaNet: lavaNetSums.USD, db: dbSums.USD, diff: dbSums.USD - lavaNetSums.USD },
            EUR: { lavaGross: lavaSums.EUR, lavaNet: lavaNetSums.EUR, db: dbSums.EUR, diff: dbSums.EUR - lavaNetSums.EUR }
        };

        return res.json({
            lavaTransactionCount: lavaTransactions.length,
            dbClientCount: clients.length,
            sums: diff,
            missingCount: missing.length,
            missing: missing.slice(0, 10), // First 10
            foundCount: found.length
        });

    } catch (e) {
        return res.status(500).json({ error: e.message, stack: e.stack });
    }
}
