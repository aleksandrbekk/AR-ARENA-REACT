
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

    // Group by source
    const sources = {};
    clients.forEach(c => {
        const src = c.source || 'null';
        if (!sources[src]) {
            sources[src] = { count: 0, totalPaid: 0, originalSum: 0, currencies: {} };
        }
        sources[src].count++;
        sources[src].totalPaid += (c.total_paid_usd || 0);
        sources[src].originalSum += (c.original_amount || 0);

        const curr = c.currency || 'null';
        if (!sources[src].currencies[curr]) {
            sources[src].currencies[curr] = { count: 0, sum: 0 };
        }
        sources[src].currencies[curr].count++;
        sources[src].currencies[curr].sum += (c.total_paid_usd || 0);
    });

    return res.json({
        sources,
        totalClients: clients.length
    });
}
