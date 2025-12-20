// Выполнение SQL миграции через Supabase REST API
// Для создания таблиц используем прямой SQL через Supabase Dashboard
// Этот скрипт только проверяет результат

const supabaseUrl = 'https://syxjkircmiwpnpagznay.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g'

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  SQL миграция для события "Крипто-итоги 2025"               ║
╚══════════════════════════════════════════════════════════════╝

⚠️  Для выполнения SQL миграции нужен прямой доступ к БД.

📋 ИНСТРУКЦИЯ:

1. Откройте Supabase Dashboard:
   https://supabase.com/dashboard/project/syxjkircmiwpnpagznay

2. Перейдите в SQL Editor

3. Скопируйте и выполните SQL из файла:
   supabase/migrations/20251219_event_crypto_2025.sql
   
   ИЛИ выполните SQL из скрипта scripts/execute-event-sql.mjs
   (блок SQL_MIGRATION, строки 8-258)

4. После выполнения проверьте результат:
   SELECT * FROM event_codes;

`)

// Проверяем текущий статус
async function checkStatus() {
  console.log('🔍 Проверка текущего статуса...\n')
  
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
      console.log(`📊 Записей: ${data.length}\n`)
      
      if (data.length > 0) {
        console.log('📋 Результат SELECT * FROM event_codes:\n')
        data.forEach((row, i) => {
          console.log(`${i + 1}. Событие:`)
          console.log(`   ID: ${row.id}`)
          console.log(`   Дата: ${row.event_date}`)
          console.log(`   Код: ${row.digit_1}${row.digit_2}${row.digit_3}${row.digit_4}`)
          console.log(`   Открыто: ${row.digit_1_revealed ? row.digit_1 : '?'}${row.digit_2_revealed ? row.digit_2 : '?'}${row.digit_3_revealed ? row.digit_3 : '?'}${row.digit_4_revealed ? row.digit_4 : '?'}`)
          console.log(`   Колесо: ${row.wheel_active ? 'активно' : 'неактивно'}`)
          console.log(`   Создано: ${row.created_at}\n`)
        })
      }
    } else if (response.status === 404) {
      console.log('❌ Таблица event_codes не найдена')
      console.log('   Выполните SQL миграцию в Supabase SQL Editor\n')
    } else {
      const errorText = await response.text()
      console.log(`❌ Ошибка: ${response.status}`)
      console.log(`   ${errorText}\n`)
    }
  } catch (err) {
    console.log(`❌ Ошибка подключения: ${err.message}\n`)
  }
}

checkStatus().catch(console.error)



