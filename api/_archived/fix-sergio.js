
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.query.secret !== 'fix_sergio') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { data, error } = await supabase
        .from('premium_clients')
        .update({ source: 'lava.top', currency: 'RUB' })
        .eq('telegram_id', 655208634)
        .select();

    if (error) return res.json({ error });

    return res.json({
        fixed: true,
        client: data[0]
    });
}
