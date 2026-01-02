const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://syxjkircmiwpnpagznay.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NDQxMSwiZXhwIjoyMDczMzQwNDExfQ.7ueEYBhFrxKU3_RJi_iJEDj6EQqWBy3gAXiM4YIALqs'
);

async function createTestGiveaway() {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);

  const { data, error } = await supabase
    .from('giveaways')
    .insert({
      title: 'Тестовый розыгрыш 1000 AR',
      description: 'Проверка системы множественных розыгрышей',
      prizes: [{ place: 1, prize_ar: 1000, description: 'Первый приз' }],
      start_date: new Date().toISOString(),
      end_date: endDate.toISOString(),
      is_active: true,
      ticket_packages: { "1": 100, "3": 270, "10": 800, "30": 2100 },
      created_by: '45d4f651-bccc-4176-8907-7c6c2575f019',
      status: 'active'
    })
    .select('id, title, status, created_at, end_date');

  if (error) {
    console.error('Ошибка создания розыгрыша:', error);
    process.exit(1);
  }

  console.log('✅ Тестовый розыгрыш создан:');
  console.log(JSON.stringify(data, null, 2));
}

createTestGiveaway();
