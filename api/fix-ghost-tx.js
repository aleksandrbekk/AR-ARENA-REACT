
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { secret, nuke_id } = req.query;

    if (secret !== 'ghostbusters') {
        return res.status(401).json({ error: 'Who you gonna call?' });
    }

    try {
        // List all 0xprocessing clients with non-zero total
        const { data: ghosts, error } = await supabase
            .from('premium_clients')
            .select('id, telegram_id, total_paid_usd, original_amount, currency, source, last_payment_at, payments_count')
            .eq('source', '0xprocessing')
            .gt('total_paid_usd', 0)
            .order('total_paid_usd', { ascending: false });

        if (error) throw error;

        // Filter for the suspect
        const target = ghosts.find(g => g.telegram_id == (nuke_id || 579353732));

        if (nuke_id && target) {
            // NUKE IT
            const { error: updateError } = await supabase
                .from('premium_clients')
                .update({
                    original_amount: 0,
                    total_paid_usd: 0,
                    payments_count: 0
                })
                .eq('id', target.id);

            if (updateError) throw updateError;

            return res.status(200).json({
                success: true,
                nuked: target,
                message: 'Ghost busted.'
            });
        }

        res.status(200).json({
            count: ghosts.length,
            suspect: target || 'Not found',
            all_ghosts: ghosts
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
