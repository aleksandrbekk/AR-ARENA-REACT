// supabase/functions/run-expired-giveaways/index.ts
// Автоматический запуск просроченных розыгрышей
// Вызывается по cron или вручную

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Находим все просроченные активные розыгрыши
    const { data: expiredGiveaways, error: fetchError } = await supabase
      .from('giveaways')
      .select('id, title, end_date')
      .eq('status', 'active')
      .lte('end_date', new Date().toISOString())
      .order('end_date', { ascending: true })

    if (fetchError) {
      throw new Error('Failed to fetch expired giveaways: ' + fetchError.message)
    }

    if (!expiredGiveaways || expiredGiveaways.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No expired giveaways found',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const results: Array<{
      giveaway_id: string
      title: string
      success: boolean
      error?: string
      winners?: string[]
      prizes_distributed?: boolean
    }> = []

    // 2. Обрабатываем каждый розыгрыш
    for (const giveaway of expiredGiveaways) {
      try {
        // Вызываем RPC функцию run_giveaway_draw (генерация + выплата)
        const { data: drawResult, error: drawError } = await supabase
          .rpc('run_giveaway_draw', { p_giveaway_id: giveaway.id })

        if (drawError) {
          results.push({
            giveaway_id: giveaway.id,
            title: giveaway.title,
            success: false,
            error: drawError.message
          })
          continue
        }

        // Проверяем результат
        if (drawResult?.success) {
          results.push({
            giveaway_id: giveaway.id,
            title: giveaway.title,
            success: true,
            winners: drawResult.draw?.stages?.final?.winners || [],
            prizes_distributed: drawResult.prizes?.success || false
          })
        } else {
          results.push({
            giveaway_id: giveaway.id,
            title: giveaway.title,
            success: false,
            error: drawResult?.error || 'Unknown error'
          })
        }

      } catch (err) {
        results.push({
          giveaway_id: giveaway.id,
          title: giveaway.title,
          success: false,
          error: err.message
        })
      }
    }

    // 3. Статистика
    const successCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length

    return new Response(JSON.stringify({
      success: true,
      processed: expiredGiveaways.length,
      success_count: successCount,
      failed_count: failedCount,
      results,
      executed_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Run expired giveaways error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
