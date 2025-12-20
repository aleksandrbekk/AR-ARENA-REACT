// Скрипт для проверки Supabase и выполнения SQL запроса
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://syxjkircmiwpnpagznay.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g'

async function checkSupabase() {
  console.log('🔍 Проверка подключения к Supabase...')
  console.log(`URL: ${supabaseUrl}`)
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Пробуем выполнить простой запрос
    console.log('\n📊 Выполняю запрос: SELECT COUNT(*) FROM users')
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ Ошибка запроса:', error)
      console.error('   Message:', error.message)
      console.error('   Details:', error.details)
      console.error('   Hint:', error.hint)
      return
    }
    
    console.log('✅ Запрос выполнен успешно!')
    console.log(`📈 Количество пользователей: ${count || 0}`)
    
    // Пробуем получить несколько пользователей для проверки
    console.log('\n📋 Получаю первые 5 пользователей...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, telegram_id, ar_balance, bul_balance')
      .limit(5)
    
    if (usersError) {
      console.error('❌ Ошибка получения пользователей:', usersError)
    } else {
      console.log(`✅ Получено пользователей: ${users?.length || 0}`)
      if (users && users.length > 0) {
        console.log('\nПримеры пользователей:')
        users.forEach((user, i) => {
          console.log(`  ${i + 1}. ID: ${user.id}, Telegram ID: ${user.telegram_id}, AR: ${user.ar_balance}, BUL: ${user.bul_balance}`)
        })
      }
    }
    
  } catch (err) {
    console.error('❌ Критическая ошибка:', err.message)
    console.error('   Stack:', err.stack)
    
    // Проверяем DNS
    console.log('\n🔍 Проверяю DNS...')
    const dns = require('dns').promises
    try {
      const hostname = supabaseUrl.replace('https://', '').replace('/rest/v1', '')
      const addresses = await dns.resolve4(hostname)
      console.log(`✅ DNS разрешен: ${addresses.join(', ')}`)
    } catch (dnsError) {
      console.error(`❌ DNS не разрешается: ${dnsError.message}`)
      console.log('\n💡 Возможные причины:')
      console.log('   1. Проект Supabase был удален')
      console.log('   2. Проект был переименован')
      console.log('   3. Проблемы с сетью')
    }
  }
}

checkSupabase().catch(console.error)

