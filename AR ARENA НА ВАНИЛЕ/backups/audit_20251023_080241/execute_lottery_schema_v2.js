// Выполнение lottery_schema.sql через Supabase REST API
const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'https://syxjkircmiwpnpagznay.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NDQxMSwiZXhwIjoyMDczMzQwNDExfQ.7ueEYBhFrxKU3_RJi_iJEDj6EQqWBy3gAXiM4YIALqs';

async function executeSQL(query) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ query });

        const options = {
            hostname: 'syxjkircmiwpnpagznay.supabase.co',
            port: 443,
            path: '/rest/v1/rpc/exec_raw_sql',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length,
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => { responseData += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(responseData);
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function createTablesManually() {
    console.log('🚀 Starting lottery tables creation...\n');

    const tables = [
        {
            name: 'lotteries',
            sql: `
                CREATE TABLE IF NOT EXISTS lotteries (
                    id BIGSERIAL PRIMARY KEY,
                    title VARCHAR(200) NOT NULL,
                    description TEXT,
                    prize_description TEXT NOT NULL,
                    prize_ar INTEGER NOT NULL CHECK (prize_ar > 0),
                    prize_image_url VARCHAR(500),
                    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished', 'cancelled')),
                    ticket_price_ar INTEGER NOT NULL CHECK (ticket_price_ar > 0),
                    max_tickets INTEGER NOT NULL CHECK (max_tickets > 0),
                    sold_tickets INTEGER NOT NULL DEFAULT 0 CHECK (sold_tickets >= 0 AND sold_tickets <= max_tickets),
                    winner_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
                    winner_selected_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    CONSTRAINT end_after_start CHECK (end_date > start_date)
                );
            `
        },
        {
            name: 'lottery_tickets',
            sql: `
                CREATE TABLE IF NOT EXISTS lottery_tickets (
                    id BIGSERIAL PRIMARY KEY,
                    lottery_id BIGINT NOT NULL REFERENCES lotteries(id) ON DELETE CASCADE,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    ticket_number INTEGER NOT NULL CHECK (ticket_number > 0),
                    is_winning_ticket BOOLEAN NOT NULL DEFAULT false,
                    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    UNIQUE(lottery_id, ticket_number)
                );
            `
        },
        {
            name: 'lottery_referrals',
            sql: `
                CREATE TABLE IF NOT EXISTS lottery_referrals (
                    id BIGSERIAL PRIMARY KEY,
                    lottery_id BIGINT NOT NULL REFERENCES lotteries(id) ON DELETE CASCADE,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    referral_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    bonus_tickets INTEGER NOT NULL DEFAULT 1 CHECK (bonus_tickets > 0),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    UNIQUE(lottery_id, user_id, referral_user_id),
                    CHECK (user_id != referral_user_id)
                );
            `
        },
        {
            name: 'lottery_purchases',
            sql: `
                CREATE TABLE IF NOT EXISTS lottery_purchases (
                    id BIGSERIAL PRIMARY KEY,
                    lottery_id BIGINT NOT NULL REFERENCES lotteries(id) ON DELETE CASCADE,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    tickets_count INTEGER NOT NULL CHECK (tickets_count > 0),
                    total_ar_spent INTEGER NOT NULL CHECK (total_ar_spent > 0),
                    transaction_id BIGINT,
                    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `
        }
    ];

    // Для REST API нужно использовать fetch, но в Node.js используем прямые запросы
    console.log('⚠️  Cannot execute SQL directly via REST API without proper RPC function.');
    console.log('📋 Please manually execute lottery_schema.sql in Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/syxjkircmiwpnpagznay/sql/new\n');

    console.log('📄 SQL File location:');
    console.log('   /Users/aleksandrbekk/Desktop/AR ARENA/lottery_schema.sql\n');

    console.log('Or copy the SQL from the file and paste it into the editor.\n');

    // Выводим краткую версию для ручного выполнения
    console.log('='.repeat(60));
    console.log('TABLES TO CREATE:');
    console.log('='.repeat(60));
    tables.forEach(table => {
        console.log(`✓ ${table.name}`);
    });
    console.log('='.repeat(60));
}

createTablesManually().catch(console.error);
