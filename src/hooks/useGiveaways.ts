import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Giveaway, GiveawayWithStats } from '../types'
import { useAuth } from './useAuth'

export function useGiveaways() {
  const { telegramUser } = useAuth()
  const [giveaways, setGiveaways] = useState<GiveawayWithStats[]>([])
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

      // Получаем статистику для каждого розыгрыша
      const giveawaysWithStats: GiveawayWithStats[] = await Promise.all(
        (data || []).map(async (g: Giveaway) => {
          const stats = await getGiveawayStats(g.id)
          return { ...g, ...stats }
        })
      )

      setGiveaways(giveawaysWithStats)
    } catch (err: any) {
      console.error('Error fetching giveaways:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const getGiveawayStats = useCallback(async (giveawayId: number) => {
    try {
      // Получаем количество уникальных участников
      const { data: ticketData, error: ticketError } = await supabase
        .from('giveaway_tickets')
        .select('telegram_id')
        .eq('giveaway_id', giveawayId)

      if (ticketError) throw ticketError

      // Подсчитываем уникальных участников
      const uniqueParticipants = new Set(ticketData?.map(t => t.telegram_id) || [])
      const totalTickets = ticketData?.length || 0

      return {
        participants_count: uniqueParticipants.size,
        total_tickets: totalTickets
      }
    } catch (err) {
      console.error('Error fetching giveaway stats:', err)
      return { participants_count: 0, total_tickets: 0 }
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

  // Получить историю участий пользователя
  const getMyGiveawayHistory = useCallback(async () => {
    if (!telegramUser?.id) return []

    try {
      // Получаем все билеты пользователя
      const { data: tickets, error: ticketsError } = await supabase
        .from('giveaway_tickets')
        .select('giveaway_id, ticket_count, created_at')
        .eq('telegram_id', telegramUser.id.toString())

      if (ticketsError) throw ticketsError

      if (!tickets || tickets.length === 0) return []

      // Получаем уникальные ID розыгрышей
      const giveawayIds = [...new Set(tickets.map(t => t.giveaway_id))]

      // Получаем информацию о розыгрышах
      const { data: giveawaysData, error: giveawaysError } = await supabase
        .from('giveaways')
        .select('*')
        .in('id', giveawayIds)
        .order('end_date', { ascending: false })

      if (giveawaysError) throw giveawaysError

      // Объединяем данные
      return (giveawaysData || []).map(g => {
        const userTickets = tickets
          .filter(t => t.giveaway_id === g.id)
          .reduce((sum, t) => sum + (t.ticket_count || 1), 0)

        // Проверяем, выиграл ли пользователь
        const isWinner = g.winners?.includes(telegramUser.id.toString())
        const winnerPlace = isWinner
          ? g.winners?.indexOf(telegramUser.id.toString()) + 1
          : null

        return {
          ...g,
          my_tickets: userTickets,
          is_winner: isWinner,
          winner_place: winnerPlace
        }
      })
    } catch (err) {
      console.error('Error fetching giveaway history:', err)
      return []
    }
  }, [telegramUser])

  return {
    giveaways,
    loading,
    error,
    getGiveaways,
    getGiveawayStats,
    buyTickets,
    getMyTickets,
    getMyGiveawayHistory
  }
}

