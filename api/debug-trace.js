
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // Get ALL clients that would be included in January 2026 stats
        const { data: allClients, error } = await supabase
            .from('premium_clients')
            .select('*')
            .neq('source', 'migration');

        if (error) throw error;

        // Filter for January 2026
        const jan2026Clients = allClients.filter(c => {
            if (!c.last_payment_at) return false;
            const d = new Date(c.last_payment_at);
            return d.getFullYear() === 2026 && d.getMonth() === 0;
        }).filter(c => c.total_paid_usd > 0 || (c.original_amount || 0) > 0);

        // Apply same logic as FullCrmPage
        const isCryptoCurrency = (cur, source) => {
            const c = (cur || '').toUpperCase();
            return c.includes('USDT') || c.includes('USDC') ||
                c.includes('BTC') || c.includes('ETH') || c.includes('TON') ||
                c.includes('CRYPTO') || source === '0xprocessing';
        };

        const isRubCurrency = (cur, source) => {
            const c = (cur || '').toUpperCase();
            return c === 'RUB' || (!cur && source === 'lava.top');
        };

        const isEurCurrency = (cur) => (cur || '').toUpperCase() === 'EUR';

        const isUsdCurrency = (cur, source) => {
            const c = (cur || '').toUpperCase();
            return c === 'USD' && source !== '0xprocessing';
        };

        // Trace each client
        const traced = jan2026Clients.map(c => {
            const amount = c.original_amount || 0; // For specific month
            let category = 'none';

            if (isRubCurrency(c.currency, c.source)) category = 'RUB';
            else if (isEurCurrency(c.currency)) category = 'EUR';
            else if (isCryptoCurrency(c.currency, c.source)) category = 'USDT';
            else if (isUsdCurrency(c.currency, c.source)) category = 'USD';

            return {
                telegram_id: c.telegram_id,
                source: c.source,
                currency: c.currency,
                original_amount: c.original_amount,
                total_paid_usd: c.total_paid_usd,
                category,
                amount_used: amount,
                last_payment: c.last_payment_at
            };
        });

        // Sum by category
        const sums = { RUB: 0, USD: 0, USDT: 0, EUR: 0 };
        traced.forEach(t => {
            if (sums[t.category] !== undefined) {
                sums[t.category] += t.amount_used;
            }
        });

        res.status(200).json({
            clients_in_jan2026: traced.length,
            by_category: sums,
            details: traced
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
