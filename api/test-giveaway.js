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
    // 1. Создаем тестовый розыгрыш с правильной структурой таблицы
    const now = new Date();
    const endDate = new Date(now.getTime() - 60000).toISOString(); // 1 минуту назад
    const startDate = new Date(now.getTime() - 86400000).toISOString(); // 1 день назад

    const { data: giveaway, error: giveawayError } = await supabase
      .from('giveaways')
      .insert({
        name: 'Тестовый Новогодний Розыгрыш',
        description: 'Автоматический тест системы розыгрышей AR ARENA',
        type: 'money',
        status: 'active',
        start_date: startDate,
        end_date: endDate,
        prices: { ar: 10, bul: 100 },
        prizes: [
          { place: 1, amount: 1000, percentage: 30 },
          { place: 2, amount: 500, percentage: 20 },
          { place: 3, amount: 300, percentage: 15 },
          { place: 4, amount: 200, percentage: 10 },
          { place: 5, amount: 100, percentage: 5 }
        ],
        requirements: {},
        is_recurring: false,
        vip_enabled: false
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

    let ticketCount = 0;

    if (usersError || !users || users.length < 5) {
      // Если мало пользователей, создадим билеты с fake user_id
      const tickets = [];
      for (let i = 1; i <= 25; i++) {
        const numTickets = Math.floor(Math.random() * 3) + 1;
        for (let t = 0; t < numTickets; t++) {
          tickets.push({
            giveaway_id: giveaway.id,
            user_id: 100000 + i,
            ticket_number: ticketCount + t + 1
          });
        }
        ticketCount += numTickets;
      }

      const { error: ticketsError } = await supabase
        .from('giveaway_tickets')
        .insert(tickets);

      if (ticketsError) {
        return res.status(500).json({ error: 'Failed to create tickets', details: ticketsError });
      }

      console.log('Created', tickets.length, 'tickets for fake users');
    } else {
      // Используем реальных пользователей
      const tickets = [];
      for (const u of users) {
        const numTickets = Math.floor(Math.random() * 3) + 1;
        for (let t = 0; t < numTickets; t++) {
          tickets.push({
            giveaway_id: giveaway.id,
            user_id: u.telegram_id,
            ticket_number: ticketCount + t + 1
          });
        }
        ticketCount += numTickets;
      }

      const { error: ticketsError } = await supabase
        .from('giveaway_tickets')
        .insert(tickets);

      if (ticketsError) {
        return res.status(500).json({ error: 'Failed to create tickets', details: ticketsError });
      }

      console.log('Created', tickets.length, 'tickets for', users.length, 'real users');
    }

    // 3. Обновляем счётчики в розыгрыше
    await supabase
      .from('giveaways')
      .update({
        total_participants: users?.length || 25,
        total_tickets_sold: ticketCount
      })
      .eq('id', giveaway.id);

    // 4. Запускаем розыгрыш через RPC (если есть)
    let drawResult = null;
    let drawError = null;

    try {
      const result = await supabase.rpc('run_giveaway_draw', {
        p_giveaway_id: giveaway.id
      });
      drawResult = result.data;
      drawError = result.error;
    } catch (e) {
      console.log('RPC run_giveaway_draw not available, running manual draw');

      // Ручной розыгрыш: выбираем 5 случайных победителей
      const { data: allTickets } = await supabase
        .from('giveaway_tickets')
        .select('user_id')
        .eq('giveaway_id', giveaway.id);

      if (allTickets && allTickets.length > 0) {
        // Перемешиваем и берём 5 уникальных
        const shuffled = allTickets.sort(() => Math.random() - 0.5);
        const uniqueWinners = [...new Set(shuffled.map(t => t.user_id.toString()))].slice(0, 5);

        await supabase
          .from('giveaways')
          .update({
            status: 'completed',
            winners: uniqueWinners
          })
          .eq('id', giveaway.id);

        drawResult = { manual: true, winners: uniqueWinners };
      }
    }

    if (drawError) {
      // Если RPC не сработал, делаем ручной розыгрыш
      console.log('RPC failed, doing manual draw:', drawError.message);

      const { data: allTickets } = await supabase
        .from('giveaway_tickets')
        .select('user_id')
        .eq('giveaway_id', giveaway.id);

      if (allTickets && allTickets.length > 0) {
        const shuffled = allTickets.sort(() => Math.random() - 0.5);
        const uniqueWinners = [...new Set(shuffled.map(t => t.user_id.toString()))].slice(0, 5);

        await supabase
          .from('giveaways')
          .update({
            status: 'completed',
            winners: uniqueWinners
          })
          .eq('id', giveaway.id);

        drawResult = { manual: true, winners: uniqueWinners };
      }
    }

    // 5. Получаем финальное состояние розыгрыша
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
      winners: finalGiveaway?.winners,
      total_tickets: ticketCount
    });

  } catch (error) {
    console.error('Test giveaway error:', error);
    return res.status(500).json({ error: error.message });
  }
}
