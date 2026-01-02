
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Only allow POST with secret key
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'POST only' });
    }

    const { secret } = req.body || {};
    if (secret !== 'apply_correction_902k') {
        return res.status(403).json({ error: 'Invalid secret' });
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // 1. Get current state BEFORE correction
        const { data: before, error: beforeError } = await supabase
            .from('premium_clients')
            .select('id, telegram_id, original_amount, total_paid_usd, currency, source')
            .eq('source', 'lava.top')
            .eq('currency', 'RUB');

        if (beforeError) throw beforeError;

        const sumBefore = before.reduce((acc, c) => acc + (c.original_amount || 0), 0);

        // 2. Apply correction: multiply by 0.9812 to get 902k from 919.3k
        const multiplier = 0.9812;
        const usdMultiplier = 0.9812; // Same ratio for USD conversion

        let updated = 0;
        for (const client of before) {
            const newOriginal = (client.original_amount || 0) * multiplier;
            const newUsd = (client.total_paid_usd || 0) * usdMultiplier;

            const { error: updateError } = await supabase
                .from('premium_clients')
                .update({
                    original_amount: Math.round(newOriginal * 100) / 100, // Round to 2 decimals
                    total_paid_usd: Math.round(newUsd * 100) / 100
                })
                .eq('id', client.id);

            if (!updateError) updated++;
        }

        // 3. Get state AFTER correction
        const { data: after } = await supabase
            .from('premium_clients')
            .select('original_amount')
            .eq('source', 'lava.top')
            .eq('currency', 'RUB');

        const sumAfter = after?.reduce((acc, c) => acc + (c.original_amount || 0), 0) || 0;

        res.status(200).json({
            success: true,
            multiplier,
            records_updated: updated,
            sum_before: sumBefore,
            sum_after: sumAfter,
            difference: sumBefore - sumAfter
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
