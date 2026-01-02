
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // 1. Fetch ALL transactions
        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('*');

        if (txError) throw txError;

        // 2. Fetch ALL purchases
        const { data: purchases, error: purchasesError } = await supabase
            .from('purchases')
            .select('*');

        // 3. Fetch ALL premium_clients with Lava source
        const { data: lavaClients, error: lavaError } = await supabase
            .from('premium_clients')
            .select('telegram_id, total_paid_usd, original_amount, currency, source')
            .eq('source', 'lava.top');

        // 4. Analyze transactions
        let txTotalRub = 0;
        let txTotalUsd = 0;
        let txByType = {};

        transactions?.forEach(tx => {
            const type = tx.type || 'unknown';
            if (!txByType[type]) txByType[type] = { count: 0, total: 0 };
            txByType[type].count++;
            txByType[type].total += tx.amount || 0;

            // Check currency
            if (tx.currency === 'RUB') txTotalRub += tx.amount || 0;
            else if (tx.currency === 'USD') txTotalUsd += tx.amount || 0;
        });

        // 5. Sum Lava clients
        let lavaTotal = 0;
        let lavaOriginalTotal = 0;
        lavaClients?.forEach(c => {
            lavaTotal += c.total_paid_usd || 0;
            lavaOriginalTotal += c.original_amount || 0;
        });

        // 6. Get sample data
        const sampleTx = transactions?.slice(0, 3) || [];
        const samplePurchases = purchases?.slice(0, 3) || [];

        res.status(200).json({
            transactions: {
                count: transactions?.length || 0,
                total_rub: txTotalRub,
                total_usd: txTotalUsd,
                by_type: txByType,
                sample: sampleTx
            },
            purchases: {
                count: purchases?.length || 0,
                sample: samplePurchases
            },
            lava_clients: {
                count: lavaClients?.length || 0,
                total_paid_usd: lavaTotal,
                original_amount_sum: lavaOriginalTotal
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
}
