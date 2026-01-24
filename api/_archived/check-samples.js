
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    const ids = [6495411571, 1719345271, 917749671, 7234268883, 7696545300, 1481948598, 222190113, 459426026, 1474148288, 315724350];

    const { data, error } = await supabase
        .from('premium_clients')
        .select('telegram_id, total_paid_usd, original_amount, currency, source')
        .in('telegram_id', ids);

    if (error) return res.json({ error });

    // Expected from Lava CSV (NET amounts)
    const expected = {
        6495411571: { gross: 3680, net: 3360, currency: 'RUB' },
        1719345271: { gross: 3680, net: 3360, currency: 'RUB' },
        917749671: { gross: 3680, net: 3360, currency: 'RUB' },
        7234268883: { gross: 177.85, net: 162.38, currency: 'EUR' },
        7696545300: { gross: 3680, net: 3360, currency: 'RUB' },
        1481948598: { gross: 98.37, net: 89.82, currency: 'EUR' },
        222190113: { gross: 9108, net: 8316, currency: 'RUB' },
        459426026: { gross: 9108, net: 8316, currency: 'RUB' },
        1474148288: { gross: 16468, net: 15036, currency: 'RUB' },
        315724350: { gross: 177.85, net: 162.38, currency: 'EUR' }
    };

    const comparison = data.map(d => ({
        telegram_id: d.telegram_id,
        db_total: d.total_paid_usd,
        db_original: d.original_amount,
        expected_gross: expected[d.telegram_id]?.gross,
        expected_net: expected[d.telegram_id]?.net,
        storing: d.total_paid_usd === expected[d.telegram_id]?.gross ? 'GROSS' :
            d.total_paid_usd === expected[d.telegram_id]?.net ? 'NET' : 'OTHER'
    }));

    return res.json({ comparison });
}
