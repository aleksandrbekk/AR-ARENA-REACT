
import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function
export default async function handler(req, res) {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // 1. Fetch ALL payments from payment_history
        const { data: payments, error } = await supabase
            .from('payment_history')
            .select('*');

        if (error) throw error;

        // 2. Fetch ALL premium_clients to compare
        const { data: clients, error: clientsError } = await supabase
            .from('premium_clients')
            .select('telegram_id, total_paid_usd, original_amount, currency, source');

        if (clientsError) throw clientsError;

        // 3. Analyze Payment History
        let totalRub = 0;
        let totalUsd = 0;
        let lavaRub = 0;

        payments.forEach(p => {
            // Normalization logic from FullCrmPage
            const c = (p.currency || '').toUpperCase();
            const isRub = c === 'RUB' || (!p.currency && p.source === 'lava.top');

            if (isRub) {
                totalRub += p.amount;
                if (p.source === 'lava.top') lavaRub += p.amount;
            } else if (c === 'USD') {
                totalUsd += p.amount;
            }
        });

        // 4. Analyze Clients (what is stored in user profiles)
        let clientTotalUsd = 0;
        clients.forEach(c => {
            clientTotalUsd += c.total_paid_usd || 0;
        });

        res.status(200).json({
            payment_history: {
                count: payments.length,
                total_rub: totalRub,
                lava_only_rub: lavaRub,
                total_usd: totalUsd
            },
            premium_clients: {
                count: clients.length,
                total_paid_usd_sum: clientTotalUsd
            },
            discrepancy_note: "If lava_only_rub > Lava Balance, then stored payments are Gross (pre-tax)."
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
