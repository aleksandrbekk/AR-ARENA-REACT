// API для создания и запуска тестового розыгрыша
// ТОЛЬКО ДЛЯ ТЕСТИРОВАНИЯ - удалить после проверки
// Использует полную 4-этапную механику через Edge Function

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
    console.log('Creating test giveaway...');

    // 1. Создаем тестовый розыгрыш
    const now = new Date();
    const endDate = new Date(now.getTime() - 60000).toISOString(); // 1 минуту назад (уже истёк)
    const startDate = new Date(now.getTime() - 86400000).toISOString(); // 1 день назад

    const { data: giveaway, error: giveawayError } = await supabase
      .from('giveaways')
      .insert({
        name: 'Тестовый Розыгрыш',
        main_title: 'Тестовый Розыгрыш AR ARENA',
        subtitle: 'Тест 4-этапной механики',
        description: 'Автоматический тест системы розыгрышей с полной механикой: Tour 1 → Tour 2 → Semifinal → Final',
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
      console.error('Failed to create giveaway:', giveawayError);
      return res.status(500).json({ error: 'Failed to create giveaway', details: giveawayError });
    }

    console.log('Created giveaway:', giveaway.id);

    // 2. Получаем реальных пользователей из базы
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('telegram_id, first_name, username')
      .limit(30);

    if (usersError) {
      console.error('Failed to fetch users:', usersError);
    }

    let ticketCount = 0;
    const tickets = [];

    if (!users || users.length < 5) {
      // Если мало пользователей, создаём билеты с fake user_id
      console.log('Creating tickets for fake users...');
      for (let i = 1; i <= 25; i++) {
        const numTickets = Math.floor(Math.random() * 3) + 1;
        for (let t = 0; t < numTickets; t++) {
          ticketCount++;
          tickets.push({
            giveaway_id: giveaway.id,
            user_id: 100000 + i,
            ticket_number: ticketCount
          });
        }
      }
    } else {
      // Используем реальных пользователей
      console.log(`Creating tickets for ${users.length} real users...`);
      for (const u of users) {
        const numTickets = Math.floor(Math.random() * 3) + 1;
        for (let t = 0; t < numTickets; t++) {
          ticketCount++;
          tickets.push({
            giveaway_id: giveaway.id,
            user_id: u.telegram_id,
            ticket_number: ticketCount
          });
        }
      }
    }

    const { error: ticketsError } = await supabase
      .from('giveaway_tickets')
      .insert(tickets);

    if (ticketsError) {
      console.error('Failed to create tickets:', ticketsError);
      return res.status(500).json({ error: 'Failed to create tickets', details: ticketsError });
    }

    console.log(`Created ${tickets.length} tickets`);

    // 3. Обновляем счётчики в розыгрыше
    const uniqueParticipants = new Set(tickets.map(t => t.user_id)).size;
    await supabase
      .from('giveaways')
      .update({
        total_participants: uniqueParticipants,
        total_tickets_sold: ticketCount
      })
      .eq('id', giveaway.id);

    // 4. Запускаем розыгрыш через Edge Function
    console.log('Calling Edge Function to generate results...');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-giveaway-result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ giveaway_id: giveaway.id })
    });

    const drawResult = await response.json();

    if (!response.ok || !drawResult.success) {
      console.error('Edge Function failed:', drawResult.error);
      return res.status(500).json({
        error: 'Draw generation failed',
        details: drawResult.error,
        giveaway_id: giveaway.id
      });
    }

    console.log('Draw completed successfully!');
    console.log('Winners:', drawResult.winners?.map(w => `${w.place}. ${w.username}`).join(', '));

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
      live_url: `/live/${giveaway.id}`,
      draw_result: {
        total_participants: drawResult.total_participants,
        total_tickets: drawResult.total_tickets,
        winners: drawResult.winners
      },
      stages: {
        tour1_count: drawResult.draw_result?.tour1?.participants?.length || 0,
        tour2_finalists: drawResult.draw_result?.tour2?.finalists?.length || 0,
        semifinal_eliminated: drawResult.draw_result?.semifinal?.eliminated?.length || 0,
        final_turns: drawResult.draw_result?.final?.turns?.length || 0
      },
      final_status: finalGiveaway?.status
    });

  } catch (error) {
    console.error('Test giveaway error:', error);
    return res.status(500).json({ error: error.message });
  }
}
