
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    const { data: clients, error } = await supabase
        .from('premium_clients')
        .select('*')
        .or('source.eq.lava,source.eq.lava_rub,source.eq.lava_usd,source.eq.lava_eur');

    if (error) return res.json({ error });

    // Group by currency
    const stats = {
        RUB: { count: 0, totalPaid: 0, originalSum: 0, clients: [] },
        USD: { count: 0, totalPaid: 0, originalSum: 0, clients: [] },
        EUR: { count: 0, totalPaid: 0, originalSum: 0, clients: [] },
        OTHER: { count: 0, totalPaid: 0, originalSum: 0, clients: [] }
    };

    clients.forEach(c => {
        const curr = c.currency || 'OTHER';
        const bucket = stats[curr] || stats.OTHER;

        bucket.count++;
        bucket.totalPaid += (c.total_paid_usd || 0);
        bucket.originalSum += (c.original_amount || 0);

        // Collect samples for inspection
        if (bucket.clients.length < 3) {
            bucket.clients.push({
                id: c.telegram_id,
                total: c.total_paid_usd,
                original: c.original_amount,
                payments: c.payments_count,
                source: c.source
            });
        }
    });

    // Expected Lava amounts (from screenshot)
    const lava = {
        RUB: 902101.40,
        USD: 1035.20,
        EUR: 1147.61
    };

    // Calculate differences
    const diff = {
        RUB: {
            ourTotal: stats.RUB.totalPaid,
            lava: lava.RUB,
            diff: stats.RUB.totalPaid - lava.RUB,
            pct: ((stats.RUB.totalPaid - lava.RUB) / lava.RUB * 100).toFixed(1) + '%'
        },
        USD: {
            ourTotal: stats.USD.totalPaid,
            lava: lava.USD,
            diff: stats.USD.totalPaid - lava.USD,
            pct: ((stats.USD.totalPaid - lava.USD) / lava.USD * 100).toFixed(1) + '%'
        },
        EUR: {
            ourTotal: stats.EUR.totalPaid,
            lava: lava.EUR,
            diff: stats.EUR.totalPaid - lava.EUR,
            pct: ((stats.EUR.totalPaid - lava.EUR) / lava.EUR * 100).toFixed(1) + '%'
        }
    };

    return res.json({
        stats,
        lava,
        diff,
        totalClients: clients.length
    });
}
