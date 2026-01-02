// supabase/functions/generate-giveaway-result/index.ts
// "МОЗГ" розыгрыша — честный 4-этапный алгоритм определения победителей
// Tour 1 → Tour 2 → Semifinal (Traffic Light) → Final (Battle of Traders)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ==================== TYPES ====================

interface Ticket {
  id: string
  user_id: number | string
  ticket_number: number
  purchased_at: string
}

interface Participant {
  ticket_number: number
  user_id: string
  username: string
}

interface SemifinalSpin {
  spin: number
  ticket: number
  hits: number
}

interface EliminatedPlayer {
  ticket_number: number
  user_id: string
  username: string
  place: number
  hits: number
}

interface FinalTurn {
  turn: number
  player: number
  playerName: string
  result: 'bull' | 'bear'
  bulls: number
  bears: number
}

interface PlayerScore {
  bulls: number
  bears: number
  place: number | null
}

interface Winner {
  place: number
  ticket_number: number
  user_id: string
  username: string
  bulls?: number
  bears?: number
}

interface DrawResult {
  success: boolean
  generated_at: string
  seed: number
  total_participants: number
  total_tickets: number
  tour1: {
    winners: number[]  // 20 ticket numbers
    participants: Participant[]
  }
  tour2: {
    selected_indices: number[]
    finalists: Participant[]  // 5 finalists
  }
  semifinal: {
    spins: SemifinalSpin[]
    eliminated: EliminatedPlayer[]  // 2 eliminated (places 4-5)
    finalists3: Participant[]  // 3 remaining
  }
  final: {
    turn_order: number[]
    turn_order_names: string[]
    turns: FinalTurn[]
    player_scores: PlayerScore[]
  }
  winners: Winner[]  // 5 winners (places 1-5)
}

// ==================== SEEDED RNG ====================

// Детерминированный генератор случайных чисел с seed
class SeededRandom {
  private seed: number
  private counter: number

  constructor(seed: number) {
    this.seed = seed
    this.counter = 0
  }

  next(): number {
    this.counter++
    const x = Math.sin(this.seed + this.counter) * 10000
    return x - Math.floor(x)
  }

  // Перемешивание массива (Fisher-Yates)
  shuffle<T>(array: T[]): T[] {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  // Случайный выбор из массива
  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)]
  }
}

// Конвертация UUID в seed
function hashUUID(uuid: string): number {
  let hash = 0
  const str = String(uuid)
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

// Криптографически безопасный seed (для первичной генерации)
function generateCryptoSeed(): number {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return array[0]
}

// ==================== MAIN HANDLER ====================

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

    console.log(`🎲 Generating draw results for giveaway: ${giveaway_id}`)

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

    // Проверка: результаты уже сгенерированы?
    if (giveaway.draw_results?.success) {
      console.log('⚠️ Draw results already generated for this giveaway')
      return new Response(JSON.stringify({
        success: true,
        already_generated: true,
        draw_result: giveaway.draw_results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (giveaway.status === 'completed') {
      throw new Error('Giveaway already completed')
    }

    // 2. Получить все билеты
    const { data: tickets, error: ticketsError } = await supabase
      .from('giveaway_tickets')
      .select('*')
      .eq('giveaway_id', giveaway_id)
      .order('ticket_number', { ascending: true })

    if (ticketsError) {
      throw new Error('Failed to fetch tickets: ' + ticketsError.message)
    }

    if (!tickets || tickets.length === 0) {
      throw new Error('No tickets found for this giveaway')
    }

    console.log(`📊 Loaded ${tickets.length} tickets`)

    // 3. Получить данные пользователей
    const userIds = [...new Set(tickets.map(t => t.user_id))]
    const { data: users } = await supabase
      .from('users')
      .select('telegram_id, username, first_name')
      .in('telegram_id', userIds)

    const userMap: Record<string, string> = {}
    if (users) {
      users.forEach(u => {
        userMap[u.telegram_id] = u.username || u.first_name || `User${u.telegram_id}`
      })
    }
    console.log(`👥 Loaded ${Object.keys(userMap).length} user profiles`)

    const totalTickets = tickets.length
    const totalParticipants = userIds.length

    // 4. Валидация: минимум 5 уникальных участников
    if (totalParticipants < 5) {
      await supabase
        .from('giveaways')
        .update({
          status: 'cancelled',
          draw_results: {
            success: false,
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

    // 5. Инициализация RNG
    // Используем hash от UUID розыгрыша для детерминированности
    // Добавляем криптографический seed для уникальности каждого запуска
    const baseSeed = hashUUID(giveaway_id)
    const cryptoSeed = generateCryptoSeed()
    const seed = baseSeed ^ cryptoSeed  // XOR для комбинации
    const rng = new SeededRandom(seed)
    console.log(`🎯 Using seed: ${seed}`)

    // ==================== TOUR 1: Select 20 from all tickets ====================
    console.log('\n📍 TOUR 1: Selecting 20 random tickets...')

    const shuffledTickets = rng.shuffle(tickets as Ticket[])
    const tour1Count = Math.min(20, shuffledTickets.length)
    const tour1Tickets = shuffledTickets.slice(0, tour1Count)

    const tour1Participants: Participant[] = tour1Tickets.map(t => ({
      ticket_number: t.ticket_number,
      user_id: String(t.user_id),
      username: userMap[t.user_id] || `User${t.user_id}`
    }))

    console.log(`✅ Tour 1: Selected ${tour1Count} tickets: ${tour1Participants.map(t => t.ticket_number).join(', ')}`)

    // ==================== TOUR 2: Select 5 from 20 (card selection) ====================
    console.log('\n📍 TOUR 2: Selecting 5 finalists...')

    const tour2Indices: number[] = []
    const availableIndices = [...Array(tour1Count).keys()]
    const finalistCount = Math.min(5, tour1Count)

    for (let i = 0; i < finalistCount; i++) {
      const randomIdx = Math.floor(rng.next() * availableIndices.length)
      tour2Indices.push(availableIndices[randomIdx])
      availableIndices.splice(randomIdx, 1)
    }

    const finalists5 = tour2Indices.map(idx => tour1Participants[idx])
    console.log(`✅ Tour 2: Finalists: ${finalists5.map(f => `#${f.ticket_number}`).join(', ')}`)

    // ==================== SEMIFINAL: Traffic Light - eliminate 2 from 5 ====================
    console.log('\n📍 SEMIFINAL: Traffic Light game...')

    const hitCounts: Record<number, number> = {}
    finalists5.forEach(f => hitCounts[f.ticket_number] = 0)

    const semifinalSpins: SemifinalSpin[] = []
    const eliminated: EliminatedPlayer[] = []
    let spinCount = 0
    const maxSpins = 50

    while (eliminated.length < 2 && spinCount < maxSpins) {
      spinCount++

      // Получаем билеты, которые ещё не выбыли
      const availableTickets = Object.keys(hitCounts)
        .filter(t => hitCounts[parseInt(t)] < 3)
        .map(t => parseInt(t))

      if (availableTickets.length === 0) break

      // Случайный "попадание" на один из билетов
      const winnerTicket = rng.pick(availableTickets)
      hitCounts[winnerTicket]++

      semifinalSpins.push({
        spin: spinCount,
        ticket: winnerTicket,
        hits: hitCounts[winnerTicket]
      })

      // 3 попадания = выбывание
      if (hitCounts[winnerTicket] === 3) {
        const place = eliminated.length === 0 ? 5 : 4  // Первый выбывший = 5 место
        const eliminatedPlayer = finalists5.find(f => f.ticket_number === winnerTicket)!

        eliminated.push({
          ...eliminatedPlayer,
          place,
          hits: 3
        })

        console.log(`   🚦 Ticket #${winnerTicket} eliminated (${place}th place)`)
      }
    }

    // Оставшиеся 3 финалиста
    const finalists3 = finalists5.filter(f =>
      !eliminated.some(e => e.ticket_number === f.ticket_number)
    )
    console.log(`✅ Semifinal: Top 3: ${finalists3.map(f => `#${f.ticket_number} (${f.username})`).join(', ')}`)

    // ==================== FINAL: Battle of Traders ====================
    console.log('\n📍 FINAL: Battle of Traders...')

    // Определяем очередность ходов
    const turnOrder: number[] = []
    let remainingPlayers = [0, 1, 2]

    for (let i = 0; i < 3; i++) {
      if (remainingPlayers.length === 1) {
        turnOrder.push(remainingPlayers[0])
      } else {
        const idx = Math.floor(rng.next() * remainingPlayers.length)
        turnOrder.push(remainingPlayers[idx])
        remainingPlayers = remainingPlayers.filter((_, j) => j !== idx)
      }
    }
    console.log(`   Turn order: ${turnOrder.map(i => finalists3[i].username).join(' -> ')}`)

    // Играем
    const playerScores: PlayerScore[] = [
      { bulls: 0, bears: 0, place: null },
      { bulls: 0, bears: 0, place: null },
      { bulls: 0, bears: 0, place: null }
    ]

    const finalTurns: FinalTurn[] = []
    let turnCount = 0
    let currentTurnIndex = 0
    const maxTurns = 100

    // Функция проверки: все места распределены?
    const checkAllPlacesAssigned = () => playerScores.every(s => s.place !== null)

    while (!checkAllPlacesAssigned() && turnCount < maxTurns) {
      turnCount++

      // Находим следующего активного игрока
      let currentPlayer: number | null = null
      let attempts = 0

      while (currentPlayer === null && attempts < 10) {
        const candidate = turnOrder[currentTurnIndex % turnOrder.length]
        if (playerScores[candidate].place === null) {
          currentPlayer = candidate
        }
        currentTurnIndex++
        attempts++
      }

      if (currentPlayer === null) break

      // Крутим рулетку: bull или bear
      const result: 'bull' | 'bear' = rng.next() < 0.5 ? 'bull' : 'bear'

      if (result === 'bull') {
        playerScores[currentPlayer].bulls++
      } else {
        playerScores[currentPlayer].bears++
      }

      finalTurns.push({
        turn: turnCount,
        player: currentPlayer,
        playerName: finalists3[currentPlayer].username,
        result,
        bulls: playerScores[currentPlayer].bulls,
        bears: playerScores[currentPlayer].bears
      })

      // Проверка победы: 3 быка = занял место
      if (playerScores[currentPlayer].bulls === 3) {
        const availablePlaces = [1, 2, 3].filter(p => !playerScores.some(s => s.place === p))
        const wonPlace = availablePlaces[0]
        playerScores[currentPlayer].place = wonPlace
        console.log(`   🏆 ${finalists3[currentPlayer].username} won ${wonPlace}${wonPlace === 1 ? 'st' : wonPlace === 2 ? 'nd' : 'rd'} place (Turn ${turnCount})`)

        // Если остался только один игрок без места — автоматически присваиваем
        const playersWithoutPlace = [0, 1, 2].filter(i => playerScores[i].place === null)
        if (playersWithoutPlace.length === 1) {
          const lastPlayer = playersWithoutPlace[0]
          const lastPlace = [1, 2, 3].find(p => !playerScores.some(s => s.place === p))!
          playerScores[lastPlayer].place = lastPlace
          console.log(`   ✅ ${finalists3[lastPlayer].username} auto-assigned ${lastPlace}rd place`)
        }
      }
    }

    // ==================== BUILD WINNERS ARRAY ====================
    const winners: Winner[] = []

    // Places 1-3 from final
    for (let place = 1; place <= 3; place++) {
      const playerIndex = playerScores.findIndex(s => s.place === place)
      if (playerIndex !== -1) {
        winners.push({
          place,
          ticket_number: finalists3[playerIndex].ticket_number,
          user_id: finalists3[playerIndex].user_id,
          username: finalists3[playerIndex].username,
          bulls: playerScores[playerIndex].bulls,
          bears: playerScores[playerIndex].bears
        })
      }
    }

    // Places 4-5 from semifinal eliminated
    for (const elim of eliminated.sort((a, b) => a.place - b.place)) {
      winners.push({
        place: elim.place,
        ticket_number: elim.ticket_number,
        user_id: elim.user_id,
        username: elim.username
      })
    }

    console.log('\n📝 Final Results:')
    winners.forEach(w => {
      console.log(`   ${w.place}. ${w.username} (Ticket #${w.ticket_number})${w.bulls !== undefined ? ` - ${w.bulls} bulls, ${w.bears} bears` : ''}`)
    })

    // ==================== BUILD DRAW RESULT ====================
    const drawResult: DrawResult = {
      success: true,
      generated_at: new Date().toISOString(),
      seed,
      total_participants: totalParticipants,
      total_tickets: totalTickets,
      tour1: {
        winners: tour1Participants.map(t => t.ticket_number),
        participants: tour1Participants
      },
      tour2: {
        selected_indices: tour2Indices,
        finalists: finalists5
      },
      semifinal: {
        spins: semifinalSpins,
        eliminated,
        finalists3
      },
      final: {
        turn_order: turnOrder,
        turn_order_names: turnOrder.map(i => finalists3[i].username),
        turns: finalTurns,
        player_scores: playerScores
      },
      winners
    }

    // ==================== SAVE TO DATABASE ====================
    console.log('\n💾 Saving results to database...')

    const { error: updateError } = await supabase
      .from('giveaways')
      .update({
        status: 'completed',
        draw_results: drawResult,
        winners: winners.map(w => w.user_id)
      })
      .eq('id', giveaway_id)

    if (updateError) {
      throw new Error('Failed to save results: ' + updateError.message)
    }

    console.log('✅ Draw results saved successfully!')

    return new Response(JSON.stringify({
      success: true,
      giveaway_id,
      total_participants: totalParticipants,
      total_tickets: totalTickets,
      winners: winners.map(w => ({ place: w.place, user_id: w.user_id, username: w.username })),
      draw_result: drawResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Generate giveaway result error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
