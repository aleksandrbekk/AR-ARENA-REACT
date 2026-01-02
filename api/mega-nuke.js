
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    const { secret } = req.query;
    if (secret !== 'ghostbusters_v2') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const GHOST_ID = 5533465717;

    // 1. Delete
    const { data, error } = await supabase
        .from('premium_clients')
        .delete()
        .eq('telegram_id', GHOST_ID)
        .select();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
        success: true,
        deleted: data
    });
}
