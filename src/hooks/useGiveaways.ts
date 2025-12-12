import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Giveaway } from '../types'
import { useAuth } from './useAuth'

export function useGiveaways() {
  const { telegramUser } = useAuth()
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getGiveaways = useCallback(async (status: 'active' | 'completed' = 'active') => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('giveaways')
        .select('*')
        .eq('status', status)
        .order('end_date', { ascending: status === 'active' })

      if (fetchError) throw fetchError

      setGiveaways(data || [])
    } catch (err: any) {
      console.error('Error fetching giveaways:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const buyTickets = useCallback(async (giveawayId: number, count: number) => {
    if (!telegramUser?.id) throw new Error('User not authenticated')

    try {
      const { data, error } = await supabase.rpc('buy_giveaway_ticket_v2', {
        p_telegram_id: telegramUser.id,
        p_giveaway_id: giveawayId,
        p_count: count
      })

      if (error) throw error

      return data
    } catch (err: any) {
      console.error('Error buying tickets:', err)
      throw err
    }
  }, [telegramUser])

  const getMyTickets = useCallback(async (giveawayId: number) => {
    if (!telegramUser?.id) return 0

    try {
      const { count, error } = await supabase
        .from('giveaway_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('giveaway_id', giveawayId)
        .eq('user_id', telegramUser.id)

      if (error) throw error

      return count || 0
    } catch (err: any) {
      console.error('Error fetching tickets:', err)
      return 0
    }
  }, [telegramUser])

  return {
    giveaways,
    loading,
    error,
    getGiveaways,
    buyTickets,
    getMyTickets
  }
}

