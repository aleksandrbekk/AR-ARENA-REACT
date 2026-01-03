
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    const telegramId = req.query.id || 119535544;

    const { data, error } = await supabase
        .from('premium_clients')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

    if (error) return res.json({ error });

    return res.json(data);
}
