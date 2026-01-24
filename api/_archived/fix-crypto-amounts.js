
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.query.secret !== 'fix_crypto_amounts') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    // Correct amounts from 0xProcessing screenshot (January 2026)
    // Using Math.round as per user's request
    const corrections = [
        { telegram_id: 380075717, correctAmount: 129 },   // $128.92 → 129
        { telegram_id: 546765471, correctAmount: 54 },    // $53.90 → 54
        { telegram_id: 6594435572, correctAmount: 449 },  // $448.89 → 449
        { telegram_id: 8307185998, correctAmount: 229 }   // $228.88 → 229
    ];

    const results = [];

    for (const c of corrections) {
        const { data: client, error: fetchErr } = await supabase
            .from('premium_clients')
            .select('*')
            .eq('telegram_id', c.telegram_id)
            .single();

        if (fetchErr || !client) {
            results.push({ telegram_id: c.telegram_id, status: 'not found' });
            continue;
        }

        const { error: updErr } = await supabase
            .from('premium_clients')
            .update({
                total_paid_usd: c.correctAmount,
                original_amount: c.correctAmount
            })
            .eq('id', client.id);

        if (!updErr) {
            results.push({
                telegram_id: c.telegram_id,
                oldTotal: client.total_paid_usd,
                newTotal: c.correctAmount,
                status: 'fixed'
            });
        } else {
            results.push({ telegram_id: c.telegram_id, status: 'error', error: updErr.message });
        }
    }

    return res.json({
        message: 'Fixed crypto amounts to match 0xProcessing',
        results
    });
}
