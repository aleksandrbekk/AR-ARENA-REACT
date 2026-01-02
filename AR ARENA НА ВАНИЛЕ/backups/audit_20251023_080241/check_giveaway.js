const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://syxjkircmiwpnpagznay.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NDQxMSwiZXhwIjoyMDczMzQwNDExfQ.7ueEYBhFrxKU3_RJi_iJEDj6EQqWBy3gAXiM4YIALqs'
);

async function checkGiveaway() {
  const { data, error } = await supabase
    .from('giveaways')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Ошибка:', error);
    process.exit(1);
  }

  console.log('📊 РОЗЫГРЫШ #1:');
  console.log('==================');
  console.log('ID:', data.id);
  console.log('Название:', data.title);
  console.log('Описание:', data.description);
  console.log('Статус:', data.status);
  console.log('Активен:', data.is_active);
  console.log('Призы:', JSON.stringify(data.prizes, null, 2));
  console.log('Пакеты билетов:', JSON.stringify(data.ticket_packages, null, 2));
  console.log('Начало:', data.start_date);
  console.log('Окончание:', data.end_date);
  console.log('Участников:', data.total_participants);
  console.log('Билетов в пуле:', data.total_tickets_pool);
}

checkGiveaway();
