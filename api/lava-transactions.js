
// Lava.top Transactions API
const LAVA_API_KEY = process.env.LAVA_API_KEY;

export default async function handler(req, res) {
    if (!LAVA_API_KEY) {
        return res.status(500).json({ error: 'Missing LAVA_API_KEY' });
    }

    try {
        // Try different endpoints
        const endpoints = [
            'https://gate.lava.top/api/v2/wallet/businesses/transactions',
            'https://gate.lava.top/api/v2/transactions',
            'https://gate.lava.top/api/v2/contracts',
            'https://gate.lava.top/api/v2/payouts'
        ];

        const results = {};

        for (const url of endpoints) {
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'X-Api-Key': LAVA_API_KEY,
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.text();
                results[url] = {
                    status: response.status,
                    data: data.substring(0, 500) // First 500 chars
                };
            } catch (e) {
                results[url] = { error: e.message };
            }
        }

        return res.json({
            keyPrefix: LAVA_API_KEY?.substring(0, 8) + '...',
            results
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
