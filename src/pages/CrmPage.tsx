import { useState, useEffect } from 'react'
import { Layout } from '../components/layout/Layout'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/ToastProvider'
import { supabase } from '../lib/supabase'

interface CrmStats {
  active_clients: number
  expiring_7d: number
  total_revenue: number
  avg_check: number
}

interface PremiumClient {
  id: string
  telegram_id: number
  username: string | null
  plan: string // было tariff
  started_at: string // было start_date
  expires_at: string
  days_left: number
  in_channel: boolean
  in_chat: boolean
  tags: string[]
  source: string
  total_paid_usd: number // было total_paid
  payments_count: number
  note: string | null
}

interface PaymentHistory {
  id: number
  telegram_id: string
  amount: number
  currency: string
  created_at: string
  source: string
}

type FilterType = 'all' | 'active' | 'expiring_3d' | 'expired' | 'vip'

export function CrmPage() {
  const { telegramUser, isLoading } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [stats, setStats] = useState<CrmStats>({
    active_clients: 0,
    expiring_7d: 0,
    total_revenue: 0,
    avg_check: 0
  })
  const [clients, setClients] = useState<PremiumClient[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<PremiumClient | null>(null)
  const [showClientModal, setShowClientModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Форма добавления клиента
  const [newClient, setNewClient] = useState({
    telegram_id: '',
    username: '',
    tariff: 'classic',
    amount: '',
    source: 'manual'
  })

  // Форма заметки
  const [note, setNote] = useState('')

  // Ползунок дней
  const [daysSlider, setDaysSlider] = useState(30)

  // Проверка доступа
  const ADMIN_IDS = [190202791, 144828618, 288542643, 288475216]
  const isAdmin = telegramUser?.id ? ADMIN_IDS.includes(telegramUser.id) : false

  // Загрузка данных
  const loadData = async () => {
    try {
      setLoading(true)

      // Загружаем статистику
      const { data: statsData, error: statsError } = await supabase.rpc('get_crm_stats')
      if (statsError) {
        console.error('Error loading stats:', statsError)
        // Fallback если RPC не существует
        setStats({
          active_clients: 0,
          expiring_7d: 0,
          total_revenue: 0,
          avg_check: 0
        })
      } else {
        setStats(statsData as CrmStats)
      }

      // Загружаем клиентов
      await loadClients()
    } catch (err) {
      console.error('Error loading data:', err)
      showToast({ variant: 'error', title: 'Ошибка загрузки данных' })
    } finally {
      setLoading(false)
    }
  }

  const loadClients = async () => {
    try {
      let query = supabase
        .from('premium_clients')
        .select('*')
        .order('expires_at', { ascending: true })

      // Применяем фильтры
      if (filter === 'active') {
        query = query.gt('expires_at', new Date().toISOString())
      } else if (filter === 'expiring_3d') {
        const threeDaysLater = new Date()
        threeDaysLater.setDate(threeDaysLater.getDate() + 3)
        query = query
          .gt('expires_at', new Date().toISOString())
          .lt('expires_at', threeDaysLater.toISOString())
      } else if (filter === 'expired') {
        query = query.lt('expires_at', new Date().toISOString())
      } else if (filter === 'vip') {
        query = query.contains('tags', ['vip'])
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading clients:', error)
        setClients([])
      } else {
        // Вычисляем days_left для каждого клиента
        const clientsWithDays = (data || []).map((client: any) => {
          const expiresAt = new Date(client.expires_at)
          const now = new Date()
          const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          return {
            ...client,
            days_left: daysLeft
          }
        })
        setClients(clientsWithDays as PremiumClient[])
      }
    } catch (err) {
      console.error('Error loading clients:', err)
      setClients([])
    }
  }

  // Загрузка истории платежей
  const loadPaymentHistory = async (telegramId: number) => {
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .eq('telegram_id', telegramId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading payment history:', error)
        setPaymentHistory([])
      } else {
        setPaymentHistory((data || []) as PaymentHistory[])
      }
    } catch (err) {
      console.error('Error loading payment history:', err)
      setPaymentHistory([])
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin, filter])

  // Настройка Telegram Back Button
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      const handleBack = () => navigate('/')
      tg.BackButton.show()
      tg.BackButton.onClick(handleBack)

      return () => {
        tg.BackButton.offClick(handleBack)
        tg.BackButton.hide()
      }
    }
  }, [navigate])

  // Открытие модалки клиента
  const handleClientClick = async (client: PremiumClient) => {
    setSelectedClient(client)
    setNote(client.note || '')
    setDaysSlider(30) // Сброс ползунка на 30 дней
    setShowClientModal(true)
    await loadPaymentHistory(client.telegram_id)
  }

  // Добавление дней
  const handleAddDays = async (days: number) => {
    if (!selectedClient || actionLoading) return

    setActionLoading(`add-${days}`)

    try {
      const { error } = await supabase.rpc('add_premium_client', {
        p_telegram_id: selectedClient.telegram_id,
        p_username: selectedClient.username || null,
        p_days: days
      })

      if (error) {
        throw new Error(error.message)
      }

      showToast({ variant: 'success', title: `Добавлено ${days} дней` })
      await loadData()
      await loadClients()

      // Обновляем выбранного клиента
      const updated = clients.find(c => c.id === selectedClient.id)
      if (updated) {
        setSelectedClient(updated)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка добавления дней'
      showToast({ variant: 'error', title: 'Ошибка', description: errorMessage })
    } finally {
      setActionLoading(null)
    }
  }

  // Сохранение заметки
  const handleSaveNote = async () => {
    if (!selectedClient || actionLoading) return

    setActionLoading('note')

    try {
      const { error } = await supabase
        .from('premium_clients')
        .update({ note })
        .eq('id', selectedClient.id)

      if (error) {
        throw new Error(error.message)
      }

      showToast({ variant: 'success', title: 'Заметка сохранена' })
      await loadClients()

      // Обновляем выбранного клиента
      const updated = clients.find(c => c.id === selectedClient.id)
      if (updated) {
        setSelectedClient({ ...updated, note })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка сохранения заметки'
      showToast({ variant: 'error', title: 'Ошибка', description: errorMessage })
    } finally {
      setActionLoading(null)
    }
  }

  // Добавление метки
  const handleAddTag = async (tag: string) => {
    if (!selectedClient || actionLoading) return

    setActionLoading(`tag-${tag}`)

    try {
      const currentTags = selectedClient.tags || []
      if (currentTags.includes(tag)) {
        showToast({ variant: 'info', title: 'Метка уже добавлена' })
        setActionLoading(null)
        return
      }

      const { error } = await supabase
        .from('premium_clients')
        .update({ tags: [...currentTags, tag] })
        .eq('id', selectedClient.id)

      if (error) {
        throw new Error(error.message)
      }

      showToast({ variant: 'success', title: `Метка "${tag}" добавлена` })
      await loadClients()

      // Обновляем выбранного клиента
      const updated = clients.find(c => c.id === selectedClient.id)
      if (updated) {
        setSelectedClient({ ...updated, tags: [...currentTags, tag] })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка добавления метки'
      showToast({ variant: 'error', title: 'Ошибка', description: errorMessage })
    } finally {
      setActionLoading(null)
    }
  }

  // Кикнуть из канала и чата
  const handleKick = async () => {
    if (!selectedClient || actionLoading) return

    setActionLoading('kick')

    try {
      const telegramId = selectedClient.telegram_id
      const response = await fetch('https://syxjkircmiwpnpagznay.supabase.co/functions/v1/telegram-channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g'
        },
        body: JSON.stringify({ action: 'kick', telegram_id: telegramId })
      })

      const result = await response.json()

      if (result.success) {
        // Обновляем статус в БД
        const { error: updateError } = await supabase
          .from('premium_clients')
          .update({ in_channel: false, in_chat: false })
          .eq('id', selectedClient.id)

        if (updateError) {
          console.error('Error updating status:', updateError)
        }

        showToast({ variant: 'success', title: 'Удалён из канала и чата' })
        await loadClients()
        setSelectedClient({ ...selectedClient, in_channel: false, in_chat: false })
      } else {
        throw new Error(result.error || 'Ошибка удаления')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка удаления'
      showToast({ variant: 'error', title: 'Ошибка', description: errorMessage })
    } finally {
      setActionLoading(null)
    }
  }

  // Создать инвайт-ссылку
  const handleInvite = async () => {
    if (!selectedClient || actionLoading) return

    setActionLoading('invite')

    try {
      const telegramId = selectedClient.telegram_id
      const response = await fetch('https://syxjkircmiwpnpagznay.supabase.co/functions/v1/telegram-channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g'
        },
        body: JSON.stringify({ action: 'invite', telegram_id: telegramId })
      })

      const result = await response.json()

      if (result.success && result.results?.channel?.result?.invite_link) {
        const link = result.results.channel.result.invite_link
        setInviteLink(link)
        setShowInviteModal(true)

        // Обновляем статус в БД
        const { error: updateError } = await supabase
          .from('premium_clients')
          .update({ in_channel: true, in_chat: true })
          .eq('id', selectedClient.id)

        if (updateError) {
          console.error('Error updating status:', updateError)
        }

        showToast({ variant: 'success', title: 'Ссылка создана' })
        await loadClients()
        setSelectedClient({ ...selectedClient, in_channel: true, in_chat: true })
      } else {
        throw new Error(result.error || 'Ошибка создания ссылки')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка создания инвайта'
      showToast({ variant: 'error', title: 'Ошибка', description: errorMessage })
    } finally {
      setActionLoading(null)
    }
  }


  // Проверка пользователя в базе по ID
  const handleCheckUser = async (telegramId: string) => {
    if (!telegramId || telegramId.length < 3) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('username, first_name')
        .eq('telegram_id', telegramId)
        .single()

      if (error) {
        // Silently fail if not found or other error, mostly likely just user not in db
        return
      }

      if (data) {
        if (data.username) {
          setNewClient(prev => ({ ...prev, username: data.username!.replace('@', '') }))
          showToast({ variant: 'success', title: 'Пользователь найден', description: `@${data.username}` })
        } else if (data.first_name) {
          showToast({ variant: 'success', title: 'Пользователь найден', description: `Имя: ${data.first_name} (без username)` })
        }
      }
    } catch (err) {
      console.error('Error checking user:', err)
    }
  }

  // Добавление нового клиента
  const handleAddClient = async () => {
    if (!newClient.telegram_id || actionLoading) return

    setActionLoading('add-client')

    try {
      // Определяем количество дней по тарифу
      const daysMap: Record<string, number> = {
        'classic': 30,
        'gold': 90,
        'platinum': 180,
        'private': 365
      }
      const days = daysMap[newClient.tariff] || 30

      const { error } = await supabase.rpc('add_premium_client', {
        p_telegram_id: newClient.telegram_id,
        p_username: newClient.username || null,
        p_days: days
      })

      if (error) {
        throw new Error(error.message)
      }

      // Если указана сумма, добавляем в payment_history
      if (newClient.amount) {
        const { error: paymentError } = await supabase
          .from('payment_history')
          .insert({
            telegram_id: newClient.telegram_id,
            amount: parseFloat(newClient.amount),
            currency: 'USD',
            source: newClient.source
          })

        if (paymentError) {
          console.error('Error adding payment:', paymentError)
        }
      }

      showToast({ variant: 'success', title: 'Клиент добавлен' })
      setShowAddModal(false)
      setNewClient({ telegram_id: '', username: '', tariff: 'classic', amount: '', source: 'manual' })
      await loadData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка добавления клиента'
      showToast({ variant: 'error', title: 'Ошибка', description: errorMessage })
    } finally {
      setActionLoading(null)
    }
  }

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
  }

  // Получить русское название источника
  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      'manual': 'Вручную',
      'lava.top': 'Lava.top',
      '0xprocessing': 'Крипта',
      'direct': 'Напрямую',
      'referral': 'Реферал'
    }
    return labels[source] || source
  }

  // Получить русское название тарифа
  const getTariffLabel = (plan: string | null | undefined) => {
    if (!plan) return 'N/A'
    const labels: Record<string, string> = {
      'test': 'ТЕСТ',
      'classic': 'CLASSIC',
      'gold': 'GOLD',
      'platinum': 'PLATINUM',
      'private': 'PRIVATE'
    }
    return labels[plan] || plan.toUpperCase()
  }

  // Доступ запрещён
  if (!isLoading && !isAdmin) {
    return (
      <Layout hideNavbar>
        <div className="flex flex-col items-center justify-center min-h-screen px-4" style={{ paddingTop: '80px' }}>
          <div className="text-white/40 text-lg text-center font-bold tracking-widest uppercase">
            Доступ запрещён
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-6 py-3 bg-zinc-800 text-white rounded-xl active:scale-95 transition-transform font-medium"
          >
            На главную
          </button>
        </div>
      </Layout>
    )
  }

  if (isLoading || loading) {
    return (
      <Layout hideNavbar>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Загрузка...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout hideNavbar>
      <div className="min-h-screen bg-[#0a0a0a] text-white pt-[60px] pb-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Заголовок */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Премиум клиенты</h1>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-10 h-10 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-lg flex items-center justify-center"
            >
              +
            </button>
          </div>

          {/* СТАТИСТИКА */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-zinc-900/50 backdrop-blur-md border border-green-500/20 rounded-lg">
              <div className="text-white/60 text-sm mb-1">Активных</div>
              <div className="text-green-500 font-bold text-2xl">{stats.active_clients}</div>
            </div>
            <div className="p-4 bg-zinc-900/50 backdrop-blur-md border border-yellow-500/20 rounded-lg">
              <div className="text-white/60 text-sm mb-1">Истекает 7д</div>
              <div className="text-yellow-500 font-bold text-2xl">{stats.expiring_7d}</div>
            </div>
            <div className="p-4 bg-zinc-900/50 backdrop-blur-md border border-yellow-500/20 rounded-lg">
              <div className="text-white/60 text-sm mb-1">Выручка</div>
              <div className="text-[#FFD700] font-bold text-2xl">${stats.total_revenue}</div>
            </div>
            <div className="p-4 bg-zinc-900/50 backdrop-blur-md border border-yellow-500/20 rounded-lg">
              <div className="text-white/60 text-sm mb-1">Ср. чек</div>
              <div className="text-[#FFD700] font-bold text-2xl">${stats.avg_check}</div>
            </div>
          </div>

          {/* ФИЛЬТРЫ */}
          <div className="flex gap-1.5 overflow-x-auto pb-2">
            {(['all', 'active', 'expiring_3d', 'expired', 'vip'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 text-sm rounded-md font-medium whitespace-nowrap transition-all ${filter === f
                  ? 'bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black'
                  : 'bg-zinc-800/70 text-white/60 hover:bg-zinc-700'
                  }`}
              >
                {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : f === 'expiring_3d' ? 'Истекает 3д' : f === 'expired' ? 'Истёкшие' : 'VIP'}
              </button>
            ))}
          </div>

          {/* СПИСОК КЛИЕНТОВ */}
          <div className="bg-zinc-900/50 backdrop-blur-md border border-yellow-500/20 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-white/80">Username</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-white/80">Тариф</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-white/80">Истекает</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-white/80">Дней</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-white/80">Канал</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-white/80">Чат</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-white/80">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr
                      key={client.id}
                      onClick={() => handleClientClick(client)}
                      className="border-t border-white/5 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{client.username || `@${client.telegram_id}`}</div>
                        {client.tags?.includes('vip') && (
                          <span className="text-xs text-[#FFD700]">[VIP]</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/80">{getTariffLabel(client.plan)}</td>
                      <td className="px-4 py-3 text-white/80">{formatDate(client.expires_at)}</td>
                      <td className="px-4 py-3">
                        <span className={client.days_left < 7 ? 'text-red-500 font-bold' : 'text-white/80'}>
                          {client.days_left}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {client.in_channel ? '✅' : '❌'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {client.in_chat ? '✅' : '❌'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-white/40">•••</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clients.length === 0 && (
                <div className="p-8 text-center text-white/40">Нет клиентов</div>
              )}
            </div>
          </div>
        </div>

        {/* МОДАЛКА КЛИЕНТА */}
        {showClientModal && selectedClient && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-50 px-4 pt-[120px] pb-6">
            <div className="bg-zinc-900 rounded-2xl w-full max-w-md border border-yellow-500/20 max-h-full h-auto overflow-hidden flex flex-col">
              {/* Шапка */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-b from-[#FFD700] to-[#FFA500] rounded-full flex items-center justify-center text-black font-bold text-lg">
                    {(selectedClient.username || String(selectedClient.telegram_id))[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {selectedClient.username ? `@${selectedClient.username}` : 'Без username'}
                    </h2>
                    <div className="text-white/50 text-sm font-mono">{selectedClient.telegram_id}</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowClientModal(false)}
                  className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white text-2xl rounded-lg hover:bg-white/10"
                >
                  ×
                </button>
              </div>

              {/* Контент */}
              <div className="overflow-y-auto flex-1 p-4 space-y-4 pb-[env(safe-area-inset-bottom,20px)]">
                {/* Статус подписки */}
                <div className="p-3 bg-zinc-800/50 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/60 text-sm">Подписка</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${selectedClient.days_left > 7 ? 'bg-green-500/20 text-green-400' :
                      selectedClient.days_left > 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                      {selectedClient.days_left > 0 ? `${selectedClient.days_left} дн.` : 'Истекла'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-white/40">До:</span>{' '}
                      <span className="text-white">{formatDate(selectedClient.expires_at)}</span>
                    </div>
                    <div>
                      <span className="text-white/40">Тариф:</span>{' '}
                      <span className="text-white">{getTariffLabel(selectedClient.plan)}</span>
                    </div>
                  </div>
                </div>

                {/* Статус в канале/чате */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-xl text-center ${selectedClient.in_channel ? 'bg-green-500/10 border border-green-500/30' : 'bg-zinc-800/50 border border-white/5'}`}>
                    <div className="text-2xl mb-1">{selectedClient.in_channel ? '✅' : '❌'}</div>
                    <div className="text-xs text-white/60">Канал</div>
                  </div>
                  <div className={`p-3 rounded-xl text-center ${selectedClient.in_chat ? 'bg-green-500/10 border border-green-500/30' : 'bg-zinc-800/50 border border-white/5'}`}>
                    <div className="text-2xl mb-1">{selectedClient.in_chat ? '✅' : '❌'}</div>
                    <div className="text-xs text-white/60">Чат</div>
                  </div>
                </div>

                {/* Финансы */}
                <div className="p-3 bg-zinc-800/50 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Всего оплачено</span>
                    <span className="text-[#FFD700] font-bold text-lg">${selectedClient.total_paid_usd || 0}</span>
                  </div>
                </div>

                {/* Метки */}
                {selectedClient.tags && selectedClient.tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {selectedClient.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-xs rounded-lg">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Ползунок дней */}
                <div>
                  <div className="text-white/60 text-xs mb-2 uppercase tracking-wide">Добавить дней</div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="365"
                      value={daysSlider}
                      onChange={(e) => setDaysSlider(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#FFD700]"
                    />
                    <span className="text-white font-medium text-sm min-w-[3rem] text-right">{daysSlider} дн.</span>
                    <button
                      onClick={() => handleAddDays(daysSlider)}
                      disabled={actionLoading === `add-${daysSlider}`}
                      className="px-4 py-2 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-lg disabled:opacity-50 active:scale-95 transition-transform text-sm whitespace-nowrap"
                    >
                      {actionLoading === `add-${daysSlider}` ? '...' : 'Добавить'}
                    </button>
                  </div>
                </div>

                {/* Быстрые кнопки месяцев */}
                <div>
                  <div className="text-white/60 text-xs mb-2 uppercase tracking-wide">Быстро</div>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { label: '+1 мес', days: 30 },
                      { label: '+2 мес', days: 60 },
                      { label: '+3 мес', days: 90 },
                      { label: '+6 мес', days: 180 },
                      { label: '+12 мес', days: 365 }
                    ].map(({ label, days }) => (
                      <button
                        key={days}
                        onClick={() => handleAddDays(days)}
                        disabled={actionLoading === `add-${days}`}
                        className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
                      >
                        {actionLoading === `add-${days}` ? '...' : label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Действия с каналом */}
                <div>
                  <div className="text-white/60 text-xs mb-2 uppercase tracking-wide">Канал</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleInvite()}
                      disabled={actionLoading === 'invite'}
                      className="py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl disabled:opacity-50 active:scale-95 transition-all text-sm"
                    >
                      {actionLoading === 'invite' ? '...' : 'Инвайт'}
                    </button>
                    <button
                      onClick={() => handleKick()}
                      disabled={actionLoading === 'kick'}
                      className="py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl disabled:opacity-50 active:scale-95 transition-all text-sm"
                    >
                      {actionLoading === 'kick' ? '...' : 'Кикнуть'}
                    </button>
                  </div>
                </div>

                {/* Метки */}
                <div>
                  <div className="text-white/60 text-xs mb-2 uppercase tracking-wide">Добавить метку</div>
                  <div className="flex gap-2 flex-wrap">
                    {['VIP', 'проблемный', 'заморожен'].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleAddTag(tag)}
                        disabled={actionLoading?.startsWith('tag-')}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Заметка */}
                <div>
                  <div className="text-white/60 text-xs mb-2 uppercase tracking-wide">Заметка</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Введите заметку..."
                      className="flex-1 px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-500/30 text-sm"
                    />
                    <button
                      onClick={handleSaveNote}
                      disabled={actionLoading === 'note'}
                      className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg disabled:opacity-50 text-sm transition-colors"
                    >
                      {actionLoading === 'note' ? '...' : 'OK'}
                    </button>
                  </div>
                </div>

                {/* История платежей */}
                <div>
                  <div className="text-white/60 text-xs mb-2 uppercase tracking-wide">Платежи</div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {paymentHistory.length === 0 ? (
                      <div className="text-white/40 text-sm p-3 bg-zinc-800/30 rounded-lg text-center">Нет платежей</div>
                    ) : (
                      paymentHistory.map((payment) => (
                        <div key={payment.id} className="p-2 bg-zinc-800/50 rounded-lg flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-[#FFD700] font-medium">${payment.amount}</span>
                            <span className="text-white/40 text-xs">{formatDate(payment.created_at)}</span>
                          </div>
                          <span className="text-white/40 text-xs">{getSourceLabel(payment.source)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* МОДАЛКА ДОБАВЛЕНИЯ КЛИЕНТА */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-50 px-4 pt-[120px] pb-4 overflow-y-auto">
            <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-yellow-500/20 mb-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#FFD700]">Добавить клиента</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-white/60 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Telegram ID *</label>
                  <input
                    type="text"
                    value={newClient.telegram_id}
                    onChange={(e) => setNewClient({ ...newClient, telegram_id: e.target.value })}
                    onBlur={(e) => handleCheckUser(e.target.value)}
                    placeholder="123456789"
                    className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-500/30"
                  />
                </div>

                <div>
                  <label className="text-white/60 text-sm mb-2 block">Username</label>
                  <input
                    type="text"
                    value={newClient.username}
                    onChange={(e) => setNewClient({ ...newClient, username: e.target.value })}
                    placeholder="@username"
                    className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-500/30"
                  />
                </div>

                <div>
                  <label className="text-white/60 text-sm mb-2 block">Тариф</label>
                  <select
                    value={newClient.tariff}
                    onChange={(e) => setNewClient({ ...newClient, tariff: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-500/30"
                  >
                    <option value="classic">CLASSIC (1 мес)</option>
                    <option value="gold">GOLD (3 мес)</option>
                    <option value="platinum">PLATINUM (6 мес)</option>
                    <option value="private">PRIVATE (12 мес)</option>
                  </select>
                </div>

                <div>
                  <label className="text-white/60 text-sm mb-2 block">Сумма $</label>
                  <input
                    type="number"
                    value={newClient.amount}
                    onChange={(e) => setNewClient({ ...newClient, amount: e.target.value })}
                    placeholder="50"
                    className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-500/30"
                  />
                </div>

                <div>
                  <label className="text-white/60 text-sm mb-2 block">Источник</label>
                  <select
                    value={newClient.source}
                    onChange={(e) => setNewClient({ ...newClient, source: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-500/30"
                  >
                    <option value="manual">Вручную</option>
                    <option value="lava.top">Lava.top (карта)</option>
                    <option value="0xprocessing">Крипта (0xProcessing)</option>
                    <option value="direct">Напрямую</option>
                    <option value="referral">Реферал</option>
                  </select>
                </div>

                <button
                  onClick={handleAddClient}
                  disabled={!newClient.telegram_id || actionLoading === 'add-client'}
                  className="w-full py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'add-client' ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* МОДАЛКА СО ССЫЛКОЙ ИНВАЙТА */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-yellow-500/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#FFD700]">Инвайт-ссылка</h2>
                <button
                  onClick={() => {
                    setShowInviteModal(false)
                    setInviteLink('')
                  }}
                  className="text-white/60 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <p className="text-white/60 text-sm mb-4">
                Отправьте эту ссылку клиенту. Действует 24 часа, одноразовая.
              </p>

              <div className="bg-zinc-800 rounded-lg p-3 mb-4">
                <div className="text-white font-mono text-sm break-all">{inviteLink}</div>
              </div>

              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inviteLink)
                    showToast({ variant: 'success', title: 'Ссылка скопирована' })
                  } catch (err) {
                    showToast({ variant: 'error', title: 'Ошибка копирования' })
                  }
                }}
                className="w-full py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-lg active:scale-95 transition-transform"
              >
                Копировать
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

