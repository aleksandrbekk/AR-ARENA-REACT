
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // Check ENV
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return res.json({ error: 'Missing SERVICE_ROLE_KEY' });
    }

    const { data: clients, error } = await supabase
        .from('premium_clients')
        .select('*');

    if (error) return res.json({ error });

    const rubClients = clients.filter(c => c.currency === 'RUB' || c.source === 'lava' || c.source === 'lava_rub');

    const count = rubClients.length;
    const sumTotal = rubClients.reduce((acc, c) => acc + (c.total_paid_usd || 0), 0);
    const sumOriginal = rubClients.reduce((acc, c) => acc + (c.original_amount || 0), 0);

    // Sample 5
    const sample = rubClients.slice(0, 5).map(c => ({
        id: c.telegram_id,
        total: c.total_paid_usd,
        original: c.original_amount,
        currency: c.currency
    }));

    return res.json({
        count,
        sumTotal,
        sumOriginal,
        sample
    });
}
