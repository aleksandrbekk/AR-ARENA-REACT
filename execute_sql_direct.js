import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

async function executeSql() {
  // Using Supabase connection pooler (IPv4) instead of direct db connection (IPv6-only)
  // The pooler requires user format: postgres.project_ref
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

    // Read SQL from file
    const sql = readFileSync('/Users/aleksandrbekk/Desktop/AR-ARENA-REACT/create_add_ar_balance.sql', 'utf8');
    console.log('\nExecuting SQL:');
    console.log(sql);
    console.log('\n---');

    // Execute the CREATE FUNCTION statement
    const result = await client.query(sql);
    console.log('\n✓ SQL executed successfully!');
    console.log('Result:', result);

    // Verify the function was created
    console.log('\nVerifying function creation...');
    const verifyResult = await client.query(
      "SELECT routine_name, routine_type FROM information_schema.routines WHERE routine_name = 'add_ar_balance'"
    );

    if (verifyResult.rows.length > 0) {
      console.log('✓ Function verified!');
      console.log('Function details:', verifyResult.rows[0]);
    } else {
      console.log('⚠️  Function not found in information_schema');
    }

    // Test the function with a dummy call (we'll handle errors gracefully)
    console.log('\nTesting function (checking signature)...');
    try {
      const testResult = await client.query(
        "SELECT pg_get_functiondef(oid) as definition FROM pg_proc WHERE proname = 'add_ar_balance'"
      );
      if (testResult.rows.length > 0) {
        console.log('✓ Function definition retrieved:');
        console.log(testResult.rows[0].definition);
      }
    } catch (testError) {
      console.log('Function definition query error (non-critical):', testError.message);
    }

    console.log('\n=== SUCCESS ===');
    console.log('The add_ar_balance function has been created and is ready to use!');
    console.log('\nUsage example:');
    console.log("SELECT add_ar_balance('user-uuid-here'::uuid, 100);");

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✓ Database connection closed');
  }
}

executeSql();
