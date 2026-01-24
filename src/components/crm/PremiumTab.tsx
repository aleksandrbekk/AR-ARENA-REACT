/**
 * PremiumTab - Вкладка "Premium клиенты" в CRM
 *
 * Функционал:
 * - Статистика доходов по валютам
 * - Фильтры (план, месяц, статус, поиск)
 * - Список клиентов с действиями
 * - Модалки: добавление, редактирование даты, выдача билета
 */

import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import type { PremiumClient, SortByOption, PremiumFilter } from '../../types/crm'

// Типы для модалок
interface TicketTarget {
  id: number
  name: string
}

interface Giveaway {
  id: string
  title: string
  price: number
}

interface PremiumTabProps {
  premiumClients: PremiumClient[]
  getAuthHeaders: () => Record<string, string>
  showToast: (opts: { variant: 'success' | 'error'; title: string }) => void
  onDataChange: () => void // Callback для обновления данных в родителе
}

// Хелперы
const getDaysRemaining = (expiresAt: string): number => {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('ru-RU')

const formatFullDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

const currentMonth = (() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})()

const monthNames: Record<string, string> = {
  '01': 'Январь', '02': 'Февраль', '03': 'Март', '04': 'Апрель',
  '05': 'Май', '06': 'Июнь', '07': 'Июль', '08': 'Август',
  '09': 'Сентябрь', '10': 'Октябрь', '11': 'Ноябрь', '12': 'Декабрь'
}

export function PremiumTab({
  premiumClients,
  getAuthHeaders,
  showToast,
  onDataChange
}: PremiumTabProps) {
  // ============ STATE ============
  // Фильтры
  const [premiumSearch, setPremiumSearch] = useState('')
  const [premiumFilter, setPremiumFilter] = useState<PremiumFilter>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [monthFilter, setMonthFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortByOption>('last_payment')
  const [statsMonth, setStatsMonth] = useState<string>(currentMonth)

  // Выбранный клиент
  const [selectedClient, setSelectedClient] = useState<PremiumClient | null>(null)
  const [showClientModal, setShowClientModal] = useState(false)

  // Модалка добавления клиента
  const [showAddModal, setShowAddModal] = useState(false)
  const [newClientId, setNewClientId] = useState('')
  const [newClientAmount, setNewClientAmount] = useState('')
  const [newClientNoPayment, setNewClientNoPayment] = useState(false)
  const [newClientPeriod, setNewClientPeriod] = useState<'30' | '90' | '180' | '365' | 'custom'>('30')
  const [newClientCustomDate, setNewClientCustomDate] = useState('')
  const [newClientSource, setNewClientSource] = useState<'lava.top' | '0xprocessing' | 'manual'>('manual')
  const [newClientCurrency, setNewClientCurrency] = useState<'RUB' | 'USD' | 'EUR' | 'USDT'>('USDT')
  const [addingClient, setAddingClient] = useState(false)

  // Модалка редактирования даты
  const [showEditDateModal, setShowEditDateModal] = useState(false)
  const [editingDateValue, setEditingDateValue] = useState('')

  // Модалка билета
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [ticketTarget, setTicketTarget] = useState<TicketTarget | null>(null)
  const [activeGiveaways, setActiveGiveaways] = useState<Giveaway[]>([])
  const [selectedGiveawayId, setSelectedGiveawayId] = useState('')
  const [grantingTicket, setGrantingTicket] = useState(false)

  // Invite links
  const [_inviteLinks, setInviteLinks] = useState<{ channelLink: string; chatLink: string } | null>(null)
  const [generatingInvite, setGeneratingInvite] = useState(false)

  // ============ COMPUTED VALUES ============
  const activePremiumCount = premiumClients.filter(c => getDaysRemaining(c.expires_at) > 0).length

  // Уникальные месяцы для фильтра
  const availableMonths = useMemo(() => {
    return [...new Set(
      premiumClients
        .filter(c => c.last_payment_at)
        .map(c => {
          const d = new Date(c.last_payment_at!)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        })
    )].sort().reverse()
  }, [premiumClients])

  const formatMonthLabel = (m: string) => {
    const [year, month] = m.split('-')
    return `${monthNames[month]} ${year}`
  }

  // Фильтрация клиентов
  const filteredClients = useMemo(() => {
    return premiumClients
      .filter(client => {
        const days = getDaysRemaining(client.expires_at)
        if (days <= 0) return false

        if (premiumSearch) {
          const q = premiumSearch.toLowerCase()
          const matchesSearch =
            client.username?.toLowerCase().includes(q) ||
            client.first_name?.toLowerCase().includes(q) ||
            client.telegram_id.toString().includes(q)
          if (!matchesSearch) return false
        }

        if (planFilter !== 'all' && client.plan !== planFilter) return false

        if (monthFilter !== 'all' && client.last_payment_at) {
          const paymentDate = new Date(client.last_payment_at)
          const paymentMonth = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`
          if (paymentMonth !== monthFilter) return false
        }

        if (premiumFilter === 'active' && days <= 7) return false
        if (premiumFilter === 'expiring' && days > 7) return false

        return true
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'last_payment':
            const getDateA = a.last_payment_at ? new Date(a.last_payment_at).getTime() : new Date(a.started_at).getTime()
            const getDateB = b.last_payment_at ? new Date(b.last_payment_at).getTime() : new Date(b.started_at).getTime()
            return getDateB - getDateA
          case 'expires':
            return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
          case 'total_paid':
            return (b.total_paid_usd || 0) - (a.total_paid_usd || 0)
          case 'created':
            return new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
          default:
            return 0
        }
      })
  }, [premiumClients, premiumSearch, premiumFilter, planFilter, monthFilter, sortBy])

  // ============ API FUNCTIONS ============
  const sendMessage = async (telegramId: number, message: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin-send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ chatId: telegramId, text: message })
      })
      const result = await res.json()
      return result.success
    } catch { return false }
  }

  const generateInviteLinks = async (telegramId: number, sendToUser: boolean = false) => {
    try {
      setGeneratingInvite(true)
      const res = await fetch('/api/admin-send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: telegramId, send_to_user: sendToUser })
      })
      const data = await res.json()
      if (data.success) {
        setInviteLinks({ channelLink: data.channelLink, chatLink: data.chatLink })
        if (sendToUser && data.sent) {
          showToast({ variant: 'success', title: 'Ссылки отправлены пользователю' })
        }
        return data
      } else {
        showToast({ variant: 'error', title: data.error || 'Ошибка генерации ссылок' })
        return null
      }
    } catch {
      showToast({ variant: 'error', title: 'Ошибка сети' })
      return null
    } finally {
      setGeneratingInvite(false)
    }
  }

  // ============ CLIENT OPERATIONS ============
  const deleteClient = async (clientId: string, telegramId: number) => {
    if (!confirm(`Удалить клиента ${telegramId} из Premium?`)) return

    try {
      const { error } = await supabase.from('premium_clients').delete().eq('id', clientId)
      if (error) throw error
      setSelectedClient(null)
      setShowClientModal(false)
      showToast({ variant: 'success', title: 'Клиент удалён' })
      onDataChange()
    } catch (err) {
      console.error('Error deleting client:', err)
      showToast({ variant: 'error', title: 'Ошибка удаления' })
    }
  }

  const addBonusDays = async (clientId: string, telegramId: number, days: number) => {
    try {
      const { data, error } = await supabase
        .from('premium_clients')
        .select('expires_at')
        .eq('id', clientId)
        .single()

      if (error) throw error

      const currentExpires = new Date(data.expires_at)
      const now = new Date()
      const baseDate = currentExpires > now ? currentExpires : now
      const newExpires = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000)

      const { error: updateError } = await supabase
        .from('premium_clients')
        .update({ expires_at: newExpires.toISOString() })
        .eq('id', clientId)

      if (updateError) throw updateError

      showToast({ variant: 'success', title: `+${days} дней добавлено` })
      onDataChange()

      // Уведомляем пользователя
      await sendMessage(telegramId, `🎁 Вам начислено ${days} бонусных дней подписки!\n\nНовая дата окончания: ${newExpires.toLocaleDateString('ru-RU')}`)
    } catch (err) {
      console.error('Error adding bonus days:', err)
      showToast({ variant: 'error', title: 'Ошибка добавления дней' })
    }
  }

  const updateExpirationDate = async (clientId: string, newDate: string) => {
    try {
      const newExpires = new Date(newDate)
      newExpires.setHours(23, 59, 59, 999)

      const { error } = await supabase
        .from('premium_clients')
        .update({ expires_at: newExpires.toISOString() })
        .eq('id', clientId)

      if (error) throw error

      showToast({ variant: 'success', title: 'Дата обновлена' })
      setShowEditDateModal(false)
      onDataChange()

      if (selectedClient) {
        sendMessage(selectedClient.telegram_id, `📅 Дата окончания подписки изменена на: ${newExpires.toLocaleDateString('ru-RU')}`)
      }
    } catch (err) {
      console.error('Error updating date:', err)
      showToast({ variant: 'error', title: 'Ошибка обновления даты' })
    }
  }

  const addClient = async () => {
    if (!newClientId.trim()) {
      showToast({ variant: 'error', title: 'Введите Telegram ID или @username' })
      return
    }

    setAddingClient(true)
    try {
      const input = newClientId.trim().replace('@', '')
      const telegramId = parseInt(input, 10)

      // Ищем в bot_users
      const query = isNaN(telegramId)
        ? supabase.from('bot_users').select('*').ilike('username', input).single()
        : supabase.from('bot_users').select('*').eq('telegram_id', telegramId).single()

      const { data: botUser, error: botError } = await query

      if (botError || !botUser) {
        showToast({ variant: 'error', title: 'Пользователь не найден в боте' })
        setAddingClient(false)
        return
      }

      // Проверяем существование
      const exists = premiumClients.find(c => c.telegram_id === botUser.telegram_id)
      if (exists) {
        showToast({ variant: 'error', title: 'Клиент уже существует' })
        setAddingClient(false)
        return
      }

      // Вычисляем даты
      let expiresAt: Date
      if (newClientPeriod === 'custom' && newClientCustomDate) {
        expiresAt = new Date(newClientCustomDate)
      } else {
        const days = parseInt(newClientPeriod, 10)
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      }
      expiresAt.setHours(23, 59, 59, 999)

      // Создаём запись
      const amount = newClientNoPayment ? 0 : (parseFloat(newClientAmount) || 0)
      const { error } = await supabase
        .from('premium_clients')
        .insert({
          telegram_id: botUser.telegram_id,
          username: botUser.username,
          first_name: botUser.first_name,
          plan: newClientPeriod === '30' ? 'classic' : newClientPeriod === '90' ? 'gold' : 'platinum',
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          total_paid_usd: newClientCurrency === 'USDT' ? amount : 0,
          currency: newClientCurrency,
          original_amount: amount,
          payments_count: newClientNoPayment ? 0 : 1,
          last_payment_at: newClientNoPayment ? null : new Date().toISOString(),
          last_payment_method: newClientSource,
          source: newClientSource,
          in_channel: false,
          in_chat: false,
          tags: []
        })
        .select()
        .single()

      if (error) throw error

      showToast({ variant: 'success', title: 'Клиент добавлен' })
      setShowAddModal(false)
      resetAddForm()
      onDataChange()
    } catch (err) {
      console.error('Error adding client:', err)
      showToast({ variant: 'error', title: 'Ошибка добавления' })
    } finally {
      setAddingClient(false)
    }
  }

  const resetAddForm = () => {
    setNewClientId('')
    setNewClientAmount('')
    setNewClientNoPayment(false)
    setNewClientPeriod('30')
    setNewClientCustomDate('')
    setNewClientSource('manual')
    setNewClientCurrency('USDT')
  }

  // ============ TICKET OPERATIONS ============
  const loadActiveGiveaways = async () => {
    try {
      const { data, error } = await supabase
        .from('giveaways')
        .select('id, title, price')
        .eq('status', 'active')
        .order('end_date', { ascending: true })

      if (error) throw error
      setActiveGiveaways(data || [])
      if (data && data.length > 0) setSelectedGiveawayId(data[0].id)
    } catch (err) {
      console.error('Error loading giveaways:', err)
      showToast({ variant: 'error', title: 'Ошибка загрузки розыгрышей' })
    }
  }

  const openTicketModal = (telegramId: number, name: string) => {
    setTicketTarget({ id: telegramId, name })
    loadActiveGiveaways()
    setShowTicketModal(true)
  }

  const handleGrantTicket = async () => {
    if (!selectedGiveawayId || !ticketTarget) return

    setGrantingTicket(true)
    try {
      const { data, error } = await supabase.rpc('admin_add_ticket', {
        p_giveaway_id: selectedGiveawayId,
        p_telegram_id: ticketTarget.id
      })

      if (error) throw error

      if (data?.success) {
        showToast({ variant: 'success', title: `Билет ${data.ticket_number} выдан!` })
        setShowTicketModal(false)
      } else {
        throw new Error(data?.error || 'Unknown error')
      }
    } catch (err: any) {
      console.error('Ticket grant error:', err)
      showToast({ variant: 'error', title: err.message || 'Ошибка выдачи билета' })
    } finally {
      setGrantingTicket(false)
    }
  }

  // ============ HELPERS ============
  const getPremiumInitial = (client: PremiumClient) => (client.first_name || client.username || '?')[0]?.toUpperCase()

  const formatAmount = (client: PremiumClient) => {
    const amount = client.original_amount || 0
    const currency = client.currency || 'RUB'
    const symbols: Record<string, string> = { RUB: '₽', USD: '$', EUR: '€', USDT: 'USDT' }
    return `${amount.toLocaleString('ru-RU')} ${symbols[currency] || currency}`
  }

  // ============ STATS CALCULATION ============
  const stats = useMemo(() => {
    const isCryptoCurrency = (cur: string, source: string) => {
      const c = (cur || '').toUpperCase()
      return c.includes('USDT') || c.includes('USDC') || c.includes('BTC') ||
             c.includes('ETH') || c.includes('TON') || c.includes('CRYPTO') ||
             source === '0xprocessing'
    }
    const isUsdCurrency = (cur: string, source: string) => {
      const c = (cur || '').toUpperCase()
      return c === 'USD' && source !== '0xprocessing'
    }
    const isEurCurrency = (cur: string) => (cur || '').toUpperCase() === 'EUR'
    const isRubCurrency = (cur: string, source: string) => {
      const c = (cur || '').toUpperCase()
      return c === 'RUB' || (!cur && source === 'lava.top')
    }

    let totalRub = 0, totalUsd = 0, totalUsdt = 0, totalEur = 0, paidCount = 0

    const clientsFiltered = statsMonth === 'all'
      ? premiumClients
      : premiumClients.filter(c => {
          if (!c.last_payment_at) return false
          const d = new Date(c.last_payment_at)
          const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          return m === statsMonth
        })

    clientsFiltered.forEach(c => {
      const amount = statsMonth === 'all' ? (c.total_paid_usd || 0) : (c.original_amount || 0)
      const cur = c.currency || ''
      const src = c.source || c.last_payment_method || ''

      if (isCryptoCurrency(cur, src)) totalUsdt += amount
      else if (isUsdCurrency(cur, src)) totalUsd += amount
      else if (isEurCurrency(cur)) totalEur += amount
      else if (isRubCurrency(cur, src)) totalRub += amount
      else if (amount > 0) totalUsdt += amount

      if (amount > 0) paidCount++
    })

    return { totalRub, totalUsd, totalUsdt, totalEur, paidCount }
  }, [premiumClients, statsMonth])

  // ============ RENDER ============
  return (
    <div className="space-y-4">
      {/* Статистика */}
      <div className="bg-zinc-900 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm text-white/40 uppercase tracking-wide">Доход</h3>
          <select
            value={statsMonth}
            onChange={e => setStatsMonth(e.target.value)}
            className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="all">Всё время</option>
            <option value={currentMonth}>Этот месяц</option>
            {availableMonths.filter(m => m !== currentMonth).slice(0, 5).map(m => (
              <option key={m} value={m}>{formatMonthLabel(m)}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {stats.totalUsdt > 0 && (
            <div className="bg-zinc-800/50 rounded-xl p-3">
              <div className="text-white/40 text-xs mb-1">Крипто</div>
              <div className="text-emerald-400 font-bold text-lg">${stats.totalUsdt.toLocaleString('ru-RU')}</div>
            </div>
          )}
          {stats.totalRub > 0 && (
            <div className="bg-zinc-800/50 rounded-xl p-3">
              <div className="text-white/40 text-xs mb-1">Рубли</div>
              <div className="text-blue-400 font-bold text-lg">{stats.totalRub.toLocaleString('ru-RU')} ₽</div>
            </div>
          )}
          {stats.totalUsd > 0 && (
            <div className="bg-zinc-800/50 rounded-xl p-3">
              <div className="text-white/40 text-xs mb-1">USD</div>
              <div className="text-green-400 font-bold text-lg">${stats.totalUsd.toLocaleString('ru-RU')}</div>
            </div>
          )}
          {stats.totalEur > 0 && (
            <div className="bg-zinc-800/50 rounded-xl p-3">
              <div className="text-white/40 text-xs mb-1">EUR</div>
              <div className="text-yellow-400 font-bold text-lg">€{stats.totalEur.toLocaleString('ru-RU')}</div>
            </div>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-sm">
          <span className="text-white/40">Оплат</span>
          <span className="text-white font-medium">{stats.paidCount}</span>
        </div>
      </div>

      {/* Фильтры */}
      <div className="space-y-2">
        {/* Поиск */}
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={premiumSearch}
            onChange={e => setPremiumSearch(e.target.value)}
            placeholder="Поиск..."
            className="w-full pl-12 pr-4 py-3 bg-zinc-900 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>

        {/* Dropdown фильтры */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            className="bg-zinc-900 text-white text-sm rounded-lg px-3 py-2 focus:outline-none min-w-0"
          >
            <option value="all">Все тарифы</option>
            <option value="classic">Classic</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
            <option value="private">Private</option>
          </select>

          <select
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="bg-zinc-900 text-white text-sm rounded-lg px-3 py-2 focus:outline-none min-w-0"
          >
            <option value="all">Все месяцы</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{formatMonthLabel(m)}</option>
            ))}
          </select>

          <select
            value={premiumFilter}
            onChange={e => setPremiumFilter(e.target.value as PremiumFilter)}
            className="bg-zinc-900 text-white text-sm rounded-lg px-3 py-2 focus:outline-none min-w-0"
          >
            <option value="all">Все</option>
            <option value="active">Активные</option>
            <option value="expiring">Истекают</option>
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortByOption)}
            className="bg-zinc-900 text-white text-sm rounded-lg px-3 py-2 focus:outline-none min-w-0"
          >
            <option value="last_payment">По платежу</option>
            <option value="expires">По истечению</option>
            <option value="total_paid">По сумме</option>
            <option value="created">По добавлению</option>
          </select>
        </div>
      </div>

      {/* Кнопка добавления */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-xl active:scale-[0.98] transition-transform"
      >
        + Добавить клиента
      </button>

      {/* Счётчик */}
      <div className="text-sm text-white/40">
        Показано: <span className="text-white">{filteredClients.length}</span> из {activePremiumCount} активных
      </div>

      {/* Список клиентов - гибридные карточки */}
      <div className="space-y-3">
        {filteredClients.slice(0, 100).map((client) => {
          const days = getDaysRemaining(client.expires_at)
          const isExpired = days <= 0

          // Цвет дней
          const getDaysColor = (d: number) => {
            if (d <= 0) return 'text-red-400'
            if (d <= 3) return 'text-red-400'
            if (d <= 7) return 'text-orange-400'
            return 'text-emerald-400'
          }

          // Цвет плана
          const getPlanStyle = (plan: string) => {
            switch (plan?.toLowerCase()) {
              case 'private': return 'bg-purple-500/20 text-purple-400'
              case 'platinum': return 'bg-cyan-500/20 text-cyan-400'
              case 'gold': return 'bg-[#FFD700]/20 text-[#FFD700]'
              default: return 'bg-zinc-700/50 text-white/70'
            }
          }

          return (
            <div
              key={client.id}
              onClick={() => { setSelectedClient(client); setShowClientModal(true) }}
              className={`bg-zinc-900 rounded-2xl p-4 cursor-pointer active:scale-[0.99] transition-transform ${isExpired ? 'opacity-60' : ''}`}
            >
              {/* Шапка: аватар + имя + план + дни */}
              <div className="flex items-center gap-3 mb-3">
                {client.avatar_url ? (
                  <img src={client.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white/60 font-medium">
                    {getPremiumInitial(client)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {client.username ? `@${client.username}` : client.first_name || client.telegram_id}
                  </div>
                  <div className="text-xs text-white/40 font-mono">{client.telegram_id}</div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${getPlanStyle(client.plan)}`}>
                  {client.plan || 'N/A'}
                </div>
                <div className="text-right ml-1">
                  <div className={`text-lg font-bold ${getDaysColor(days)}`}>
                    {isExpired ? 'Истёк' : `${days}д`}
                  </div>
                </div>
              </div>

              {/* Инфо: сумма + дата + статусы */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-white/60">{formatAmount(client)}</span>
                  <span className="text-white/30">до {formatDate(client.expires_at)}</span>
                </div>
                <div className="flex gap-1.5">
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                    client.in_channel ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-white/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${client.in_channel ? 'bg-emerald-400' : 'bg-white/30'}`} />
                    К
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                    client.in_chat ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-white/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${client.in_chat ? 'bg-emerald-400' : 'bg-white/30'}`} />
                    Ч
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {filteredClients.length === 0 && (
          <div className="bg-zinc-900 rounded-2xl py-12 text-center text-white/30">Ничего не найдено</div>
        )}
        {filteredClients.length > 100 && (
          <div className="text-center text-white/30 text-sm py-2">
            Показаны первые 100 из {filteredClients.length}
          </div>
        )}
      </div>

      {/* ============ МОДАЛКИ ============ */}

      {/* Модалка клиента */}
      {showClientModal && selectedClient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-zinc-900 rounded-t-3xl w-full max-w-lg p-6 pb-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {selectedClient.avatar_url ? (
                  <img src={selectedClient.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-white/60 font-bold text-lg">
                    {getPremiumInitial(selectedClient)}
                  </div>
                )}
                <div>
                  <div className="font-bold text-white">
                    {selectedClient.username ? `@${selectedClient.username}` : selectedClient.first_name || 'Без имени'}
                  </div>
                  <div className="text-sm text-white/40">{selectedClient.telegram_id}</div>
                </div>
              </div>
              <button onClick={() => setShowClientModal(false)} className="w-8 h-8 flex items-center justify-center text-white/60 text-2xl">×</button>
            </div>

            {/* Инфо */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-white/40">Тариф</span>
                <span className="text-white font-medium">{selectedClient.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Истекает</span>
                <span className="text-white font-medium">{formatFullDate(selectedClient.expires_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Осталось</span>
                <span className={`font-medium ${getDaysRemaining(selectedClient.expires_at) <= 7 ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {getDaysRemaining(selectedClient.expires_at)} дней
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Оплачено</span>
                <span className="text-white font-medium">{formatAmount(selectedClient)}</span>
              </div>
            </div>

            {/* Действия */}
            <div className="space-y-2">
              <button
                onClick={() => generateInviteLinks(selectedClient.telegram_id, true)}
                disabled={generatingInvite}
                className="w-full py-3 bg-emerald-600 text-white font-medium rounded-xl disabled:opacity-50"
              >
                {generatingInvite ? 'Генерация...' : 'Отправить ссылки'}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => addBonusDays(selectedClient.id, selectedClient.telegram_id, 7)}
                  className="flex-1 py-2 bg-zinc-800 text-white text-sm rounded-xl"
                >
                  +7 дней
                </button>
                <button
                  onClick={() => addBonusDays(selectedClient.id, selectedClient.telegram_id, 30)}
                  className="flex-1 py-2 bg-zinc-800 text-white text-sm rounded-xl"
                >
                  +30 дней
                </button>
                <button
                  onClick={() => {
                    setEditingDateValue(selectedClient.expires_at.split('T')[0])
                    setShowEditDateModal(true)
                  }}
                  className="flex-1 py-2 bg-zinc-800 text-white text-sm rounded-xl"
                >
                  Изменить
                </button>
              </div>

              <button
                onClick={() => openTicketModal(selectedClient.telegram_id, selectedClient.first_name || selectedClient.username || 'Клиент')}
                className="w-full py-3 bg-[#FFD700] text-black font-medium rounded-xl"
              >
                Выдать билет
              </button>

              <button
                onClick={() => deleteClient(selectedClient.id, selectedClient.telegram_id)}
                className="w-full py-3 bg-red-600/20 text-red-400 font-medium rounded-xl"
              >
                Удалить клиента
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка добавления клиента */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-zinc-900 rounded-t-3xl w-full max-w-lg p-6 pb-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Добавить клиента</h3>
              <button onClick={() => { setShowAddModal(false); resetAddForm() }} className="w-8 h-8 flex items-center justify-center text-white/60 text-2xl">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-white/50 text-sm mb-2 block">Telegram ID или @username</label>
                <input
                  type="text"
                  value={newClientId}
                  onChange={e => setNewClientId(e.target.value)}
                  placeholder="123456789 или @username"
                  className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                />
              </div>

              <div>
                <label className="text-white/50 text-sm mb-2 block">Период</label>
                <select
                  value={newClientPeriod}
                  onChange={e => setNewClientPeriod(e.target.value as typeof newClientPeriod)}
                  className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none"
                >
                  <option value="30">1 месяц (Classic)</option>
                  <option value="90">3 месяца (Gold)</option>
                  <option value="180">6 месяцев (Platinum)</option>
                  <option value="365">12 месяцев</option>
                  <option value="custom">Своя дата</option>
                </select>
              </div>

              {newClientPeriod === 'custom' && (
                <div>
                  <label className="text-white/50 text-sm mb-2 block">Дата окончания</label>
                  <input
                    type="date"
                    value={newClientCustomDate}
                    onChange={e => setNewClientCustomDate(e.target.value)}
                    className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="noPayment"
                  checked={newClientNoPayment}
                  onChange={e => setNewClientNoPayment(e.target.checked)}
                  className="w-5 h-5 accent-[#FFD700]"
                />
                <label htmlFor="noPayment" className="text-white/70">Без оплаты (подарок)</label>
              </div>

              {!newClientNoPayment && (
                <>
                  <div>
                    <label className="text-white/50 text-sm mb-2 block">Сумма</label>
                    <input
                      type="number"
                      value={newClientAmount}
                      onChange={e => setNewClientAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    {(['USDT', 'RUB', 'USD', 'EUR'] as const).map(cur => (
                      <button
                        key={cur}
                        onClick={() => setNewClientCurrency(cur)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${newClientCurrency === cur ? 'bg-[#FFD700] text-black' : 'bg-zinc-800 text-white/60'}`}
                      >
                        {cur}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-white/50 text-sm mb-2 block">Источник</label>
                    <select
                      value={newClientSource}
                      onChange={e => setNewClientSource(e.target.value as typeof newClientSource)}
                      className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none"
                    >
                      <option value="manual">Вручную</option>
                      <option value="lava.top">Lava.top</option>
                      <option value="0xprocessing">0xProcessing</option>
                    </select>
                  </div>
                </>
              )}

              <button
                onClick={addClient}
                disabled={addingClient || !newClientId.trim()}
                className="w-full py-4 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-xl disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                {addingClient ? 'Добавление...' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка редактирования даты */}
      {showEditDateModal && selectedClient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-sm p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Изменить дату окончания</h3>
            <p className="text-white/40 text-sm mb-4">
              Текущая дата: {formatFullDate(selectedClient.expires_at)}
            </p>
            <input
              type="date"
              value={editingDateValue}
              onChange={e => setEditingDateValue(e.target.value)}
              className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowEditDateModal(false)}
                className="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-medium"
              >
                Отмена
              </button>
              <button
                onClick={() => updateExpirationDate(selectedClient.id, editingDateValue)}
                className="flex-1 py-3 bg-[#FFD700] text-black rounded-xl font-bold"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка выдачи билета */}
      {showTicketModal && ticketTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-[60]">
          <div className="bg-zinc-900 rounded-t-3xl w-full max-w-lg p-6 pb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Выдать билет</h3>
              <button onClick={() => setShowTicketModal(false)} className="w-8 h-8 flex items-center justify-center text-white/60 text-2xl">×</button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-white/50 text-sm mb-2 block">Пользователь</label>
                <div className="text-white font-medium text-lg">{ticketTarget.name}</div>
                <div className="text-white/40 text-sm">{ticketTarget.id}</div>
              </div>

              <div>
                <label className="text-white/50 text-sm mb-2 block">Выберите розыгрыш</label>
                {activeGiveaways.length === 0 ? (
                  <div className="text-white/30 italic">Нет активных розыгрышей</div>
                ) : (
                  <div className="space-y-2">
                    {activeGiveaways.map(g => (
                      <label
                        key={g.id}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                          selectedGiveawayId === g.id
                            ? 'bg-[#FFD700]/10 border-[#FFD700] text-white'
                            : 'bg-zinc-800 border-transparent text-white/60 hover:bg-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            checked={selectedGiveawayId === g.id}
                            onChange={() => setSelectedGiveawayId(g.id)}
                            className="accent-[#FFD700] w-5 h-5"
                          />
                          <div className="font-medium">{g.title}</div>
                        </div>
                        <div className="text-sm bg-zinc-900 px-2 py-1 rounded text-white/40">{g.price} AR</div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleGrantTicket}
                disabled={grantingTicket || activeGiveaways.length === 0}
                className="w-full py-4 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-xl disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                {grantingTicket ? 'Выдача...' : 'Выдать билет бесплатно'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
