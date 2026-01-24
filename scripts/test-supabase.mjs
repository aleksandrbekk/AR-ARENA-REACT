#!/usr/bin/env node
/**
 * Test Supabase connection
 * Run with: node scripts/test-supabase.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== Supabase Connection Test ===\n');

// Check if env vars are set
if (!SUPABASE_URL) {
  console.error('ERROR: SUPABASE_URL is not set');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is not set');
  process.exit(1);
}

console.log('Supabase URL:', SUPABASE_URL);
console.log('Service Key:', SUPABASE_SERVICE_KEY ? '***' + SUPABASE_SERVICE_KEY.slice(-8) : 'NOT SET');
console.log();

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testConnection() {
  try {
    // Test 1: Simple query to users table
    console.log('Test 1: Querying users table (limit 5)...');
    const { data: users, error: usersError, count } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .limit(5);

    if (usersError) {
      console.error('Users query error:', usersError.message);
    } else {
      console.log(`SUCCESS: Found ${count} total users`);
      console.log('Sample users:', users?.map(u => ({
        telegram_id: u.telegram_id,
        username: u.username,
        tier: u.tier
      })));
    }

    console.log();

    // Test 2: Query payments table
    console.log('Test 2: Querying payments table (limit 5)...');
    const { data: payments, error: paymentsError, count: paymentsCount } = await supabase
      .from('payments')
      .select('*', { count: 'exact' })
      .limit(5);

    if (paymentsError) {
      console.error('Payments query error:', paymentsError.message);
    } else {
      console.log(`SUCCESS: Found ${paymentsCount} total payments`);
      console.log('Sample payments:', payments?.map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        provider: p.provider
      })));
    }

    console.log();

    // Test 3: Check database time
    console.log('Test 3: Checking database time...');
    const { data: timeData, error: timeError } = await supabase
      .rpc('now');

    if (timeError) {
      // Try alternative method
      const { data, error } = await supabase
        .from('users')
        .select('created_at')
        .limit(1)
        .single();

      if (error) {
        console.error('Time check error:', timeError.message);
      } else {
        console.log('Database connection is working (time check via users table)');
      }
    } else {
      console.log('Database time:', timeData);
    }

    console.log('\n=== All tests completed ===');

  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

testConnection();
