
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // Check crypto clients with Jan 2026 payments
        const { data: clients, error } = await supabase
            .from('premium_clients')
            .select('telegram_id, total_paid_usd, original_amount, currency, source, last_payment_at, payments_count')
            .eq('source', '0xprocessing')
            .order('last_payment_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        // Focus on Jan 2026
        const jan2026 = clients?.filter(c => {
            if (!c.last_payment_at) return false;
            const d = new Date(c.last_payment_at);
            return d.getFullYear() === 2026 && d.getMonth() === 0;
        }) || [];

        // Also check if any client has payments_count > 1 (repeat payers)
        const repeatPayers = clients?.filter(c => c.payments_count > 1) || [];

        // Check all clients whose last_payment_at is in Jan 2026 but original_amount is high
        const allCryptoInDb = clients?.map(c => ({
            telegram_id: c.telegram_id,
            total_paid_usd: c.total_paid_usd,
            original_amount: c.original_amount,
            payments_count: c.payments_count,
            last_payment: c.last_payment_at
        })) || [];

        res.status(200).json({
            january_2026_clients: jan2026.map(c => ({
                telegram_id: c.telegram_id,
                total_paid_usd: c.total_paid_usd,
                original_amount: c.original_amount,
                payments_count: c.payments_count,
                last_payment_at: c.last_payment_at,
                is_cumulative: c.original_amount === c.total_paid_usd
            })),
            total_original_amount: jan2026.reduce((s, c) => s + (c.original_amount || 0), 0),
            total_paid_usd: jan2026.reduce((s, c) => s + (c.total_paid_usd || 0), 0),
            repeat_payers_count: repeatPayers.length,
            all_recent_10: allCryptoInDb
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
