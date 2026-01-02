
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        const { data: clients, error } = await supabase
            .from('premium_clients')
            .select('telegram_id, total_paid_usd, original_amount, currency, source');

        if (error) throw error;

        // Group by source and currency
        const breakdown = {};

        clients.forEach(c => {
            const source = c.source || 'unknown';
            const currency = (c.currency || 'RUB').toUpperCase();
            const key = `${source}__${currency}`;

            if (!breakdown[key]) {
                breakdown[key] = { source, currency, count: 0, original_sum: 0, usd_sum: 0 };
            }
            breakdown[key].count++;
            breakdown[key].original_sum += c.original_amount || 0;
            breakdown[key].usd_sum += c.total_paid_usd || 0;
        });

        // Convert to array and sort
        const result = Object.values(breakdown).sort((a, b) => b.original_sum - a.original_sum);

        // Calculate what Lava RUB should be after 8%
        const lavaRub = result.find(r => r.source === 'lava.top' && r.currency === 'RUB');
        const expectedNet = lavaRub ? lavaRub.original_sum * 0.92 : 0;

        res.status(200).json({
            breakdown: result,
            total_clients: clients.length,
            lava_rub_analysis: lavaRub ? {
                gross: lavaRub.original_sum,
                expected_net_at_8pct: expectedNet,
                note: "If Lava shows more than expected_net, some payments had lower commission"
            } : null
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
