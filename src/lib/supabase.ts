import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://syxjkircmiwpnpagznay.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g'

// Создаем клиент с обработкой ошибок
// Если создание клиента падает, создаем его без дополнительных опций
let supabase: ReturnType<typeof createClient>

try {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
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
