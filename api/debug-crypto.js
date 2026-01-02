
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // Check premium_clients with 0xprocessing source
        const { data: cryptoClients, error } = await supabase
            .from('premium_clients')
            .select('telegram_id, total_paid_usd, original_amount, currency, source, last_payment_at, created_at')
            .eq('source', '0xprocessing')
            .order('last_payment_at', { ascending: false });

        if (error) throw error;

        // Group by month
        const byMonth = {};
        cryptoClients?.forEach(c => {
            const date = c.last_payment_at ? new Date(c.last_payment_at) : new Date(c.created_at);
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!byMonth[month]) byMonth[month] = { count: 0, totalUsd: 0 };
            byMonth[month].count++;
            byMonth[month].totalUsd += c.total_paid_usd || 0;
        });

        // Get January 2026 specifically
        const jan2026 = cryptoClients?.filter(c => {
            const date = c.last_payment_at ? new Date(c.last_payment_at) : new Date(c.created_at);
            return date.getFullYear() === 2026 && date.getMonth() === 0;
        }) || [];

        res.status(200).json({
            total_crypto_clients: cryptoClients?.length || 0,
            by_month: byMonth,
            january_2026: {
                count: jan2026.length,
                total_usd: jan2026.reduce((sum, c) => sum + (c.total_paid_usd || 0), 0),
                clients: jan2026.map(c => ({
                    telegram_id: c.telegram_id,
                    usd: c.total_paid_usd,
                    amount: c.original_amount,
                    currency: c.currency,
                    date: c.last_payment_at || c.created_at
                }))
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
