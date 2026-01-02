const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function executeSQLFile() {
    const client = new Client({
        host: 'db.syxjkircmiwpnpagznay.supabase.co',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: 'jobjin-1wirto-pujQaw',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔗 Connecting to Supabase...');
        await client.connect();
        console.log('✅ Connected successfully!\n');

        const sqlPath = path.join(__dirname, 'lottery_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📝 Executing SQL script...\n');
        const result = await client.query(sql);

        console.log('✅ SQL executed successfully!');
        console.log('Result:', result);

        // Проверяем созданные таблицы
        console.log('\n🔍 Verifying created tables...');
        const checkQuery = `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE 'lotter%'
            ORDER BY table_name;
        `;

        const checkResult = await client.query(checkQuery);
        console.log('\n📊 Lottery tables in database:');
        checkResult.rows.forEach(row => {
            console.log(`  ✅ ${row.table_name}`);
        });

        return checkResult.rows;

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await client.end();
        console.log('\n🔌 Connection closed.');
    }
}

executeSQLFile().catch(console.error);
