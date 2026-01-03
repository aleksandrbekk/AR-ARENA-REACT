
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.query.secret !== 'fix_demon') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const telegramId = 119535544;

    // Calculate correct expires_at: 30 days from last_payment
    const lastPayment = new Date('2026-01-02T23:26:15.046+00:00');
    const correctExpires = new Date(lastPayment.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
        .from('premium_clients')
        .update({
            payments_count: 1,
            expires_at: correctExpires.toISOString(),
            total_paid_usd: 3680, // Single payment
            original_amount: 3680
        })
        .eq('telegram_id', telegramId)
        .select();

    if (error) return res.json({ error });

    return res.json({
        fixed: true,
        telegram_id: telegramId,
        newExpires: correctExpires.toISOString(),
        newPaymentsCount: 1,
        data: data[0]
    });
}
