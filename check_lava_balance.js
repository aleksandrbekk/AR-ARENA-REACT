
import fs from 'fs';
import path from 'path';

// Manual .env parser
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        const content = fs.readFileSync(envPath, 'utf8');
        const env = {};
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                let value = match[2].trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                env[match[1].trim()] = value;
            }
        });
        return env;
    } catch (e) {
        console.error('Could not read .env.local', e.message);
        return {};
    }
}

const env = loadEnv();
const API_KEY = env.LAVA_API_KEY;

if (!API_KEY) {
    console.error('Missing LAVA_API_KEY in .env.local');
    process.exit(1);
}

const ENDPOINTS = [
    'https://gate.lava.top/api/v2/wallet/balance',
    'https://gate.lava.top/api/v2/shop/balance',
    'https://gate.lava.top/api/v2/active-subscriptions', // Just to check connectivity
    'https://gate.lava.top/api/v2/me'
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
                    'Content-Type': 'application/json'
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
