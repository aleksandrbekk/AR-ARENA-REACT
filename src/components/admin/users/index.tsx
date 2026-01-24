import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../ToastProvider'
import { useAdminAuth } from '../../../providers/AdminAuthProvider'
import { UsersList } from './UsersList'
import { UserProfile } from './UserProfile'
import type {
  AppUser,
  Transaction,
  UserSkin,
  UserEquipment,
  GiveawayTicket,
  PremiumStatus,
  ActiveGiveaway,
  UsersStats
} from './types'

// ============ ГЛАВНЫЙ КОМПОНЕНТ ============
export function UsersTab() {
  const { showToast } = useToast()
  const { getAuthHeaders } = useAdminAuth()

  // Список юзеров
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [activeGiveaways, setActiveGiveaways] = useState<ActiveGiveaway[]>([])

  // Профиль юзера
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([])
  const [userSkins, setUserSkins] = useState<UserSkin[]>([])
  const [userEquipment, setUserEquipment] = useState<UserEquipment[]>([])
  const [userTickets, setUserTickets] = useState<GiveawayTicket[]>([])
  const [userPremium, setUserPremium] = useState<PremiumStatus | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  // ============ ЗАГРУЗКА ДАННЫХ ============
  useEffect(() => {
    fetchUsers()
    fetchActiveGiveaways()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)

      // Загружаем юзеров
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Подсчитываем билеты для каждого юзера
      const { data: ticketsCounts, error: ticketsError } = await supabase
        .from('giveaway_tickets')
        .select('user_id')

      if (ticketsError) console.error('Error fetching tickets:', ticketsError)

      // Группируем по user_id
      const ticketsMap = new Map<string, number>()
      ticketsCounts?.forEach(t => {
        const count = ticketsMap.get(String(t.user_id)) || 0
        ticketsMap.set(String(t.user_id), count + 1)
      })

      // Добавляем tickets_count к юзерам
      const usersWithTickets = (usersData || []).map(user => ({
        ...user,
        tickets_count: ticketsMap.get(String(user.telegram_id)) || 0
      }))

      setUsers(usersWithTickets)
    } catch (err) {
      console.error('Error fetching users:', err)
      showToast({ variant: 'error', title: 'Ошибка загрузки пользователей' })
    } finally {
      setLoading(false)
    }
  }

  const fetchActiveGiveaways = async () => {
    try {
      const { data, error } = await supabase
        .from('giveaways')
        .select('id, name, main_title')
        .eq('status', 'active')

      if (error) throw error
      setActiveGiveaways((data || []).map(g => ({
        id: g.id,
        name: g.name || g.main_title || 'Без названия'
      })))
    } catch (err) {
      console.error('Error fetching giveaways:', err)
    }
  }

  const loadUserProfile = async (user: AppUser) => {
    setSelectedUser(user)
    setLoadingProfile(true)

    try {
      // Параллельно загружаем все данные профиля
      const [transRes, skinsRes, equipRes, ticketsRes, premiumRes] = await Promise.all([
        // Транзакции (user_id = users.id UUID)
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),

        // Скины (user_id = users.id UUID)
        supabase
          .from('user_skins')
          .select('skin_id, is_equipped, is_active, purchased_at')
          .eq('user_id', user.id),

        // Оборудование фермы (user_id = telegram_id BIGINT)
        supabase
          .from('user_equipment')
          .select('equipment_slug, quantity')
          .eq('user_id', user.telegram_id),

        // Билеты (user_id = telegram_id BIGINT)
        supabase
          .from('giveaway_tickets')
          .select('giveaway_id, ticket_number')
          .eq('user_id', user.telegram_id),

        // Премиум статус (telegram_id)
        supabase
          .from('premium_clients')
          .select('plan, expires_at, in_channel, in_chat, total_paid_usd')
          .eq('telegram_id', user.telegram_id)
          .maybeSingle()
      ])

      setUserTransactions(transRes.data || [])
      setUserSkins(skinsRes.data || [])
      setUserEquipment(equipRes.data || [])
      setUserTickets(ticketsRes.data || [])
      setUserPremium(premiumRes.data || null)

    } catch (err) {
      console.error('Error loading profile:', err)
      showToast({ variant: 'error', title: 'Ошибка загрузки профиля' })
    } finally {
      setLoadingProfile(false)
    }
  }

  // ============ ОПЕРАЦИИ ============
  const handleAdjustBalance = async (currency: 'AR' | 'BUL', amount: number) => {
    if (!selectedUser) return

    try {
      const { data, error } = await supabase.rpc('admin_adjust_balance', {
        p_telegram_id: selectedUser.telegram_id,
        p_currency: currency,
        p_amount: amount
      })

      if (error) throw error

      if (data?.success) {
        showToast({
          variant: 'success',
          title: `${amount > 0 ? '+' : ''}${amount} ${currency}`,
          description: `Новый баланс: ${data.new_balance}`
        })

        // Обновляем юзера в списке и профиле
        const newBalance = data.new_balance
        setUsers(prev => prev.map(u => {
          if (u.telegram_id === selectedUser.telegram_id) {
            return {
              ...u,
              [currency === 'AR' ? 'balance_ar' : 'balance_bul']: newBalance
            }
          }
          return u
        }))

        setSelectedUser(prev => prev ? {
          ...prev,
          [currency === 'AR' ? 'balance_ar' : 'balance_bul']: newBalance
        } : null)

        // Обновляем транзакции
        loadUserProfile(selectedUser)
      } else {
        throw new Error(data?.error || 'Unknown error')
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error adjusting balance:', err)
      showToast({ variant: 'error', title: 'Ошибка', description: errorMessage })
      throw err
    }
  }

  const handleAddTickets = async (giveawayId: string, count: number) => {
    if (!selectedUser) return

    try {
      // Получаем максимальный номер билета для этого розыгрыша
      const { data: maxTicket } = await supabase
        .from('giveaway_tickets')
        .select('ticket_number')
        .eq('giveaway_id', giveawayId)
        .order('ticket_number', { ascending: false })
        .limit(1)
        .single()

      const nextTicketNumber = (maxTicket?.ticket_number || 0) + 1

      // Создаём билеты
      const tickets = []
      for (let i = 0; i < count; i++) {
        tickets.push({
          giveaway_id: giveawayId,
          user_id: parseInt(selectedUser.telegram_id),
          ticket_number: nextTicketNumber + i
        })
      }

      const { error } = await supabase
        .from('giveaway_tickets')
        .insert(tickets)

      if (error) throw error

      showToast({
        variant: 'success',
        title: `Добавлено ${count} билет(ов)`,
        description: `Номера: ${nextTicketNumber} - ${nextTicketNumber + count - 1}`
      })

      // Обновляем данные
      fetchUsers()
      loadUserProfile(selectedUser)

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error adding tickets:', err)
      showToast({ variant: 'error', title: 'Ошибка', description: errorMessage })
      throw err
    }
  }

  const handleSendMessage = async (text: string) => {
    if (!selectedUser || !text.trim()) return

    try {
      const response = await fetch('/api/admin-send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          chatId: selectedUser.telegram_id,
          text: text
        })
      })

      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to send message')

      showToast({ variant: 'success', title: 'Сообщение отправлено' })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error sending message:', err)
      showToast({ variant: 'error', title: 'Ошибка отправки', description: errorMessage })
      throw err
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('telegram_id', selectedUser.telegram_id)

      if (error) throw error

      showToast({ variant: 'success', title: 'Юзер удалён' })
      setSelectedUser(null)
      fetchUsers()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error deleting user:', err)
      showToast({ variant: 'error', title: 'Ошибка удаления', description: errorMessage })
      throw err
    }
  }

  const handleDeleteUsers = async (telegramIds: string[]) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .in('telegram_id', telegramIds)

      if (error) throw error

      showToast({ variant: 'success', title: `Удалено ${telegramIds.length} юзер(ов)` })
      fetchUsers()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error mass deleting:', err)
      showToast({ variant: 'error', title: 'Ошибка удаления', description: errorMessage })
      throw err
    }
  }

  // ============ СТАТИСТИКА ============
  const stats: UsersStats = {
    total: users.length,
    totalAR: users.reduce((sum, u) => sum + (u.balance_ar || 0), 0),
    totalBUL: users.reduce((sum, u) => sum + (u.balance_bul || 0), 0),
    active24h: users.filter(u => {
      if (!u.last_seen_at) return false
      const diff = Date.now() - new Date(u.last_seen_at).getTime()
      return diff < 86400000
    }).length
  }

  // ============ RENDER ============
  if (selectedUser) {
    return (
      <UserProfile
        user={selectedUser}
        transactions={userTransactions}
        skins={userSkins}
        equipment={userEquipment}
        tickets={userTickets}
        premium={userPremium}
        activeGiveaways={activeGiveaways}
        loading={loadingProfile}
        onBack={() => setSelectedUser(null)}
        onAdjustBalance={handleAdjustBalance}
        onAddTickets={handleAddTickets}
        onSendMessage={handleSendMessage}
        onDelete={handleDeleteUser}
        onRefresh={() => loadUserProfile(selectedUser)}
      />
    )
  }

  return (
    <UsersList
      users={users}
      stats={stats}
      loading={loading}
      onSelectUser={loadUserProfile}
      onDeleteUsers={handleDeleteUsers}
    />
  )
}

// Экспорт по умолчанию для обратной совместимости
export default UsersTab
