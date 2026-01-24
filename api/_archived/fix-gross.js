
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.query.secret !== 'restore_gross') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    // Get all lava.top clients where total_paid_usd differs from original_amount
    const { data: clients, error } = await supabase
        .from('premium_clients')
        .select('*')
        .eq('source', 'lava.top');

    if (error) return res.json({ error });

    const fixes = [];

    for (const c of clients) {
        const total = c.total_paid_usd || 0;
        const original = c.original_amount || 0;

        // If total differs from original by more than 1%, fix it
        if (original > 0 && Math.abs(total - original) / original > 0.01) {
            const { error: updErr } = await supabase
                .from('premium_clients')
                .update({ total_paid_usd: original })
                .eq('id', c.id);

            if (!updErr) {
                fixes.push({
                    telegramId: c.telegram_id,
                    oldTotal: total,
                    newTotal: original,
                    currency: c.currency
                });
            }
        }
    }

    return res.json({
        message: 'Restored GROSS amounts',
        fixedCount: fixes.length,
        fixes: fixes.slice(0, 10)
    });
}
