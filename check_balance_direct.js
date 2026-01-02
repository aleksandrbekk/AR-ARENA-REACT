const API_KEY = '5TWrWm1j7Xr9rjR9Fa5jQuAUORisTcAJHV4rJPVHz23MJYlPxURoBl9wNaNUEHl2';

const ENDPOINTS = [
    'https://gate.lava.top/api/v2/shop',
    'https://gate.lava.top/api/v2/merchant',
    'https://api.lava.top/api/v2/wallet/balance', // specific wallet subdomain? unlikely but checking
    'https://gate.lava.top/api/v1/balance'
];

async function checkBalance() {
    console.log('Using API Key:', API_KEY.slice(0, 5) + '...');

    for (const url of ENDPOINTS) {
        try {
            console.log(`\nProbing ${url}...`);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Api-Key': API_KEY,
                    'Accept': 'application/json'
                }
            });

            console.log(`Status: ${response.status}`);
            const text = await response.text();
            try {
                const json = JSON.parse(text);
                console.log('Response:', JSON.stringify(json, null, 2));
            } catch {
                console.log('Response (text):', text);
            }
        } catch (err) {
            console.error('Error:', err.message);
        }
    }
}

checkBalance();
