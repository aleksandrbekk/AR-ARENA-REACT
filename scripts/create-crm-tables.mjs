import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://syxjkircmiwpnpagznay.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MzgyMjIsImV4cCI6MjA1MDAxNDIyMn0.gR8cBI3HN6jkfGV98Eu_oybqJMfKe3vkbWLmCnnrFm8'
);

// Test connection
const { data, error } = await supabase.from('event_codes').select('*').limit(1);
console.log('Connection test:', error ? error.message : 'OK');
console.log('Data:', data);
