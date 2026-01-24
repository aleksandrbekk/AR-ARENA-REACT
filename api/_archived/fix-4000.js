
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.query.secret !== 'fix_4000') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    // Find recent RUB payments with original_amount = 4000 or 3680 that need fixing
    const { data: clients, error } = await supabase
        .from('premium_clients')
        .select('*')
        .eq('source', 'lava.top')
        .eq('currency', 'RUB')
        .order('last_payment_at', { ascending: false })
        .limit(10);

    if (error) return res.json({ error });

    // Find ones where total_paid_usd or original_amount = 4000 (wrong GROSS)
    const toFix = clients.filter(c =>
        c.original_amount === 4000 ||
        (c.total_paid_usd && Math.abs(c.total_paid_usd - 4000) < 1)
    );

    const results = [];

    for (const c of toFix) {
        // Calculate correct NET
        const correctNet = 3680; // 4000 * 0.92

        // Calculate difference
        const diff = (c.total_paid_usd || 0) - (c.original_amount === 4000 ? 4000 : 0);
        const newTotal = diff + correctNet; // Remove wrong 4000, add correct 3680

        const { error: updErr } = await supabase
            .from('premium_clients')
            .update({
                original_amount: correctNet,
                total_paid_usd: c.payments_count === 1 ? correctNet : (c.total_paid_usd - 320) // subtract 320 (8% of 4000)
            })
            .eq('id', c.id);

        if (!updErr) {
            results.push({
                telegram_id: c.telegram_id,
                oldOriginal: c.original_amount,
                newOriginal: correctNet,
                oldTotal: c.total_paid_usd,
                newTotal: c.payments_count === 1 ? correctNet : (c.total_paid_usd - 320)
            });
        }
    }

    return res.json({
        found: toFix.length,
        fixed: results.length,
        results
    });
}
