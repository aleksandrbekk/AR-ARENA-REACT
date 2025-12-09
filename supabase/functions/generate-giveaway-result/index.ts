// supabase/functions/generate-giveaway-result/index.ts
// "МОЗГ" розыгрыша — честный алгоритм определения победителей

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Ticket {
  id: string
  telegram_id: string
  ticket_number: number
  created_at: string
}

interface Participant {
  telegram_id: string
  ticket_numbers: number[]
  total_tickets: number
}

interface BattleMove {
  round: number
  participant_id: string
  choice: 'bull' | 'bear'
  result: 'win' | 'lose' | 'draw'
}

interface DrawResult {
  generated_at: string
  total_participants: number
  total_tickets: number
  algorithm: string
  seed: string
  stages: {
    qualification: {
      selected_20: string[] // telegram_ids
      selection_indices: number[]
    }
    elimination: {
      finalists_5: string[]
      eliminated_15: string[]
    }
    battle: {
      moves: BattleMove[]
      places: {
        place_1: string
        place_2: string
        place_3: string
        place_4: string
        place_5: string
      }
    }
  }
}

// Криптографически безопасный случайный выбор
function secureRandomInt(max: number): number {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return array[0] % max
}

// Перемешивание массива (Fisher-Yates с крипто)
function secureShuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Генерация уникального seed для аудита
function generateSeed(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

// Генерация битвы между 5 финалистами
function generateBattle(finalists: string[]): { moves: BattleMove[], places: Record<string, string> } {
  const moves: BattleMove[] = []
  let remaining = [...finalists]
  
  // Раунд 1: 5 -> 3 (выбиваем 2)
  const shuffled1 = secureShuffle(remaining)
  const eliminated_round2 = shuffled1.slice(0, 2)
  remaining = shuffled1.slice(2)
  
  // Симуляция боев для визуализации
  let round = 1
  for (const elim of eliminated_round2) {
    const winner = remaining[secureRandomInt(remaining.length)]
    moves.push({
      round,
      participant_id: elim,
      choice: secureRandomInt(2) === 0 ? 'bull' : 'bear',
      result: 'lose'
    })
    moves.push({
      round,
      participant_id: winner,
      choice: secureRandomInt(2) === 0 ? 'bull' : 'bear',
      result: 'win'
    })
    round++
  }
  
  // Финал: распределение 1-2-3 мест
  const finalOrder = secureShuffle(remaining)
  
  // Финальный бой за 1-2 место
  moves.push({
    round: 3,
    participant_id: finalOrder[0],
    choice: 'bull',
    result: 'win'
  })
  moves.push({
    round: 3,
    participant_id: finalOrder[1],
    choice: 'bear',
    result: 'lose'
  })
  
  return {
    moves,
    places: {
      place_1: finalOrder[0],
      place_2: finalOrder[1],
      place_3: finalOrder[2],
      place_4: eliminated_round2[0],
      place_5: eliminated_round2[1]
    }
  }
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { giveaway_id } = await req.json()
    
    if (!giveaway_id) {
      throw new Error('giveaway_id is required')
    }

    // Инициализация Supabase клиента
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Получить розыгрыш
    const { data: giveaway, error: giveawayError } = await supabase
      .from('giveaways')
      .select('*')
      .eq('id', giveaway_id)
      .single()

    if (giveawayError || !giveaway) {
      throw new Error('Giveaway not found')
    }

    if (giveaway.status === 'completed') {
      throw new Error('Giveaway already completed')
    }

    // 2. Snapshot: получить ВСЕХ участников до end_date
    const { data: tickets, error: ticketsError } = await supabase
      .from('giveaway_tickets')
      .select('*')
      .eq('giveaway_id', giveaway_id)
      .lte('created_at', giveaway.end_date)
      .order('ticket_number', { ascending: true })

    if (ticketsError) {
      throw new Error('Failed to fetch tickets: ' + ticketsError.message)
    }

    // Группировка по участникам
    const participantsMap = new Map<string, Participant>()
    for (const ticket of tickets || []) {
      const existing = participantsMap.get(ticket.telegram_id)
      if (existing) {
        existing.ticket_numbers.push(ticket.ticket_number)
        existing.total_tickets++
      } else {
        participantsMap.set(ticket.telegram_id, {
          telegram_id: ticket.telegram_id,
          ticket_numbers: [ticket.ticket_number],
          total_tickets: 1
        })
      }
    }

    const participants = Array.from(participantsMap.values())
    const totalTickets = tickets?.length || 0
    const totalParticipants = participants.length

    // 3. Валидация
    if (totalParticipants < 5) {
      // Розыгрыш не состоялся — возврат средств
      await supabase
        .from('giveaways')
        .update({
          status: 'cancelled',
          draw_results: {
            error: 'NOT_ENOUGH_PARTICIPANTS',
            total_participants: totalParticipants,
            minimum_required: 5
          }
        })
        .eq('id', giveaway_id)

      return new Response(JSON.stringify({
        success: false,
        error: 'Not enough participants',
        total_participants: totalParticipants,
        minimum_required: 5
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // 4. Генерация сценария
    const seed = generateSeed()
    
    // Step 1: Qualification — выбор 20 из всех
    // Каждый билет = 1 шанс, но выбираем уникальных участников
    const allTicketEntries: { telegram_id: string, ticket_number: number }[] = []
    for (const p of participants) {
      for (const tn of p.ticket_numbers) {
        allTicketEntries.push({ telegram_id: p.telegram_id, ticket_number: tn })
      }
    }
    
    const shuffledEntries = secureShuffle(allTicketEntries)
    const selected20Set = new Set<string>()
    const selected20: string[] = []
    const selectionIndices: number[] = []
    
    for (let i = 0; i < shuffledEntries.length && selected20.length < 20; i++) {
      const entry = shuffledEntries[i]
      if (!selected20Set.has(entry.telegram_id)) {
        selected20Set.add(entry.telegram_id)
        selected20.push(entry.telegram_id)
        selectionIndices.push(entry.ticket_number)
      }
    }
    
    // Если участников меньше 20, берем всех
    const actualQualified = selected20.slice(0, Math.min(20, totalParticipants))

    // Step 2: Elimination — из 20 выбираем 5 финалистов
    const shuffled20 = secureShuffle(actualQualified)
    const finalists5 = shuffled20.slice(0, 5)
    const eliminated15 = shuffled20.slice(5)

    // Step 3: Battle — финальная битва
    const battleResult = generateBattle(finalists5)

    // Формируем результат
    const drawResult: DrawResult = {
      generated_at: new Date().toISOString(),
      total_participants: totalParticipants,
      total_tickets: totalTickets,
      algorithm: 'crypto.getRandomValues + Fisher-Yates',
      seed,
      stages: {
        qualification: {
          selected_20: actualQualified,
          selection_indices: selectionIndices.slice(0, actualQualified.length)
        },
        elimination: {
          finalists_5: finalists5,
          eliminated_15: eliminated15
        },
        battle: battleResult
      }
    }

    // 5. Сохранение результатов
    const winners = [
      battleResult.places.place_1,
      battleResult.places.place_2,
      battleResult.places.place_3,
      battleResult.places.place_4,
      battleResult.places.place_5
    ]

    const { error: updateError } = await supabase
      .from('giveaways')
      .update({
        status: 'completed',
        draw_results: drawResult,
        winners: winners
      })
      .eq('id', giveaway_id)

    if (updateError) {
      throw new Error('Failed to save results: ' + updateError.message)
    }

    return new Response(JSON.stringify({
      success: true,
      giveaway_id,
      total_participants: totalParticipants,
      total_tickets: totalTickets,
      winners,
      draw_result: drawResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Generate giveaway result error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
