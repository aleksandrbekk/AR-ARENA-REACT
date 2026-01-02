
import pg from 'pg';

const { Client } = pg;

async function executeSql() {
    const client = new Client({
        user: 'postgres.syxjkircmiwpnpagznay',
        password: 'jobjin-1wirto-pujQaw',
        host: 'aws-0-ap-southeast-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        connectionTimeoutMillis: 10000,
    });

    try {
        console.log('Connecting to Supabase database...');
        await client.connect();
        console.log('✓ Connected successfully!');

        // Query webhook logs
        const sql = `
      SELECT id, created_at, event_type, payload
      FROM webhook_logs
      WHERE source = 'lava.top'
      ORDER BY created_at DESC
      LIMIT 3;
    `;

        console.log('\nExecuting SQL:');
        console.log(sql);

        const result = await client.query(sql);
        console.log('\n✓ Results:');

        result.rows.forEach(row => {
            console.log('---');
            console.log(`ID: ${row.id}, Time: ${row.created_at}, Event: ${row.event_type}`);
            // Pretty print the payload
            console.log('Payload:', JSON.stringify(row.payload, null, 2));
        });

    } catch (error) {
        console.error('\n✗ Error:', error.message);
    } finally {
        await client.end();
        console.log('\n✓ Database connection closed');
    }
}

executeSql();
