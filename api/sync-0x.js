
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 0xProcessing API
const OX_API_KEY = 'iNqBsNvwgrinXvLZnx_2zrtklE@wsMTx6RC7$eKhvFrBg9vDkXOc#o2HwbuPTr5N7ePqxcgLhh3cdJ3LtVRh$EiT#Etufcfb51#dMDJK20BbSJyXtwwuHrxJ4fepROSRaMMCQzU4TpBX5Ol_MRQMFlpqAqFQVthrKdE!i3fx77!4rH2I2_V06Unb#1IAvEantv3@qFMKA6ejaH#3twzDRhG$$6F!6!cTnoTZI_39KrBNeKLH2n!aXjvxCr';
const MERCHANT_ID = '0xMR3389551';

export default async function handler(req, res) {
    if (req.query.secret !== 'sync_0x') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        // Try different endpoints to get transactions
        const endpoints = [
            'https://api.0xprocessing.com/api/v1/payments',
            'https://api.0xprocessing.com/api/v1/transactions',
            'https://api.0xprocessing.com/api/v1/deposits',
            'https://api.0xprocessing.com/api/v1/merchant/payments',
            'https://api.0xprocessing.com/v1/payments',
            'https://0xprocessing.com/api/v1/payments',
            'https://0xprocessing.com/api/payments'
        ];

        const results = {};

        for (const url of endpoints) {
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${OX_API_KEY}`,
                        'X-API-Key': OX_API_KEY,
                        'Api-Key': OX_API_KEY,
                        'Content-Type': 'application/json',
                        'X-Merchant-Id': MERCHANT_ID
                    }
                });

                const text = await response.text();
                results[url] = {
                    status: response.status,
                    data: text.substring(0, 300)
                };
            } catch (e) {
                results[url] = { error: e.message };
            }
        }

        return res.json({
            message: 'Probing 0xProcessing API endpoints',
            results
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
