
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.query.secret !== 'add_missing_rub') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    // Missing users with their total GROSS amounts from CSV
    const missingUsers = [
        { telegram_id: 190202791, total: 598, plan: 'basic' },  // Test user (aleksandrbekk)
        { telegram_id: 288475216, total: 92, plan: 'basic' },
        { telegram_id: 288542643, total: 46, plan: 'basic' },
        { telegram_id: 412930477, total: 46, plan: 'basic' },
        { telegram_id: 883846421, total: 266.8, plan: 'basic' }, // 73.6+64.4+55.2+73.6
        { telegram_id: 5121238448, total: 9108, plan: 'pro' }
    ];

    const results = [];

    for (const user of missingUsers) {
        // Check if exists
        const { data: existing } = await supabase
            .from('premium_clients')
            .select('id')
            .eq('telegram_id', user.telegram_id)
            .single();

        if (existing) {
            results.push({ telegram_id: user.telegram_id, status: 'already exists', action: 'skipped' });
            continue;
        }

        // Insert new record
        const { error } = await supabase
            .from('premium_clients')
            .insert({
                telegram_id: user.telegram_id,
                plan: user.plan,
                source: 'lava.top',
                currency: 'RUB',
                total_paid_usd: user.total,
                original_amount: user.total,
                payments_count: 1,
                started_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                last_payment_at: new Date().toISOString(),
                last_payment_method: 'lava.top'
            });

        if (error) {
            results.push({ telegram_id: user.telegram_id, status: 'error', error: error.message });
        } else {
            results.push({ telegram_id: user.telegram_id, status: 'inserted', amount: user.total });
        }
    }

    const totalAdded = results.filter(r => r.status === 'inserted').reduce((sum, r) => sum + (r.amount || 0), 0);

    return res.json({
        results,
        totalAdded
    });
}
