
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.query.secret !== 'rubles_are_back') return res.status(403).json({ error: 'Forbidden' });

    // 1. Get RUB clients
    const { data: clients, error } = await supabase
        .from('premium_clients')
        .select('*')
        .or('currency.eq.RUB,source.eq.lava,source.eq.lava_rub');

    if (error) return res.status(500).json({ error });

    const updates = [];
    const COURSE = 90.90808; // Derived from 16468 / 181.15

    for (const c of clients) {
        const total = c.total_paid_usd || 0;
        const original = c.original_amount || 0;

        // Check if total looks like USD (much smaller than original RUB)
        // Or if payments_count > 1, total should be > original.
        // If total < original * 0.1 -> definitely converted.

        // Safety check:
        if (total > 0 && total < original * 0.5) {
            const newTotal = total * COURSE;

            const { error: updErr } = await supabase
                .from('premium_clients')
                .update({ total_paid_usd: newTotal })
                .eq('id', c.id);

            if (!updErr) {
                updates.push({ id: c.telegram_id, old: total, new: newTotal });
            }
        }
    }

    return res.json({
        message: 'Fixed RUB amounts',
        count: updates.length,
        updates: updates.slice(0, 5) // preview
    });
}
