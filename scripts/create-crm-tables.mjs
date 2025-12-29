import { createClient } from '@supabase/supabase-js';

// SECURITY: Load from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://syxjkircmiwpnpagznay.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test connection
const { data, error } = await supabase.from('event_codes').select('*').limit(1);
console.log('Connection test:', error ? error.message : 'OK');
console.log('Data:', data);
