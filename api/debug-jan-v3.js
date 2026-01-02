
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // Check ENV vars presence
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return res.json({ error: 'Missing SERVICE_ROLE_KEY' });
    }

    // 1. Get raw list
    const { data: clients, error } = await supabase
        .from('premium_clients')
        .select('*')
        .or('currency.eq.USDT,source.eq.0xprocessing');

    if (error) return res.json({ error });

    // 2. Filter in JS to match UI logic exactly
    // UI: last_payment_at in Jan 2026 (Local time? UI uses local browser time)
    // We will check UTC intersection.

    const janStart = new Date('2026-01-01T00:00:00Z');
    const janEnd = new Date('2026-02-01T00:00:00Z');
    // Also check late Dec 31 for timezone overlap
    const dec31Start = new Date('2025-12-31T00:00:00Z');

    const inJan = [];
    const inDec31 = [];

    clients.forEach(c => {
        const d = new Date(c.last_payment_at);
        if (d >= janStart && d < janEnd) {
            inJan.push(c);
        } else if (d >= dec31Start && d < janStart) {
            inDec31.push(c);
        }
    });

    // Check specific ghost ID presence
    const ghost = clients.find(c => c.telegram_id == 579353732);

    return res.json({
        ghost_record: ghost || 'NOT FOUND',
        jan_count: inJan.length,
        jan_sum: inJan.reduce((sum, c) => sum + (c.original_amount || 0), 0),
        jan_list: inJan.map(c => ({ id: c.telegram_id, amount: c.original_amount, date: c.last_payment_at })),
        dec31_list: inDec31.map(c => ({ id: c.telegram_id, amount: c.original_amount, date: c.last_payment_at }))
    });
}
