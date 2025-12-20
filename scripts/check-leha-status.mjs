// Скрипт для проверки статуса проекта LEHA и выполнения SQL запроса
const supabaseUrl = 'https://syxjkircmiwpnpagznay.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g'

async function checkLehaStatus() {
  console.log('🔍 Проверка статуса проекта LEHA в Supabase...\n')
  console.log(`URL: ${supabaseUrl}\n`)
  
  try {
    // Выполняем запрос COUNT через REST API
    console.log('📊 Выполняю SQL запрос: SELECT COUNT(*) FROM users')
    
    const response = await fetch(`${supabaseUrl}/rest/v1/users?select=id&limit=0`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'count=exact'
      }
    })
    
    console.log(`\n📈 Статус ответа: ${response.status} ${response.statusText}`)
    
    if (response.status === 200 || response.status === 206) {
      const contentRange = response.headers.get('content-range')
      const count = contentRange ? contentRange.split('/')[1] : 'неизвестно'
      
      console.log(`\n✅ ЗАПРОС ВЫПОЛНЕН УСПЕШНО!`)
      console.log(`📊 Количество пользователей в таблице users: ${count}`)
      
      // Получаем несколько примеров пользователей
      console.log('\n📋 Получаю примеры пользователей...')
      const usersResponse = await fetch(`${supabaseUrl}/rest/v1/users?select=id,telegram_id,ar_balance,bul_balance&limit=5`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      })
      
      if (usersResponse.ok) {
        const users = await usersResponse.json()
        console.log(`✅ Получено примеров: ${users.length}`)
        if (users.length > 0) {
          console.log('\nПримеры пользователей:')
          users.forEach((user, i) => {
            console.log(`  ${i + 1}. ID: ${user.id}, Telegram ID: ${user.telegram_id || 'N/A'}, AR: ${user.ar_balance || 0}, BUL: ${user.bul_balance || 0}`)
          })
        }
      }
      
      console.log(`\n✅ ПРОЕКТ LEHA РАБОТАЕТ!`)
      console.log(`   URL: ${supabaseUrl}`)
      console.log(`   Статус: Доступен`)
      console.log(`   Пользователей: ${count}`)
      
    } else {
      console.error(`\n❌ Ошибка: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(`   Ответ: ${errorText}`)
      
      if (response.status === 404) {
        console.log('\n💡 Возможно, проект был переименован или удален')
        console.log('   Проверьте правильность URL проекта в Supabase Dashboard')
      }
    }
    
  } catch (err) {
    console.error('\n❌ Критическая ошибка:', err.message)
    
    if (err.code === 'ENOTFOUND' || err.message.includes('getaddrinfo')) {
      console.error('\n❌ DNS не разрешается - проект недоступен!')
      console.log('\n💡 Возможные причины:')
      console.log('   1. Проект Supabase был удален')
      console.log('   2. Проект был переименован (REF изменился)')
      console.log('   3. URL проекта изменился')
      console.log('\n📋 Что делать:')
      console.log('   1. Откройте https://supabase.com/dashboard')
      console.log('   2. Найдите проект "LEHA"')
      console.log('   3. Скопируйте новый URL проекта')
      console.log('   4. Обновите src/lib/supabase.ts с новым URL')
    } else {
      console.error('   Stack:', err.stack)
    }
  }
}

checkLehaStatus().catch(console.error)

