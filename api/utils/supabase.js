// ============================================
// SUPABASE CLIENT
// Единый клиент для всех API эндпоинтов
// ============================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Validate required env vars
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('CRITICAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Service role client (full access)
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Anon key for Edge Functions
export { SUPABASE_URL, SUPABASE_ANON_KEY };
