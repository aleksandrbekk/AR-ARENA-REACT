
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    const { data, error } = await supabase
        .from('premium_clients')
        .select('*')
        .eq('source', 'manual');

    if (error) return res.json({ error });

    return res.json({
        count: data.length,
        clients: data.map(c => ({
            telegram_id: c.telegram_id,
            username: c.username,
            currency: c.currency,
            total_paid: c.total_paid_usd,
            created: c.created_at
        }))
    });
}
