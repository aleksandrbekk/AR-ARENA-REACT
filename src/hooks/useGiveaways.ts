import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Giveaway } from '../types'
import { useAuth } from './useAuth'

const MOCK_GIVEAWAYS: Giveaway[] = [
  {
    id: 101,
    title: 'Еженедельный Джекпот',
    subtitle: 'Испытай удачу и выиграй гору AR!',
    description: 'Грандиозный розыгрыш.',
    price: 10,
    currency: 'ar',
    jackpot_current_amount: 15000,
    end_date: new Date(Date.now() + 86400000 * 3).toISOString(),
    status: 'active',
    image_url: null,
    winner_id: null
  },
  {
    id: 102,
    title: 'Бычий Раш',
    subtitle: 'Розыгрыш BUL токенов',
    description: 'Быстрая лотерея.',
    price: 500,
    currency: 'bul',
    jackpot_current_amount: 1000000,
    end_date: new Date(Date.now() + 86400000).toISOString(),
    status: 'active',
    image_url: null,
    winner_id: null
  }
]

export function useGiveaways() {
  const { telegramUser } = useAuth()
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getActiveGiveaways = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Temporary: Force Mock Data to ensure UI works
      console.log('Using MOCK data for Giveaways UI')
      setGiveaways(MOCK_GIVEAWAYS)
      
      /*
      const { data, error } = await supabase
        .from('giveaways')
        .select('*')
        .eq('status', 'active')
        .order('end_date', { ascending: true })

      if (error) throw error

      if (!data || data.length === 0) {
        console.log('No giveaways found in DB, using MOCK data')
        setGiveaways(MOCK_GIVEAWAYS)
      } else {
        setGiveaways(data)
      }
      */
    } catch (err: any) {
      console.error('Error fetching giveaways:', err)
      // Fallback to mock on error too for demo
      setGiveaways(MOCK_GIVEAWAYS)
      // setError(err.message) 
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
    getActiveGiveaways,
    buyTickets,
    getMyTickets
  }
}
