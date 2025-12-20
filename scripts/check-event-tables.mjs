// Проверка создания таблиц события через REST API
const supabaseUrl = 'https://syxjkircmiwpnpagznay.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g'

async function checkEventTables() {
  console.log('🔍 Проверка таблиц события "Крипто-итоги 2025"...\n')
  
  // Проверяем event_codes
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/event_codes?select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Таблица event_codes существует!')
      console.log(`📊 Записей в таблице: ${data.length}\n`)
      
      if (data.length > 0) {
        console.log('📋 Результат SELECT * FROM event_codes:\n')
        data.forEach((row, i) => {
          console.log(`${i + 1}. Событие:`)
          console.log(`   ID: ${row.id}`)
          console.log(`   Дата события: ${row.event_date}`)
          console.log(`   Секретный код: ${row.digit_1}${row.digit_2}${row.digit_3}${row.digit_4}`)
          console.log(`   Открыто: ${row.digit_1_revealed ? row.digit_1 : '?'}${row.digit_2_revealed ? row.digit_2 : '?'}${row.digit_3_revealed ? row.digit_3 : '?'}${row.digit_4_revealed ? row.digit_4 : '?'}`)
          console.log(`   Колесо активно: ${row.wheel_active}`)
          console.log(`   Создано: ${row.created_at}`)
          console.log('')
        })
      } else {
        console.log('⚠️ Таблица пуста - нужно вставить тестовое событие')
      }
    } else if (response.status === 404) {
      console.log('❌ Таблица event_codes не найдена - SQL еще не выполнен')
    } else {
      const errorText = await response.text()
      console.log(`❌ Ошибка: ${response.status} ${response.statusText}`)
      console.log(`   ${errorText}`)
    }
  } catch (err) {
    console.log(`❌ Ошибка подключения: ${err.message}`)
  }
  
  // Проверяем event_participants
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/event_participants?select=id&limit=0`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'count=exact'
      }
    })
    
    if (response.ok) {
      const count = response.headers.get('content-range')?.split('/')[1] || '0'
      console.log(`✅ Таблица event_participants существует (${count} записей)`)
    } else {
      console.log(`⚠️ Таблица event_participants: ${response.status}`)
    }
  } catch (err) {
    console.log(`⚠️ event_participants: ${err.message}`)
  }
  
  // Проверяем event_promocodes
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/event_promocodes?select=id&limit=0`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'count=exact'
      }
    })
    
    if (response.ok) {
      const count = response.headers.get('content-range')?.split('/')[1] || '0'
      console.log(`✅ Таблица event_promocodes существует (${count} записей)`)
    } else {
      console.log(`⚠️ Таблица event_promocodes: ${response.status}`)
    }
  } catch (err) {
    console.log(`⚠️ event_promocodes: ${err.message}`)
  }
}

checkEventTables().catch(console.error)



