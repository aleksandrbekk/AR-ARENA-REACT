// Скрипт для проверки восстановленного проекта LEHA
const supabaseUrl = 'https://syxjkircmiwpnpagznay.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g'

async function verifyLehaRestored() {
  console.log('🔍 Проверка восстановленного проекта LEHA в Supabase...\n')
  console.log(`URL: ${supabaseUrl}\n`)
  console.log('═'.repeat(60))
  
  // Функция для выполнения COUNT запроса
  async function getCount(tableName) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=id&limit=0`, {
        method: 'HEAD',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'count=exact'
        }
      })
      
      if (response.status === 200 || response.status === 206) {
        const contentRange = response.headers.get('content-range')
        const count = contentRange ? contentRange.split('/')[1] : '0'
        return { success: true, count: parseInt(count) }
      } else {
        return { success: false, error: `${response.status} ${response.statusText}` }
      }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
  
  // Функция для получения данных
  async function getData(tableName, limit = 3) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?limit=${limit}`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        return { success: true, data }
      } else {
        const errorText = await response.text()
        return { success: false, error: `${response.status} ${response.statusText}: ${errorText}` }
      }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
  
  // 1. SELECT COUNT(*) FROM users;
  console.log('\n📊 1. SELECT COUNT(*) FROM users;')
  const usersCount = await getCount('users')
  if (usersCount.success) {
    console.log(`   ✅ Результат: ${usersCount.count} пользователей`)
  } else {
    console.log(`   ❌ Ошибка: ${usersCount.error}`)
  }
  
  // 2. SELECT COUNT(*) FROM user_equipment;
  console.log('\n📊 2. SELECT COUNT(*) FROM user_equipment;')
  const equipmentCount = await getCount('user_equipment')
  if (equipmentCount.success) {
    console.log(`   ✅ Результат: ${equipmentCount.count} записей`)
  } else {
    console.log(`   ❌ Ошибка: ${equipmentCount.error}`)
  }
  
  // 3. SELECT COUNT(*) FROM user_locations;
  console.log('\n📊 3. SELECT COUNT(*) FROM user_locations;')
  const locationsCount = await getCount('user_locations')
  if (locationsCount.success) {
    console.log(`   ✅ Результат: ${locationsCount.count} записей`)
  } else {
    console.log(`   ❌ Ошибка: ${locationsCount.error}`)
  }
  
  // 4. SELECT * FROM users LIMIT 3;
  console.log('\n📊 4. SELECT * FROM users LIMIT 3;')
  const usersData = await getData('users', 3)
  if (usersData.success) {
    console.log(`   ✅ Получено записей: ${usersData.data.length}`)
    if (usersData.data.length > 0) {
      console.log('\n   Примеры пользователей:')
      usersData.data.forEach((user, i) => {
        console.log(`\n   ${i + 1}. Пользователь:`)
        console.log(`      ID: ${user.id}`)
        console.log(`      Telegram ID: ${user.telegram_id || 'N/A'}`)
        console.log(`      AR Balance: ${user.ar_balance || 0}`)
        console.log(`      BUL Balance: ${user.bul_balance || 0}`)
        if (user.created_at) console.log(`      Created: ${user.created_at}`)
        // Показываем все поля
        const keys = Object.keys(user).filter(k => !['id', 'telegram_id', 'ar_balance', 'bul_balance', 'created_at'].includes(k))
        if (keys.length > 0) {
          keys.forEach(key => {
            console.log(`      ${key}: ${JSON.stringify(user[key])}`)
          })
        }
      })
    } else {
      console.log('   ⚠️ Таблица users пуста')
    }
  } else {
    console.log(`   ❌ Ошибка: ${usersData.error}`)
  }
  
  // Итоговый статус
  console.log('\n' + '═'.repeat(60))
  console.log('\n📋 ИТОГОВЫЙ СТАТУС ПРОЕКТА LEHA:')
  
  const allSuccess = usersCount.success && equipmentCount.success && locationsCount.success && usersData.success
  
  if (allSuccess) {
    console.log('   ✅ Проект работает! Все запросы выполнены успешно.')
    console.log(`\n   📊 Статистика:`)
    console.log(`      • Пользователей: ${usersCount.count}`)
    console.log(`      • Оборудования: ${equipmentCount.count}`)
    console.log(`      • Локаций: ${locationsCount.count}`)
  } else {
    console.log('   ⚠️ Некоторые запросы завершились с ошибками.')
    console.log('   Проверьте доступность таблиц в Supabase Dashboard.')
  }
  
  console.log(`\n   URL проекта: ${supabaseUrl}`)
  console.log('═'.repeat(60) + '\n')
}

verifyLehaRestored().catch(console.error)

