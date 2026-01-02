
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // Get ALL clients with last_payment in Jan 2026
        const { data: clients, error } = await supabase
            .from('premium_clients')
            .select('telegram_id, total_paid_usd, original_amount, currency, source, last_payment_at, payments_count')
            .gte('last_payment_at', '2026-01-01')
            .lt('last_payment_at', '2026-02-01')
            .order('last_payment_at', { ascending: false });

        if (error) throw error;

        // Helper functions (same as in FullCrmPage)
        const isCryptoCurrency = (cur, source) => {
            const c = (cur || '').toUpperCase();
            return c.includes('USDT') || c.includes('USDC') ||
                c.includes('BTC') || c.includes('ETH') || c.includes('TON') ||
                c.includes('CRYPTO') || source === '0xprocessing';
        };

        let totalUsdt = 0;
        let totalRub = 0;
        let totalUsd = 0;
        let totalEur = 0;

        const classified = clients?.map(c => {
            const amount = c.original_amount || 0;
            let type = 'unknown';

            if ((c.currency || '').toUpperCase() === 'RUB' || (!c.currency && c.source === 'lava.top')) {
                type = 'RUB';
                totalRub += amount;
            } else if ((c.currency || '').toUpperCase() === 'EUR') {
                type = 'EUR';
                totalEur += amount;
            } else if (isCryptoCurrency(c.currency, c.source)) {
                type = 'USDT';
                totalUsdt += amount;
            } else if ((c.currency || '').toUpperCase() === 'USD' && c.source !== '0xprocessing') {
                type = 'USD';
                totalUsd += amount;
            }

            return {
                telegram_id: c.telegram_id,
                source: c.source,
                currency: c.currency,
                original_amount: c.original_amount,
                classified_as: type,
                last_payment: c.last_payment_at
            };
        }) || [];

        res.status(200).json({
            clients_count: clients?.length || 0,
            classified,
            totals: {
                RUB: totalRub,
                USD: totalUsd,
                USDT: totalUsdt,
                EUR: totalEur
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
