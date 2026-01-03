
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// All Lava transactions from LAVA.csv with GROSS amounts
// These are the CORRECT amounts matching Lava Dashboard

const rubCorrections = {
    49603778: 32108, 50320636: 16468, 120112474: 9108, 174518357: 9108,
    185730096: 16468, 187994772: 16468, 190202791: 690, 201611553: 16468,
    206356122: 16468, 211527994: 9108, 222190113: 9108, 231360807: 16468,
    261545403: 3680, 276936985: 12788, 288475216: 92, 288542643: 46,
    359743018: 16468, 372013387: 16468, 377248751: 16468, 406770438: 9108,
    412930477: 46, 418848368: 3680, 459426026: 9108, 573841500: 32108,
    630278741: 32108, 706111134: 16468, 827740833: 9108, 838608031: 16468,
    864285067: 3680, 883846421: 267, 909863881: 32108, 917749671: 3680,
    920327292: 3680, 930563420: 32108, 931481140: 32108, 956268196: 16468,
    962488132: 16468, 996889760: 16468, 1006383077: 9108, 1019439760: 16468,
    1146158836: 9108, 1162860517: 32108, 1201066631: 32108, 1278497432: 16468,
    1474148288: 16468, 1665615046: 32108, 1719345271: 3680, 1770157185: 16468,
    1855257621: 9108, 1946073683: 9108, 1958046041: 9108, 1977523059: 9108,
    6495411571: 3680, 7696545300: 3680, 5380032183: 16468, 7914081365: 9108,
    5366052419: 16468, 6957079292: 16468, 8382061595: 32108, 5282101184: 9108,
    5086317674: 9108, 5121238448: 9108
};

const usdCorrections = {
    149390130: 408, 324685662: 47, 407083305: 209,
    1613981360: 47, 1809448091: 116, 7597281872: 209
};

const eurCorrections = {
    315724350: 178, 1481948598: 98, 1864138920: 347,
    2144592855: 347, 7234268883: 178
};

export default async function handler(req, res) {
    if (req.query.secret !== 'fix_all_lava') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const allCorrections = [
        ...Object.entries(rubCorrections).map(([id, amt]) => ({ telegramId: parseInt(id), amount: amt, currency: 'RUB' })),
        ...Object.entries(usdCorrections).map(([id, amt]) => ({ telegramId: parseInt(id), amount: amt, currency: 'USD' })),
        ...Object.entries(eurCorrections).map(([id, amt]) => ({ telegramId: parseInt(id), amount: amt, currency: 'EUR' }))
    ];

    const results = { fixed: 0, skipped: 0, notFound: 0, added: 0, fixes: [] };

    for (const c of allCorrections) {
        // Find client
        const { data: client } = await supabase
            .from('premium_clients')
            .select('*')
            .eq('telegram_id', c.telegramId)
            .eq('source', 'lava.top')
            .single();

        if (!client) {
            // Insert new record
            const { error: insertErr } = await supabase
                .from('premium_clients')
                .insert({
                    telegram_id: c.telegramId,
                    source: 'lava.top',
                    currency: c.currency,
                    total_paid_usd: c.amount,
                    original_amount: c.amount,
                    plan: 'basic',
                    payments_count: 1,
                    started_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    last_payment_at: new Date().toISOString(),
                    last_payment_method: 'lava.top'
                });

            if (!insertErr) {
                results.added++;
                results.fixes.push({ id: c.telegramId, action: 'added', amount: c.amount, currency: c.currency });
            }
            continue;
        }

        // Update if different
        const current = client.total_paid_usd || 0;
        if (Math.abs(current - c.amount) > 1) {
            const { error: updErr } = await supabase
                .from('premium_clients')
                .update({
                    total_paid_usd: c.amount,
                    original_amount: c.amount
                })
                .eq('id', client.id);

            if (!updErr) {
                results.fixed++;
                results.fixes.push({ id: c.telegramId, old: current, new: c.amount, currency: c.currency });
            }
        } else {
            results.skipped++;
        }
    }

    // Calculate new totals
    const { data: newTotals } = await supabase
        .from('premium_clients')
        .select('currency, total_paid_usd')
        .eq('source', 'lava.top');

    const totals = { RUB: 0, USD: 0, EUR: 0 };
    for (const c of newTotals || []) {
        if (totals[c.currency] !== undefined) {
            totals[c.currency] += c.total_paid_usd || 0;
        }
    }

    return res.json({
        message: 'Fixed Lava amounts from CSV',
        results,
        newTotals: totals,
        expectedCsv: { RUB: 865113, USD: 1035, EUR: 1148 }
    });
}
