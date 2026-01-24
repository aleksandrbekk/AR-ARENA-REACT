
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // 0xProcessing clients from screenshot
    const cryptoIds = [875606814, 380075717, 1329546723, 546765471, 6594435572, 8269655187, 8307185998];

    // Get from DB
    const { data, error } = await supabase
        .from('premium_clients')
        .select('telegram_id, total_paid_usd, original_amount, currency, source, last_payment_at')
        .eq('source', '0xprocessing');

    if (error) return res.json({ error });

    // Filter January 2026
    const jan2026 = data.filter(c => {
        const d = new Date(c.last_payment_at);
        return d.getFullYear() === 2026 && d.getMonth() === 0; // January = 0
    });

    // Check each ID from screenshot
    const comparison = cryptoIds.map(id => {
        const found = data.find(c => c.telegram_id === id);
        return {
            telegram_id: id,
            inDB: !!found,
            dbAmount: found?.total_paid_usd || 0,
            dbOriginal: found?.original_amount || 0
        };
    });

    // Totals
    const expected = [50.16, 128.92, 50.10, 53.90, 448.89, 50.10, 228.88];
    const expectedTotal = expected.reduce((s, v) => s + v, 0);
    const janTotal = jan2026.reduce((s, c) => s + (c.total_paid_usd || 0), 0);

    return res.json({
        expectedTotal: expectedTotal.toFixed(2),
        janDbTotal: janTotal.toFixed(2),
        diff: (janTotal - expectedTotal).toFixed(2),
        janCount: jan2026.length,
        comparison,
        janClients: jan2026.map(c => ({
            id: c.telegram_id,
            amount: c.total_paid_usd,
            date: c.last_payment_at
        }))
    });
}
