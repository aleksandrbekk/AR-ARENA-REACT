
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.query.secret !== 'fix_round') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    // Get all 0xprocessing clients
    const { data: clients, error } = await supabase
        .from('premium_clients')
        .select('*')
        .eq('source', '0xprocessing');

    if (error) return res.json({ error });

    const fixes = [];

    for (const c of clients) {
        const currentTotal = c.total_paid_usd || 0;
        const currentOriginal = c.original_amount || 0;

        // Apply Math.round
        const roundedTotal = Math.round(currentTotal);
        const roundedOriginal = Math.round(currentOriginal);

        // Only update if different
        if (roundedTotal !== currentTotal || roundedOriginal !== currentOriginal) {
            const { error: updErr } = await supabase
                .from('premium_clients')
                .update({
                    total_paid_usd: roundedTotal,
                    original_amount: roundedOriginal
                })
                .eq('id', c.id);

            if (!updErr) {
                fixes.push({
                    telegram_id: c.telegram_id,
                    oldTotal: currentTotal,
                    newTotal: roundedTotal,
                    oldOriginal: currentOriginal,
                    newOriginal: roundedOriginal
                });
            }
        }
    }

    return res.json({
        totalClients: clients.length,
        fixedCount: fixes.length,
        fixes: fixes.slice(0, 20) // First 20
    });
}
