// API для создания и запуска тестового розыгрыша
// ТОЛЬКО ДЛЯ ТЕСТИРОВАНИЯ - удалить после проверки
// 2024-12-31

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Создаем тестовый розыгрыш (end_date в прошлом для автозапуска)
    const endDate = new Date(Date.now() - 60000).toISOString(); // 1 минуту назад

    const { data: giveaway, error: giveawayError } = await supabase
      .from('giveaways')
      .insert({
        title: 'Тестовый Новогодний Розыгрыш',
        subtitle: 'Проверка системы розыгрышей',
        description: 'Автоматический тест системы розыгрышей AR ARENA',
        price: 10,
        currency: 'ar',
        jackpot_current_amount: 5000,
        end_date: endDate,
        status: 'active',
        type: 'money',
        prizes: [
          { place: 1, amount: 1000, percentage: 30 },
          { place: 2, amount: 500, percentage: 20 },
          { place: 3, amount: 300, percentage: 15 },
          { place: 4, amount: 200, percentage: 10 },
          { place: 5, amount: 100, percentage: 5 }
        ]
      })
      .select()
      .single();

    if (giveawayError) {
      return res.status(500).json({ error: 'Failed to create giveaway', details: giveawayError });
    }

    console.log('Created giveaway:', giveaway.id);

    // 2. Получаем реальных пользователей из базы для билетов
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('telegram_id, first_name, username')
      .limit(30);

    if (usersError || !users || users.length < 5) {
      // Если мало пользователей, создадим фейковых
      const fakeUsers = [];
      for (let i = 1; i <= 25; i++) {
        fakeUsers.push({
          telegram_id: `test_user_${i}_${Date.now()}`,
          ticket_count: Math.floor(Math.random() * 5) + 1
        });
      }

      // Добавим билеты
      const tickets = fakeUsers.map(u => ({
        giveaway_id: giveaway.id,
        telegram_id: u.telegram_id,
        ticket_count: u.ticket_count
      }));

      const { error: ticketsError } = await supabase
        .from('giveaway_tickets')
        .insert(tickets);

      if (ticketsError) {
        return res.status(500).json({ error: 'Failed to create tickets', details: ticketsError });
      }

      console.log('Created tickets for fake users');
    } else {
      // Используем реальных пользователей
      const tickets = users.map(u => ({
        giveaway_id: giveaway.id,
        telegram_id: u.telegram_id.toString(),
        ticket_count: Math.floor(Math.random() * 5) + 1
      }));

      const { error: ticketsError } = await supabase
        .from('giveaway_tickets')
        .insert(tickets);

      if (ticketsError) {
        return res.status(500).json({ error: 'Failed to create tickets', details: ticketsError });
      }

      console.log('Created tickets for', users.length, 'real users');
    }

    // 3. Запускаем розыгрыш через RPC
    const { data: drawResult, error: drawError } = await supabase.rpc('run_giveaway_draw', {
      p_giveaway_id: giveaway.id
    });

    if (drawError) {
      return res.status(500).json({
        error: 'Failed to run draw',
        details: drawError,
        giveaway_id: giveaway.id,
        note: 'Giveaway created but draw failed. Check RPC function.'
      });
    }

    // 4. Получаем финальное состояние розыгрыша
    const { data: finalGiveaway } = await supabase
      .from('giveaways')
      .select('*')
      .eq('id', giveaway.id)
      .single();

    return res.status(200).json({
      success: true,
      message: 'Test giveaway created and completed!',
      giveaway_id: giveaway.id,
      results_url: `/giveaway/${giveaway.id}/results`,
      draw_result: drawResult,
      final_status: finalGiveaway?.status,
      winners: finalGiveaway?.winners
    });

  } catch (error) {
    console.error('Test giveaway error:', error);
    return res.status(500).json({ error: error.message });
  }
}
