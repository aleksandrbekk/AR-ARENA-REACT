
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    const { data: clients, error } = await supabase
        .from('premium_clients')
        .select('source, currency, total_paid_usd, original_amount');

    if (error) return res.json({ error });

    // Group by source and currency
    const stats = {};

    clients.forEach(c => {
        const src = c.source || 'null';
        const curr = c.currency || 'null';
        const key = `${src}|${curr}`;

        if (!stats[key]) {
            stats[key] = { source: src, currency: curr, count: 0, totalPaid: 0, originalSum: 0 };
        }
        stats[key].count++;
        stats[key].totalPaid += (c.total_paid_usd || 0);
        stats[key].originalSum += (c.original_amount || 0);
    });

    // Lava expected (GROSS from dashboard)
    const lavaExpected = {
        RUB: 902101.40,
        USD: 1035.20,
        EUR: 1147.61
    };

    // Get lava.top sums
    const lavaCRM = { RUB: 0, USD: 0, EUR: 0 };
    Object.values(stats).forEach(s => {
        if (s.source === 'lava.top' && lavaCRM[s.currency] !== undefined) {
            lavaCRM[s.currency] += s.totalPaid;
        }
    });

    const diff = {
        RUB: { crm: lavaCRM.RUB.toFixed(2), lava: lavaExpected.RUB, diff: (lavaCRM.RUB - lavaExpected.RUB).toFixed(2) },
        USD: { crm: lavaCRM.USD.toFixed(2), lava: lavaExpected.USD, diff: (lavaCRM.USD - lavaExpected.USD).toFixed(2) },
        EUR: { crm: lavaCRM.EUR.toFixed(2), lava: lavaExpected.EUR, diff: (lavaCRM.EUR - lavaExpected.EUR).toFixed(2) }
    };

    return res.json({
        bySourceCurrency: Object.values(stats),
        lavaCRM,
        lavaExpected,
        diff,
        totalClients: clients.length
    });
}
