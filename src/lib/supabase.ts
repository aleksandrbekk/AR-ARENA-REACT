import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Secrets from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

// Создаем клиент с обработкой ошибок
// Если создание клиента падает, создаем его без дополнительных опций
let supabase: SupabaseClient

try {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  })
} catch (error) {
  console.error('Failed to create Supabase client with options, trying without:', error)
  // Если не получилось с опциями, пробуем без них
  try {
    supabase = createClient(supabaseUrl, supabaseKey)
  } catch (fallbackError) {
    console.error('Failed to create Supabase client at all:', fallbackError)
    // В крайнем случае создаем клиент - он будет выбрасывать ошибки при использовании,
    // которые useAuth сможет обработать
    supabase = createClient(supabaseUrl, supabaseKey)
  }
}

export { supabase }
