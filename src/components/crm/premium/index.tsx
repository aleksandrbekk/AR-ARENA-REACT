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
import { supabase } from '../../../lib/supabase'
import type {
  PremiumClient,
  PremiumTabProps,
  PremiumStats as Stats,
  SortByOption,
  PremiumFilter,
  Giveaway,
  TicketTarget
} from './types'
import { getDaysRemaining, currentMonth } from './helpers'
import { PremiumStats } from './PremiumStats'
import { PremiumFilters } from './PremiumFilters'
import { ClientList } from './ClientList'
import {
  ClientModal,
  AddClientModal,
  EditDateModal,
  PaymentsModal,
  TicketModal
} from './ClientModals'

// ============ КОМПОНЕНТ ============
export function PremiumTab({
  premiumClients,
  paymentHistory,
  getAuthHeaders,
  showToast,
  onDataChange
}: PremiumTabProps) {
  // ============ STATE: ФИЛЬТРЫ ============
  const [premiumSearch, setPremiumSearch] = useState('')
  const [premiumFilter, setPremiumFilter] = useState<PremiumFilter>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [monthFilter, setMonthFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortByOption>('last_payment')
  const [statsMonth, setStatsMonth] = useState<string>(currentMonth)

  // ============ STATE: ВЫБРАННЫЙ КЛИЕНТ ============
  const [selectedClient, setSelectedClient] = useState<PremiumClient | null>(null)
  const [showClientModal, setShowClientModal] = useState(false)

  // ============ STATE: ДОБАВЛЕНИЕ КЛИЕНТА ============
  const [showAddModal, setShowAddModal] = useState(false)
  const [newClientId, setNewClientId] = useState('')
  const [newClientAmount, setNewClientAmount] = useState('')
  const [newClientNoPayment, setNewClientNoPayment] = useState(false)
  const [newClientPeriod, setNewClientPeriod] = useState<'30' | '90' | '180' | '365' | 'custom'>('30')
  const [newClientCustomDate, setNewClientCustomDate] = useState('')
  const [newClientSource, setNewClientSource] = useState<'lava.top' | '0xprocessing' | 'manual'>('manual')
  const [newClientCurrency, setNewClientCurrency] = useState<'RUB' | 'USD' | 'EUR' | 'USDT'>('USDT')
  const [addingClient, setAddingClient] = useState(false)

  // ============ STATE: РЕДАКТИРОВАНИЕ ДАТЫ ============
  const [showEditDateModal, setShowEditDateModal] = useState(false)
  const [editingDateValue, setEditingDateValue] = useState('')

  // ============ STATE: БИЛЕТЫ ============
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [ticketTarget, setTicketTarget] = useState<TicketTarget | null>(null)
  const [activeGiveaways, setActiveGiveaways] = useState<Giveaway[]>([])
  const [selectedGiveawayId, setSelectedGiveawayId] = useState('')
  const [grantingTicket, setGrantingTicket] = useState(false)

  // ============ STATE: INVITE LINKS ============
  const [generatingInvite, setGeneratingInvite] = useState(false)

  // ============ STATE: ВЫПЛАТЫ ============
  const [showPaymentsModal, setShowPaymentsModal] = useState(false)
  const [selectedPaymentPeriod, setSelectedPaymentPeriod] = useState<'5-22' | '23-4'>('5-22')

  // ============ COMPUTED VALUES ============
  const activePremiumCount = premiumClients.filter(c => getDaysRemaining(c.expires_at) > 0).length

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

  // ============ STATS CALCULATION ============
  const stats = useMemo((): Stats => {
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

      const query = isNaN(telegramId)
        ? supabase.from('bot_users').select('*').ilike('username', input).single()
        : supabase.from('bot_users').select('*').eq('telegram_id', telegramId).single()

      const { data: botUser, error: botError } = await query

      if (botError || !botUser) {
        showToast({ variant: 'error', title: 'Пользователь не найден в боте' })
        setAddingClient(false)
        return
      }

      const exists = premiumClients.find(c => c.telegram_id === botUser.telegram_id)
      if (exists) {
        showToast({ variant: 'error', title: 'Клиент уже существует' })
        setAddingClient(false)
        return
      }

      let expiresAt: Date
      if (newClientPeriod === 'custom' && newClientCustomDate) {
        expiresAt = new Date(newClientCustomDate)
      } else {
        const days = parseInt(newClientPeriod, 10)
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      }
      expiresAt.setHours(23, 59, 59, 999)

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
    } catch (err: unknown) {
      console.error('Ticket grant error:', err)
      const message = err instanceof Error ? err.message : 'Ошибка выдачи билета'
      showToast({ variant: 'error', title: message })
    } finally {
      setGrantingTicket(false)
    }
  }

  // ============ RENDER ============
  return (
    <div className="space-y-4">
      {/* Статистика */}
      <PremiumStats
        stats={stats}
        statsMonth={statsMonth}
        availableMonths={availableMonths}
        onMonthChange={setStatsMonth}
        onShowPayments={() => setShowPaymentsModal(true)}
      />

      {/* Фильтры */}
      <PremiumFilters
        search={premiumSearch}
        onSearchChange={setPremiumSearch}
        planFilter={planFilter}
        onPlanFilterChange={setPlanFilter}
        monthFilter={monthFilter}
        onMonthFilterChange={setMonthFilter}
        premiumFilter={premiumFilter}
        onPremiumFilterChange={setPremiumFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        availableMonths={availableMonths}
      />

      {/* Список клиентов */}
      <ClientList
        clients={filteredClients}
        totalActive={activePremiumCount}
        onSelectClient={(client) => { setSelectedClient(client); setShowClientModal(true) }}
        onAddClient={() => setShowAddModal(true)}
      />

      {/* ============ МОДАЛКИ ============ */}

      {/* Модалка клиента */}
      {showClientModal && selectedClient && (
        <ClientModal
          client={selectedClient}
          generatingInvite={generatingInvite}
          onClose={() => setShowClientModal(false)}
          onSendLinks={() => generateInviteLinks(selectedClient.telegram_id, true)}
          onAddDays={(days) => addBonusDays(selectedClient.id, selectedClient.telegram_id, days)}
          onEditDate={() => {
            setEditingDateValue(selectedClient.expires_at.split('T')[0])
            setShowEditDateModal(true)
          }}
          onGrantTicket={() => openTicketModal(selectedClient.telegram_id, selectedClient.first_name || selectedClient.username || 'Клиент')}
          onDelete={() => deleteClient(selectedClient.id, selectedClient.telegram_id)}
        />
      )}

      {/* Модалка добавления клиента */}
      {showAddModal && (
        <AddClientModal
          clientId={newClientId}
          amount={newClientAmount}
          noPayment={newClientNoPayment}
          period={newClientPeriod}
          customDate={newClientCustomDate}
          source={newClientSource}
          currency={newClientCurrency}
          adding={addingClient}
          onClientIdChange={setNewClientId}
          onAmountChange={setNewClientAmount}
          onNoPaymentChange={setNewClientNoPayment}
          onPeriodChange={setNewClientPeriod}
          onCustomDateChange={setNewClientCustomDate}
          onSourceChange={setNewClientSource}
          onCurrencyChange={setNewClientCurrency}
          onSubmit={addClient}
          onClose={() => { setShowAddModal(false); resetAddForm() }}
        />
      )}

      {/* Модалка редактирования даты */}
      {showEditDateModal && selectedClient && (
        <EditDateModal
          client={selectedClient}
          dateValue={editingDateValue}
          onDateChange={setEditingDateValue}
          onSubmit={() => updateExpirationDate(selectedClient.id, editingDateValue)}
          onClose={() => setShowEditDateModal(false)}
        />
      )}

      {/* Модалка выплат */}
      {showPaymentsModal && (
        <PaymentsModal
          paymentHistory={paymentHistory}
          selectedPeriod={selectedPaymentPeriod}
          onPeriodChange={setSelectedPaymentPeriod}
          onClose={() => setShowPaymentsModal(false)}
        />
      )}

      {/* Модалка выдачи билета */}
      {showTicketModal && ticketTarget && (
        <TicketModal
          target={ticketTarget}
          giveaways={activeGiveaways}
          selectedGiveawayId={selectedGiveawayId}
          granting={grantingTicket}
          onGiveawayChange={setSelectedGiveawayId}
          onSubmit={handleGrantTicket}
          onClose={() => setShowTicketModal(false)}
        />
      )}
    </div>
  )
}
