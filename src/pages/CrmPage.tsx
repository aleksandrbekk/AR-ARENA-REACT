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
  id: number
  telegram_id: string
  username: string | null
  tariff: string
  start_date: string
  expires_at: string
  days_left: number
  in_channel: boolean
  in_chat: boolean
  tags: string[]
  source: string
  total_paid: number
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
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Форма добавления клиента
  const [newClient, setNewClient] = useState({
    telegram_id: '',
    username: '',
    tariff: '1month',
    amount: '',
    source: 'manual'
  })

  // Форма заметки
  const [note, setNote] = useState('')

  // Проверка доступа
  const isAdmin = telegramUser?.id === 190202791

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
  const loadPaymentHistory = async (telegramId: string) => {
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
    setShowClientModal(true)
    await loadPaymentHistory(client.telegram_id)
  }

  // Добавление дней
  const handleAddDays = async (days: number) => {
    if (!selectedClient || actionLoading) return

    setActionLoading(`add-${days}`)

    try {
      const { error } = await supabase.rpc('add_premium_client', {
        telegram_id: selectedClient.telegram_id,
        username: selectedClient.username || null,
        days: days
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

  // Добавление нового клиента
  const handleAddClient = async () => {
    if (!newClient.telegram_id || actionLoading) return

    setActionLoading('add-client')

    try {
      // Определяем количество дней по тарифу
      const daysMap: Record<string, number> = {
        '1month': 30,
        '2months': 60,
        '3months': 90,
        '6months': 180,
        '12months': 365
      }
      const days = daysMap[newClient.tariff] || 30

      const { error } = await supabase.rpc('add_premium_client', {
        telegram_id: newClient.telegram_id,
        username: newClient.username || null,
        days: days
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
      setNewClient({ telegram_id: '', username: '', tariff: '1мес', amount: '', source: 'manual' })
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
      'wheel': 'Рулетка',
      'direct': 'Напрямую',
      'referral': 'Реферал'
    }
    return labels[source] || source
  }

  // Получить русское название тарифа
  const getTariffLabel = (tariff: string) => {
    const labels: Record<string, string> = {
      '1month': '1 месяц',
      '2months': '2 месяца',
      '3months': '3 месяца',
      '6months': '6 месяцев',
      '12months': '12 месяцев'
    }
    return labels[tariff] || tariff
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
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(['all', 'active', 'expiring_3d', 'expired', 'vip'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  filter === f
                    ? 'bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black'
                    : 'bg-zinc-800 text-white/60'
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
                      <td className="px-4 py-3 text-white/80">{getTariffLabel(client.tariff)}</td>
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-50 px-4 pt-4 pb-4 overflow-y-auto">
            <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-2xl border border-yellow-500/20 mb-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#FFD700]">
                  {selectedClient.username || `@${selectedClient.telegram_id}`}
                </h2>
                <button
                  onClick={() => setShowClientModal(false)}
                  className="text-white/60 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <div className="text-white/60 text-sm mb-1">Telegram ID:</div>
                  <div className="text-white font-mono">{selectedClient.telegram_id}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-white/60 text-sm mb-1">Тариф:</div>
                    <div className="text-white">{getTariffLabel(selectedClient.tariff)}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-sm mb-1">Дней осталось:</div>
                    <div className={selectedClient.days_left < 7 ? 'text-red-500 font-bold' : 'text-white'}>
                      {selectedClient.days_left}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-white/60 text-sm mb-1">Начало:</div>
                    <div className="text-white">{formatDate(selectedClient.start_date)}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-sm mb-1">Окончание:</div>
                    <div className="text-white">{formatDate(selectedClient.expires_at)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-white/60 text-sm mb-1">Всего заплатил:</div>
                    <div className="text-[#FFD700] font-bold">${selectedClient.total_paid || 0}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-sm mb-1">Платежей:</div>
                    <div className="text-white">{selectedClient.payments_count || 0}</div>
                  </div>
                </div>

                <div>
                  <div className="text-white/60 text-sm mb-1">Источник:</div>
                  <div className="text-white">{getSourceLabel(selectedClient.source || 'manual')}</div>
                </div>

                <div>
                  <div className="text-white/60 text-sm mb-1">Метки:</div>
                  <div className="flex gap-2 flex-wrap">
                    {selectedClient.tags?.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* ДЕЙСТВИЯ */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => handleAddDays(30)}
                  disabled={actionLoading === 'add-30'}
                  className="px-4 py-2 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-lg disabled:opacity-50"
                >
                  {actionLoading === 'add-30' ? '...' : '+30 дней'}
                </button>
                <button
                  onClick={() => handleAddDays(7)}
                  disabled={actionLoading === 'add-7'}
                  className="px-4 py-2 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-lg disabled:opacity-50"
                >
                  {actionLoading === 'add-7' ? '...' : '+7 дней'}
                </button>
                <button
                  onClick={() => showToast({ variant: 'info', title: 'Функция в разработке' })}
                  className="px-4 py-2 bg-zinc-800 text-white rounded-lg"
                >
                  Добавить в канал
                </button>
                <button
                  onClick={() => showToast({ variant: 'info', title: 'Функция в разработке' })}
                  className="px-4 py-2 bg-zinc-800 text-white rounded-lg"
                >
                  Удалить из канала
                </button>
              </div>

              {/* ДОБАВИТЬ МЕТКУ */}
              <div className="mb-6">
                <div className="text-white/60 text-sm mb-2">Добавить метку:</div>
                <div className="flex gap-2">
                  {['VIP', 'проблемный', 'заморожен'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleAddTag(tag)}
                      disabled={actionLoading?.startsWith('tag-')}
                      className="px-3 py-1 bg-zinc-800 text-white text-sm rounded-lg disabled:opacity-50"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* ЗАМЕТКА */}
              <div className="mb-6">
                <div className="text-white/60 text-sm mb-2">Заметка:</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Введите заметку..."
                    className="flex-1 px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-500/30"
                  />
                  <button
                    onClick={handleSaveNote}
                    disabled={actionLoading === 'note'}
                    className="px-4 py-2 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-lg disabled:opacity-50"
                  >
                    {actionLoading === 'note' ? '...' : 'Сохранить'}
                  </button>
                </div>
              </div>

              {/* ИСТОРИЯ ПЛАТЕЖЕЙ */}
              <div>
                <div className="text-white/60 text-sm mb-2">История платежей</div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {paymentHistory.length === 0 ? (
                    <div className="text-white/40 text-sm">Нет платежей</div>
                  ) : (
                    paymentHistory.map((payment) => (
                      <div key={payment.id} className="p-3 bg-zinc-800/50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-white font-medium">${payment.amount} {payment.currency}</div>
                            <div className="text-white/60 text-xs">{formatDate(payment.created_at)}</div>
                          </div>
                          <div className="text-white/60 text-xs">{getSourceLabel(payment.source)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* МОДАЛКА ДОБАВЛЕНИЯ КЛИЕНТА */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-50 px-4 pt-4 pb-4 overflow-y-auto">
            <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-yellow-500/20 mb-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
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
                    <option value="1month">1 месяц</option>
                    <option value="2months">2 месяца</option>
                    <option value="3months">3 месяца</option>
                    <option value="6months">6 месяцев</option>
                    <option value="12months">12 месяцев</option>
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
                    <option value="wheel">Рулетка</option>
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
      </div>
    </Layout>
  )
}

