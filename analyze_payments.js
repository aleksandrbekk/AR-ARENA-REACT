
import { createClient } from '@supabase/supabase-js';
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
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function analyze() {
    console.log('Fetching payment_history...');

    // Fetch chunks
    let allPayments = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('payment_history')
            .select('*')
            // .select('amount, currency, source, created_at')
            // .eq('source', 'lava.top') // Let's get everything first to be sure
            .range(page * pageSize, (page + 1) * pageSize - 1)
            .limit(1); // JUST ONE ROW TO CHECK SCHEMA


        if (error) {
            console.error('Error fetching data:', error);
            hasMore = false;
            if (error.code === 'PGRST116' || error.message.includes('permission')) {
                console.log('⚠️ RLS is blocking access. Cannot read payment_history with Anon Key.');
            }
            return;
        }

        if (data && data.length > 0) {
            allPayments = [...allPayments, ...data];
            page++;
            if (data.length < pageSize) hasMore = false;
        } else {
            hasMore = false;
        }
    }

    console.log(`Fetched ${allPayments.length} records.`);

    // Calculate totals matching FullCrmPage logic
    const isRubCurrency = (cur, source) => {
        const c = (cur || '').toUpperCase();
        return c === 'RUB' || (!cur && source === 'lava.top');
    };

    const USD_TO_RUB = 100;
    const EUR_TO_RUB = 110;

    let totalRub = 0;
    let totalUsd = 0;
    let totalEur = 0;

    let lavaTotal = 0;

    allPayments.forEach(p => {
        if (isRubCurrency(p.currency, p.source)) {
            totalRub += p.amount;
            if (p.source === 'lava.top') {
                lavaTotal += p.amount;
            }
        } else if (p.currency === 'USD') {
            totalUsd += p.amount;
        } else if (p.currency === 'EUR') {
            totalEur += p.amount;
        }
    });

    const totalInRub = totalRub + (totalUsd * USD_TO_RUB) + (totalEur * EUR_TO_RUB);

    console.log('\n--- Analysis Results ---');
    console.log(`Total Records: ${allPayments.length}`);
    console.log(`Total RUB (Direct): ${totalRub.toLocaleString('ru-RU')} ₽`);
    console.log(`  - Lava.top RUB: ${lavaTotal.toLocaleString('ru-RU')} ₽`);
    console.log(`Total USD: $${totalUsd.toLocaleString('en-US')}`);
    console.log(`Total EUR: €${totalEur.toLocaleString('de-DE')}`);
    console.log('------------------------');
    console.log(`GRAND TOTAL (in RUB): ${totalInRub.toLocaleString('ru-RU')} ₽`);
}

analyze();
