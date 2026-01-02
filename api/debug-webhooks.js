
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // Check webhook_logs for recent Lava payloads
        const { data: logs, error } = await supabase
            .from('webhook_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            // Table might not exist or have different schema
            return res.status(200).json({
                error: error.message,
                note: "webhook_logs table may not exist or has different schema"
            });
        }

        // Extract key payment fields from each log
        const analyzed = logs?.map(log => {
            const p = log.payload || {};
            return {
                id: log.id,
                created_at: log.created_at,
                event_type: log.event_type,
                // Key fields we need to verify
                buyerAmount: p.buyerAmount,
                payment_amount: p.payment?.amount,
                shopAmount: p.shopAmount,
                amount: p.amount,
                currency: p.currency || p.buyerCurrency,
                // Check if payment object exists
                has_payment_object: !!p.payment,
                payment_keys: p.payment ? Object.keys(p.payment) : []
            };
        });

        res.status(200).json({
            logs_count: logs?.length || 0,
            analyzed
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
