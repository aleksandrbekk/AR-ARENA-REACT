// supabase/functions/run-expired-giveaways/index.ts
// Автоматический запуск просроченных розыгрышей
// Вызывается по cron каждые 5 минут или вручную

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://ar-arena.games',
  'https://www.ar-arena.games',
  'https://ar-arena-react.vercel.app'
]

function getCorsHeaders(origin: string | null) {
  const corsOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

interface GiveawayResult {
  giveaway_id: string
  name: string
  success: boolean
  error?: string
  winners?: Array<{ place: number; username: string }>
  total_participants?: number
  total_tickets?: number
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'))

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('🔄 Starting expired giveaways check...')

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Находим все просроченные активные розыгрыши
    const now = new Date().toISOString()
    const { data: expiredGiveaways, error: fetchError } = await supabase
      .from('giveaways')
      .select('id, name, main_title, end_date')
      .eq('status', 'active')
      .lte('end_date', now)
      .order('end_date', { ascending: true })

    if (fetchError) {
      throw new Error('Failed to fetch expired giveaways: ' + fetchError.message)
    }

    if (!expiredGiveaways || expiredGiveaways.length === 0) {
      console.log('✅ No expired giveaways found')
      return new Response(JSON.stringify({
        success: true,
        message: 'No expired giveaways found',
        processed: 0,
        executed_at: now,
        duration_ms: Date.now() - startTime
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📋 Found ${expiredGiveaways.length} expired giveaways`)

    const results: GiveawayResult[] = []

    // 2. Обрабатываем каждый розыгрыш
    for (const giveaway of expiredGiveaways) {
      const giveawayName = giveaway.main_title || giveaway.name
      console.log(`\n🎲 Processing: ${giveawayName} (${giveaway.id})`)

      try {
        // Вызываем Edge Function generate-giveaway-result
        const response = await fetch(`${supabaseUrl}/functions/v1/generate-giveaway-result`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ giveaway_id: giveaway.id })
        })

        const drawResult = await response.json()

        if (!response.ok || !drawResult.success) {
          console.log(`❌ Failed: ${drawResult.error || 'Unknown error'}`)
          results.push({
            giveaway_id: giveaway.id,
            name: giveawayName,
            success: false,
            error: drawResult.error || 'Unknown error'
          })
          continue
        }

        console.log(`✅ Success! Winners: ${drawResult.winners?.map((w: { username: string }) => w.username).join(', ')}`)

        results.push({
          giveaway_id: giveaway.id,
          name: giveawayName,
          success: true,
          winners: drawResult.winners,
          total_participants: drawResult.total_participants,
          total_tickets: drawResult.total_tickets
        })

        // Распределяем призы победителям
        await distributePrizes(supabase, giveaway.id, drawResult.draw_result)

      } catch (err) {
        console.log(`❌ Exception: ${err.message}`)
        results.push({
          giveaway_id: giveaway.id,
          name: giveawayName,
          success: false,
          error: err.message
        })
      }
    }

    // 3. Статистика
    const successCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length
    const duration = Date.now() - startTime

    console.log(`\n📊 Completed: ${successCount} success, ${failedCount} failed (${duration}ms)`)

    return new Response(JSON.stringify({
      success: true,
      processed: expiredGiveaways.length,
      success_count: successCount,
      failed_count: failedCount,
      results,
      executed_at: now,
      duration_ms: duration
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Run expired giveaways error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      duration_ms: Date.now() - startTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

// Распределение призов победителям
async function distributePrizes(
  supabase: ReturnType<typeof createClient>,
  giveawayId: string,
  drawResult: { winners?: Array<{ place: number; user_id: string; username: string }> }
) {
  if (!drawResult?.winners || drawResult.winners.length === 0) {
    console.log('   No winners to distribute prizes to')
    return
  }

  try {
    // Получаем информацию о призах розыгрыша
    const { data: giveaway, error: giveawayError } = await supabase
      .from('giveaways')
      .select('prizes, jackpot_current_amount')
      .eq('id', giveawayId)
      .single()

    if (giveawayError || !giveaway) {
      console.log('   Could not fetch giveaway prizes:', giveawayError?.message)
      return
    }

    const prizes = giveaway.prizes as Array<{ place: number; amount?: number; percentage?: number }> || []
    const jackpot = giveaway.jackpot_current_amount || 0

    // Начисляем призы каждому победителю
    for (const winner of drawResult.winners) {
      const prizeInfo = prizes.find(p => p.place === winner.place)
      if (!prizeInfo) continue

      // Рассчитываем сумму приза
      let prizeAmount = 0
      if (prizeInfo.amount) {
        prizeAmount = prizeInfo.amount
      } else if (prizeInfo.percentage && jackpot > 0) {
        prizeAmount = Math.floor(jackpot * prizeInfo.percentage / 100)
      }

      if (prizeAmount > 0) {
        // Начисляем AR на баланс победителя
        const { error: updateError } = await supabase.rpc('add_balance', {
          p_telegram_id: parseInt(winner.user_id),
          p_amount_ar: prizeAmount,
          p_amount_bul: 0
        })

        if (updateError) {
          console.log(`   Failed to add prize for ${winner.username}:`, updateError.message)
        } else {
          console.log(`   💰 ${winner.username} (place ${winner.place}): +${prizeAmount} AR`)
        }
      }
    }

  } catch (err) {
    console.log('   Prize distribution error:', err.message)
  }
}
