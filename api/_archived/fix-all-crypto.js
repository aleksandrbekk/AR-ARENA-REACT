
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// All 0xProcessing transactions from CSV with CORRECT USD amounts
// Format: telegram_id -> correct Amount USD (rounded)
const correctAmounts = {
    // alexrich83 - тут только username без telegram_id, пропускаем
    5119800996: 225,
    1336410439: 125,
    943786278: 445,
    275909622: 449, // 448.76 -> 449
    706820732: 125,
    545682554: 225,
    7039470442: 445,
    384192049: 225,
    1030058890: 50,
    5039684879: 225,
    510130446: 445,
    7440574509: 50,
    1812358410: 125,
    1550048587: 50,
    228101576: 125,
    6957193527: 445,
    318676047: 225,
    987586130: 445,
    272301921: 445,
    366135485: 125,
    7601933146: 445,
    153689186: 225,
    5121238448: 228, // 227.84 -> 228
    244331143: 225,
    193501883: 225,
    711050080: 445,
    546828683: 225,
    738687096: 50,
    97530953: 125,
    472427713: 445,
    842849795: 445,
    323369309: 50,
    1856558829: 125,
    5747272020: 50,
    7173652729: 225,
    7459009955: 125,
    1771612817: 445,
    333921024: 50,
    1067008592: 445,
    815830735: 225,
    1430986765: 125,
    7599211566: 125,
    688211312: 445,
    991884752: 445,
    2075430267: 125,
    829788244: 225,
    377188132: 225,
    5116031537: 445,
    97857592: 445,
    387646608: 125,
    1254686972: 225,
    456765524: 125,
    413383543: 445,
    511227811: 225,
    379696726: 225,
    1139721495: 225,
    87778002: 445,
    448961948: 125,
    144096926: 50,
    456819441: 225,
    548625612: 225,
    5042770252: 50,
    387920636: 125,
    1157126233: 445,
    737400359: 50,
    8307185998: 225,
    8269655187: 50,
    6594435572: 445,
    546765471: 50,
    1329546723: 50,
    380075717: 125,
    875606814: 50
};

export default async function handler(req, res) {
    if (req.query.secret !== 'fix_all_crypto') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const ids = Object.keys(correctAmounts).map(Number);

    // Get all 0xprocessing clients
    const { data: clients, error } = await supabase
        .from('premium_clients')
        .select('*')
        .eq('source', '0xprocessing')
        .in('telegram_id', ids);

    if (error) return res.json({ error });

    const fixes = [];
    let totalDiff = 0;

    for (const client of clients) {
        const correct = correctAmounts[client.telegram_id];
        if (!correct) continue;

        const current = client.total_paid_usd || 0;

        // Only fix if different
        if (Math.round(current) !== correct) {
            const { error: updErr } = await supabase
                .from('premium_clients')
                .update({
                    total_paid_usd: correct,
                    original_amount: correct
                })
                .eq('id', client.id);

            if (!updErr) {
                const diff = correct - current;
                totalDiff += diff;
                fixes.push({
                    telegram_id: client.telegram_id,
                    old: current,
                    new: correct,
                    diff: diff.toFixed(2)
                });
            }
        }
    }

    return res.json({
        message: 'Fixed 0xProcessing amounts from CSV',
        totalInCSV: Object.keys(correctAmounts).length,
        foundInDB: clients.length,
        fixed: fixes.length,
        totalDiff: totalDiff.toFixed(2),
        fixes
    });
}
