
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Check what amounts clients have and compare to expected
export default async function handler(req, res) {
    // Expected from 0xProcessing screenshot (January payments)
    const expected = {
        875606814: 50.16,
        380075717: 128.92,
        1329546723: 50.10,
        546765471: 53.90,
        6594435572: 448.89,
        8269655187: 50.10,
        8307185998: 228.88
    };

    const ids = Object.keys(expected).map(Number);

    const { data, error } = await supabase
        .from('premium_clients')
        .select('telegram_id, total_paid_usd, original_amount, currency, source')
        .in('telegram_id', ids);

    if (error) return res.json({ error });

    const comparison = ids.map(id => {
        const found = data.find(c => c.telegram_id === id);
        const exp = expected[id];
        const expRounded = Math.round(exp);
        return {
            telegram_id: id,
            expected: exp,
            expectedRounded: expRounded,
            dbTotal: found?.total_paid_usd || 'NOT FOUND',
            dbOriginal: found?.original_amount || 'NOT FOUND',
            matchesRounded: found?.total_paid_usd === expRounded ? '✅' : '❌'
        };
    });

    return res.json({
        note: "If amounts don't match rounded expected, webhook is getting wrong data",
        comparison
    });
}
