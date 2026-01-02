
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // Search for clients with amounts near 445-460
        const { data: clients, error } = await supabase
            .from('premium_clients')
            .select('*')
            .or('original_amount.gt.440,total_paid_usd.gt.440');

        if (error) throw error;

        // Filter closer range in JS to be safe
        const suspects = clients.filter(c =>
            (c.original_amount > 440 && c.original_amount < 460) ||
            (c.total_paid_usd > 440 && c.total_paid_usd < 460)
        );

        res.status(200).json({
            count: suspects.length,
            suspects
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
