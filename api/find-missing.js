
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // CSV telegram IDs for RUB
    const csvIds = [49603778, 50320636, 120112474, 174518357, 185730096, 187994772, 190202791, 201611553, 206356122, 211527994, 222190113, 231360807, 261545403, 276936985, 288475216, 288542643, 359743018, 372013387, 377248751, 406770438, 412930477, 418848368, 459426026, 573841500, 630278741, 706111134, 827740833, 838608031, 864285067, 883846421, 909863881, 917749671, 920327292, 930563420, 931481140, 956268196, 962488132, 996889760, 1006383077, 1019439760, 1146158836, 1162860517, 1201066631, 1278497432, 1474148288, 1665615046, 1719345271, 1770157185, 1855257621, 1946073683, 1958046041, 1977523059, 6495411571, 7696545300, 5380032183, 7914081365, 5366052419, 6957079292, 8382061595, 5282101184, 5086317674, 5121238448];

    // Get DB telegram IDs for lava.top RUB
    const { data, error } = await supabase
        .from('premium_clients')
        .select('telegram_id, total_paid_usd, original_amount')
        .eq('source', 'lava.top')
        .eq('currency', 'RUB');

    if (error) return res.json({ error });

    const dbIds = new Set(data.map(d => d.telegram_id));

    // Find missing
    const missing = csvIds.filter(id => !dbIds.has(id));

    // Find extra (in DB but not in CSV)
    const extra = data.filter(d => !csvIds.includes(d.telegram_id));

    // Sum check
    const csvTotal = 865112.80; // from script
    const dbTotal = data.reduce((sum, d) => sum + (d.total_paid_usd || 0), 0);

    return res.json({
        csvCount: csvIds.length,
        dbCount: data.length,
        missingCount: missing.length,
        missing: missing,
        extraCount: extra.length,
        extra: extra.slice(0, 10),
        csvTotal: csvTotal,
        dbTotal: dbTotal.toFixed(2),
        diff: (dbTotal - csvTotal).toFixed(2)
    });
}
