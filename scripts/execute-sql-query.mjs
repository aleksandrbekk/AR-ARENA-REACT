// Скрипт для выполнения SQL запроса через Supabase REST API
// Используем встроенный fetch (Node.js 18+)

const supabaseUrl = 'https://syxjkircmiwpnpagznay.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g'

async function executeSQL() {
  console.log('🔍 Проверка статуса проекта Supabase...')
  console.log(`URL: ${supabaseUrl}\n`)
  
  // Сначала проверяем доступность через COUNT запрос
  console.log('📊 Выполняю запрос: SELECT COUNT(*) FROM users')
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/users?select=id&limit=0`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'count=exact'
      }
    })
    
    console.log(`Статус ответа: ${response.status}`)
    console.log(`Content-Range: ${response.headers.get('content-range') || 'не указан'}`)
    
    if (response.status === 200 || response.status === 206) {
      const count = response.headers.get('content-range')?.split('/')[1] || 'неизвестно'
      console.log(`\n✅ Запрос выполнен успешно!`)
      console.log(`📈 Количество пользователей: ${count}`)
      
      // Теперь получаем несколько пользователей
      console.log('\n📋 Получаю первые 5 пользователей...')
      const usersResponse = await fetch(`${supabaseUrl}/rest/v1/users?select=id,telegram_id,ar_balance,bul_balance&limit=5`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      })
      
      if (usersResponse.ok) {
        const users = await usersResponse.json()
        console.log(`✅ Получено пользователей: ${users.length}`)
        if (users.length > 0) {
          console.log('\nПримеры пользователей:')
          users.forEach((user, i) => {
            console.log(`  ${i + 1}. ID: ${user.id}, Telegram ID: ${user.telegram_id || 'N/A'}, AR: ${user.ar_balance || 0}, BUL: ${user.bul_balance || 0}`)
          })
        }
      } else {
        console.error(`❌ Ошибка получения пользователей: ${usersResponse.status}`)
        const errorText = await usersResponse.text()
        console.error(`   Ответ: ${errorText}`)
      }
    } else {
      console.error(`❌ Ошибка: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(`   Ответ: ${errorText}`)
    }
    
  } catch (err) {
    console.error('❌ Критическая ошибка:', err.message)
    
    if (err.code === 'ENOTFOUND' || err.message.includes('getaddrinfo')) {
      console.error('\n❌ DNS не разрешается - проект недоступен!')
      console.log('\n💡 Возможные причины:')
      console.log('   1. Проект Supabase был удален')
      console.log('   2. Проект был переименован (REF изменился)')
      console.log('   3. Проблемы с сетью')
      console.log('\n📋 Что делать:')
      console.log('   1. Откройте https://supabase.com/dashboard')
      console.log('   2. Войдите через GitHub')
      console.log('   3. Найдите проект "LEHA"')
      console.log('   4. Скопируйте новый URL проекта (формат: https://[REF].supabase.co)')
      console.log('   5. Обновите src/lib/supabase.ts с новым URL')
    } else {
      console.error('   Stack:', err.stack)
    }
  }
}

executeSQL().catch(console.error)

