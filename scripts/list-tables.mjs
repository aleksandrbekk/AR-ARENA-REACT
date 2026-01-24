#!/usr/bin/env node
/**
 * List all tables in Supabase database
 * Run with: node scripts/list-tables.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function listTables() {
  console.log('=== Supabase Tables ===\n');

  // Query information_schema to get all tables in public schema
  const { data, error } = await supabase
    .rpc('get_tables_info');

  if (error) {
    // If RPC doesn't exist, try direct query approach
    console.log('RPC not found, trying alternative method...\n');

    // Get list of known tables by testing each one
    const knownTables = [
      'users',
      'payments',
      'giveaways',
      'giveaway_participants',
      'giveaway_winners',
      'skins',
      'user_skins',
      'transactions',
      'referrals',
      'premium_clients',
      'chat_inbox',
      'chat_messages',
      'automation_rules',
      'crm_broadcasts',
      'vault_deposits',
      'vault_withdrawals',
      'utm_sources',
      'utm_clicks',
      'system_messages',
      'farms',
      'farm_upgrades',
      'user_farms',
      'jackpots',
      'admin_users',
      'energy_refills',
      'user_energy',
      'sessions',
      'invites'
    ];

    console.log('Checking tables...\n');

    const tableInfo = [];

    for (const tableName of knownTables) {
      const { count, error: tableError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (!tableError) {
        tableInfo.push({ name: tableName, count: count || 0 });
      }
    }

    // Sort by name
    tableInfo.sort((a, b) => a.name.localeCompare(b.name));

    console.log('Found tables:\n');
    console.log('| Table Name                | Row Count |');
    console.log('|---------------------------|-----------|');

    for (const table of tableInfo) {
      const name = table.name.padEnd(25);
      const count = String(table.count).padStart(9);
      console.log(`| ${name} | ${count} |`);
    }

    console.log('\nTotal tables found:', tableInfo.length);
    return;
  }

  console.log(data);
}

listTables().catch(console.error);
