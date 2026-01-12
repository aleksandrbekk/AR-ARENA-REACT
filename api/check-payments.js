import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // Только для админа
  const adminSecret = req.headers['x-admin-secret']
  if (adminSecret !== 'check-ararena-2026') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Проверяем payment_history
    const { data: payments, error: paymentsError } = await supabase
      .from('payment_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    // 2. Проверяем premium_clients
    const { data: clients, error: clientsError } = await supabase
      .from('premium_clients')
      .select('*')
      .order('last_payment_at', { ascending: false })
      .limit(10)

    // 3. Считаем статистику
    const { count: totalPayments } = await supabase
      .from('payment_history')
      .select('*', { count: 'exact', head: true })

    const { count: totalClients } = await supabase
      .from('premium_clients')
      .select('*', { count: 'exact', head: true })

    // 4. Проверяем платежи за последние 24 часа
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const { data: recentPayments } = await supabase
      .from('payment_history')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })

    // 5. Проверяем платежи за январь 2026
    const { data: januaryPayments } = await supabase
      .from('payment_history')
      .select('amount, currency, source, created_at')
      .gte('created_at', '2026-01-01')
      .lte('created_at', '2026-01-31')

    const januaryStats = {
      count: januaryPayments?.length || 0,
      totalUSD: januaryPayments?.filter(p => p.currency === 'USD').reduce((sum, p) => sum + p.amount, 0) || 0,
      totalRUB: januaryPayments?.filter(p => p.currency === 'RUB').reduce((sum, p) => sum + p.amount, 0) || 0,
      sources: [...new Set(januaryPayments?.map(p => p.source) || [])]
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        totalPayments,
        totalClients,
        recentPaymentsCount: recentPayments?.length || 0,
        january2026: januaryStats
      },
      recentPayments: recentPayments?.slice(0, 5).map(p => ({
        id: p.id,
        telegram_id: p.telegram_id,
        amount: p.amount,
        currency: p.currency,
        source: p.source,
        created_at: p.created_at
      })),
      errors: {
        payments: paymentsError?.message || null,
        clients: clientsError?.message || null
      },
      message: totalPayments === 0
        ? '⚠️ payment_history пустая! Проверьте webhook обработчики'
        : `✅ Найдено ${totalPayments} платежей в БД`
    })
  } catch (error) {
    console.error('Error in check-payments:', error)
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    })
  }
}