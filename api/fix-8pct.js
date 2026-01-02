
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'POST only' });
    }

    const { secret } = req.body || {};
    if (secret !== 'fix_8_percent') {
        return res.status(403).json({ error: 'Invalid secret' });
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // Get all Lava RUB clients
        const { data: clients, error } = await supabase
            .from('premium_clients')
            .select('id, telegram_id, original_amount, total_paid_usd, currency, source')
            .eq('source', 'lava.top')
            .eq('currency', 'RUB');

        if (error) throw error;

        const sumBefore = clients.reduce((acc, c) => acc + (c.original_amount || 0), 0);

        // For each client:
        // 1. Undo previous wrong correction: divide by 0.9812 to get back to Gross
        // 2. Apply correct 8% commission: multiply by 0.92 to get Net
        // Combined: × (0.92 / 0.9812) = × 0.9377
        const correctionFactor = 0.92 / 0.9812;

        let updated = 0;
        for (const client of clients) {
            const oldAmount = client.original_amount || 0;
            const newAmount = Math.round(oldAmount * correctionFactor * 100) / 100;

            // Also fix total_paid_usd (USD equivalent)
            const oldUsd = client.total_paid_usd || 0;
            const newUsd = Math.round(oldUsd * correctionFactor * 100) / 100;

            const { error: updateError } = await supabase
                .from('premium_clients')
                .update({
                    original_amount: newAmount,
                    total_paid_usd: newUsd
                })
                .eq('id', client.id);

            if (!updateError) updated++;
        }

        // Get state after
        const { data: after } = await supabase
            .from('premium_clients')
            .select('original_amount')
            .eq('source', 'lava.top')
            .eq('currency', 'RUB');

        const sumAfter = after?.reduce((acc, c) => acc + (c.original_amount || 0), 0) || 0;

        res.status(200).json({
            success: true,
            correction_factor: correctionFactor,
            records_updated: updated,
            sum_before: sumBefore,
            sum_after: sumAfter,
            expected_after_8pct: sumBefore / 0.9812 * 0.92,
            example: '4000 -> ' + Math.round(4000 * 0.9812 * correctionFactor)
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
