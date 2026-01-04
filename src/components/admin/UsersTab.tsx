import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ToastProvider'

// ============ ТИПЫ ============
interface AppUser {
  id: number
  telegram_id: string
  username: string | null
  first_name: string | null
  last_name: string | null
  photo_url: string | null
  balance_ar: number
  balance_bul: number
  level: number
  xp: number
  energy: number
  energy_max: number
  active_skin: string | null
  created_at: string
  last_seen_at: string | null
  referrer_id: string | null
  // Computed
  tickets_count?: number
}

interface Transaction {
  id: number
  currency: string
  amount: number
  type: string
  description: string | null
  created_at: string
}

interface UserSkin {
  skin_id: number
  is_equipped: boolean
  purchased_at: string
  skin_name?: string
  skin_rarity?: string
}

interface UserEquipment {
  equipment_slug: string
  level: number
  equipment_name?: string
  income_per_hour?: number
}

interface GiveawayTicket {
  giveaway_id: string
  ticket_number: number
  giveaway_name?: string
  giveaway_status?: string
}

type SortField = 'created_at' | 'balance_ar' | 'balance_bul' | 'level' | 'last_seen_at'

// ============ КОНСТАНТЫ ============
const BOT_TOKEN = import.meta.env.VITE_BOT_TOKEN || ''
const ITEMS_PER_PAGE = 20

// ============ КОМПОНЕНТ ============
export function UsersTab() {
  const { showToast } = useToast()

  // Список юзеров
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(1)

  // Профиль юзера
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([])
  const [userSkins, setUserSkins] = useState<UserSkin[]>([])
  const [userEquipment, setUserEquipment] = useState<UserEquipment[]>([])
  const [userTickets, setUserTickets] = useState<GiveawayTicket[]>([])
  const [loadingProfile, setLoadingProfile] = useState(false)

  // Модалки
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustCurrency, setAdjustCurrency] = useState<'AR' | 'BUL'>('AR')
  const [adjusting, setAdjusting] = useState(false)

  const [showAddTicketsModal, setShowAddTicketsModal] = useState(false)
  const [ticketGiveawayId, setTicketGiveawayId] = useState('')
  const [ticketCount, setTicketCount] = useState('1')
  const [addingTickets, setAddingTickets] = useState(false)
  const [activeGiveaways, setActiveGiveaways] = useState<{id: string, name: string}[]>([])

  // Удаление
  const [deleting, setDeleting] = useState(false)
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
      const [transRes, skinsRes, equipRes, ticketsRes] = await Promise.all([
        // Транзакции
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.telegram_id)
          .order('created_at', { ascending: false })
          .limit(50),

        // Скины
        supabase
          .from('user_skins')
          .select('skin_id, is_equipped, purchased_at')
          .eq('user_id', user.telegram_id),

        // Оборудование фермы
        supabase
          .from('user_equipment')
          .select('equipment_slug, level')
          .eq('user_id', user.telegram_id),

        // Билеты
        supabase
          .from('giveaway_tickets')
          .select('giveaway_id, ticket_number')
          .eq('user_id', user.telegram_id)
      ])

      setUserTransactions(transRes.data || [])
      setUserSkins(skinsRes.data || [])
      setUserEquipment(equipRes.data || [])
      setUserTickets(ticketsRes.data || [])

    } catch (err) {
      console.error('Error loading profile:', err)
      showToast({ variant: 'error', title: 'Ошибка загрузки профиля' })
    } finally {
      setLoadingProfile(false)
    }
  }

  // ============ ФИЛЬТРАЦИЯ И СОРТИРОВКА ============
  const filteredUsers = users
    .filter(user => {
      if (!search) return true
      const s = search.toLowerCase()
      return (
        String(user.telegram_id).includes(s) ||
        user.username?.toLowerCase().includes(s) ||
        user.first_name?.toLowerCase().includes(s)
      )
    })
    .sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === 'last_seen_at' || sortField === 'created_at') {
        aVal = aVal ? new Date(aVal).getTime() : 0
        bVal = bVal ? new Date(bVal).getTime() : 0
      }

      if (sortAsc) {
        return aVal > bVal ? 1 : -1
      }
      return aVal < bVal ? 1 : -1
    })

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const paginatedUsers = filteredUsers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // ============ ОПЕРАЦИИ ============
  const handleAdjustBalance = async () => {
    if (!selectedUser || !adjustAmount) return
    setAdjusting(true)

    try {
      const { data, error } = await supabase.rpc('admin_adjust_balance', {
        p_telegram_id: selectedUser.telegram_id,
        p_currency: adjustCurrency,
        p_amount: parseFloat(adjustAmount)
      })

      if (error) throw error

      if (data?.success) {
        showToast({
          variant: 'success',
          title: `${parseFloat(adjustAmount) > 0 ? '+' : ''}${adjustAmount} ${adjustCurrency}`,
          description: `Новый баланс: ${data.new_balance}`
        })
        setShowAdjustModal(false)
        setAdjustAmount('')

        // Обновляем юзера в списке и профиле
        const newBalance = data.new_balance
        setUsers(prev => prev.map(u => {
          if (u.telegram_id === selectedUser.telegram_id) {
            return {
              ...u,
              [adjustCurrency === 'AR' ? 'balance_ar' : 'balance_bul']: newBalance
            }
          }
          return u
        }))

        setSelectedUser(prev => prev ? {
          ...prev,
          [adjustCurrency === 'AR' ? 'balance_ar' : 'balance_bul']: newBalance
        } : null)

        // Обновляем транзакции
        loadUserProfile(selectedUser)
      } else {
        throw new Error(data?.error || 'Unknown error')
      }
    } catch (err: any) {
      console.error('Error adjusting balance:', err)
      showToast({ variant: 'error', title: 'Ошибка', description: err.message })
    } finally {
      setAdjusting(false)
    }
  }

  const handleAddTickets = async () => {
    if (!selectedUser || !ticketGiveawayId || !ticketCount) return
    setAddingTickets(true)

    try {
      const count = parseInt(ticketCount)

      // Получаем максимальный номер билета для этого розыгрыша
      const { data: maxTicket } = await supabase
        .from('giveaway_tickets')
        .select('ticket_number')
        .eq('giveaway_id', ticketGiveawayId)
        .order('ticket_number', { ascending: false })
        .limit(1)
        .single()

      let nextTicketNumber = (maxTicket?.ticket_number || 0) + 1

      // Создаём билеты
      const tickets = []
      for (let i = 0; i < count; i++) {
        tickets.push({
          giveaway_id: ticketGiveawayId,
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

      setShowAddTicketsModal(false)
      setTicketCount('1')
      setTicketGiveawayId('')

      // Обновляем данные
      fetchUsers()
      loadUserProfile(selectedUser)

    } catch (err: any) {
      console.error('Error adding tickets:', err)
      showToast({ variant: 'error', title: 'Ошибка', description: err.message })
    } finally {
      setAddingTickets(false)
    }
  }

  const handleSendMessage = async (text: string) => {
    if (!selectedUser || !text.trim()) return

    try {
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: selectedUser.telegram_id,
          text: text,
          parse_mode: 'HTML'
        })
      })

      const result = await response.json()
      if (!result.ok) throw new Error(result.description)

      showToast({ variant: 'success', title: 'Сообщение отправлено' })
    } catch (err: any) {
      console.error('Error sending message:', err)
      showToast({ variant: 'error', title: 'Ошибка отправки', description: err.message })
    }
  }

  // Удаление одного юзера
  const handleDeleteUser = async (telegramId: string) => {
    if (!confirm(`Удалить юзера ${telegramId}? Это действие нельзя отменить.`)) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('telegram_id', telegramId)

      if (error) throw error

      showToast({ variant: 'success', title: 'Юзер удалён' })
      setSelectedUser(null)
      fetchUsers()
    } catch (err: any) {
      console.error('Error deleting user:', err)
      showToast({ variant: 'error', title: 'Ошибка удаления', description: err.message })
    } finally {
      setDeleting(false)
    }
  }

  // Массовое удаление
  const handleMassDelete = async () => {
    if (selectedForDelete.size === 0) return

    setDeleting(true)
    try {
      const ids = Array.from(selectedForDelete)
      const { error } = await supabase
        .from('users')
        .delete()
        .in('telegram_id', ids)

      if (error) throw error

      showToast({ variant: 'success', title: `Удалено ${ids.length} юзер(ов)` })
      setSelectedForDelete(new Set())
      setShowDeleteConfirm(false)
      fetchUsers()
    } catch (err: any) {
      console.error('Error mass deleting:', err)
      showToast({ variant: 'error', title: 'Ошибка удаления', description: err.message })
    } finally {
      setDeleting(false)
    }
  }

  // Toggle выбора юзера для удаления
  const toggleSelectUser = (telegramId: string) => {
    setSelectedForDelete(prev => {
      const next = new Set(prev)
      if (next.has(telegramId)) {
        next.delete(telegramId)
      } else {
        next.add(telegramId)
      }
      return next
    })
  }

  // Выбрать/снять все на текущей странице
  const toggleSelectAll = () => {
    const pageIds = paginatedUsers.map(u => u.telegram_id)
    const allSelected = pageIds.every(id => selectedForDelete.has(id))

    if (allSelected) {
      setSelectedForDelete(prev => {
        const next = new Set(prev)
        pageIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      setSelectedForDelete(prev => {
        const next = new Set(prev)
        pageIds.forEach(id => next.add(id))
        return next
      })
    }
  }

  // ============ HELPERS ============
  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    })
  }

  const formatTimeAgo = (date: string | null) => {
    if (!date) return 'никогда'
    const now = new Date()
    const d = new Date(date)
    const diff = now.getTime() - d.getTime()

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes} мин назад`
    if (hours < 24) return `${hours} ч назад`
    if (days < 7) return `${days} д назад`
    return formatDate(date)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 text-xs opacity-50">
      {sortField === field ? (sortAsc ? '↑' : '↓') : ''}
    </span>
  )

  // ============ СТАТИСТИКА ============
  const stats = {
    total: users.length,
    totalAR: users.reduce((sum, u) => sum + (u.balance_ar || 0), 0),
    totalBUL: users.reduce((sum, u) => sum + (u.balance_bul || 0), 0),
    active24h: users.filter(u => {
      if (!u.last_seen_at) return false
      const diff = Date.now() - new Date(u.last_seen_at).getTime()
      return diff < 86400000
    }).length
  }

  // ============ LOADING ============
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#FFD700] text-sm font-mono animate-pulse">Загрузка игроков...</div>
      </div>
    )
  }

  // ============ ПРОФИЛЬ ЮЗЕРА ============
  if (selectedUser) {
    return (
      <div className="space-y-4">
        {/* Кнопка назад */}
        <button
          onClick={() => setSelectedUser(null)}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <span>←</span>
          <span>Назад к списку</span>
        </button>

        {loadingProfile ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-[#FFD700] text-sm font-mono animate-pulse">Загрузка профиля...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Шапка профиля */}
            <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 p-4">
              <div className="flex items-center gap-4">
                {selectedUser.photo_url ? (
                  <img
                    src={selectedUser.photo_url}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center text-2xl">
                    {selectedUser.first_name?.[0] || '?'}
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-white text-lg font-semibold">
                    {selectedUser.first_name || 'Без имени'}
                    {selectedUser.username && (
                      <span className="text-white/50 font-normal ml-2">@{selectedUser.username}</span>
                    )}
                  </div>
                  <div className="text-white/40 text-sm font-mono">{selectedUser.telegram_id}</div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-white/40 text-xs">
                      Зарег: {formatDate(selectedUser.created_at)}
                    </span>
                    <span className="text-white/40 text-xs">
                      Был: {formatTimeAgo(selectedUser.last_seen_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Балансы */}
            <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 p-4">
              <div className="text-white/50 text-xs uppercase tracking-wide mb-3">Балансы</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[#FFD700] text-2xl font-bold">
                    {selectedUser.balance_ar.toLocaleString()}
                  </div>
                  <div className="text-white/40 text-sm">AR</div>
                </div>
                <div>
                  <div className="text-blue-400 text-2xl font-bold">
                    {selectedUser.balance_bul.toLocaleString()}
                  </div>
                  <div className="text-white/40 text-sm">BUL</div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setAdjustCurrency('AR'); setShowAdjustModal(true) }}
                  className="flex-1 px-3 py-2 bg-[#FFD700]/20 text-[#FFD700] rounded-lg text-sm font-semibold hover:bg-[#FFD700]/30 transition-colors"
                >
                  ± AR
                </button>
                <button
                  onClick={() => { setAdjustCurrency('BUL'); setShowAdjustModal(true) }}
                  className="flex-1 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-semibold hover:bg-blue-500/30 transition-colors"
                >
                  ± BUL
                </button>
              </div>
            </div>

            {/* Билеты */}
            <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white/50 text-xs uppercase tracking-wide">Билеты</div>
                <button
                  onClick={() => setShowAddTicketsModal(true)}
                  className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-semibold hover:bg-green-500/30 transition-colors"
                >
                  + Добавить
                </button>
              </div>
              {userTickets.length === 0 ? (
                <div className="text-white/40 text-sm">Нет билетов</div>
              ) : (
                <div className="space-y-2">
                  <div className="text-white font-semibold">
                    Всего: {userTickets.length} билет(ов)
                  </div>
                  <div className="text-white/60 text-sm">
                    Номера: {userTickets.map(t => t.ticket_number).slice(0, 10).join(', ')}
                    {userTickets.length > 10 && ` и ещё ${userTickets.length - 10}...`}
                  </div>
                </div>
              )}
            </div>

            {/* История транзакций */}
            <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 p-4">
              <div className="text-white/50 text-xs uppercase tracking-wide mb-3">
                История транзакций ({userTransactions.length})
              </div>
              {userTransactions.length === 0 ? (
                <div className="text-white/40 text-sm">Нет транзакций</div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {userTransactions.slice(0, 20).map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div>
                        <div className={`font-semibold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount} {tx.currency}
                        </div>
                        <div className="text-white/40 text-xs">{tx.type}</div>
                      </div>
                      <div className="text-white/40 text-xs">
                        {formatDate(tx.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Скины */}
            <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 p-4">
              <div className="text-white/50 text-xs uppercase tracking-wide mb-3">
                Скины ({userSkins.length})
              </div>
              {userSkins.length === 0 ? (
                <div className="text-white/40 text-sm">Нет купленных скинов</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {userSkins.map(skin => (
                    <div
                      key={skin.skin_id}
                      className={`px-3 py-1 rounded-lg text-sm ${skin.is_equipped ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-zinc-800 text-white/60'}`}
                    >
                      Скин #{skin.skin_id} {skin.is_equipped && '✓'}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ферма */}
            <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 p-4">
              <div className="text-white/50 text-xs uppercase tracking-wide mb-3">
                Ферма ({userEquipment.length} оборудования)
              </div>
              {userEquipment.length === 0 ? (
                <div className="text-white/40 text-sm">Нет оборудования</div>
              ) : (
                <div className="space-y-2">
                  {userEquipment.map(eq => (
                    <div key={eq.equipment_slug} className="flex items-center justify-between">
                      <div className="text-white">{eq.equipment_slug}</div>
                      <div className="text-white/60">Lv.{eq.level}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Действия */}
            <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 p-4">
              <div className="text-white/50 text-xs uppercase tracking-wide mb-3">Действия</div>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    const msg = prompt('Введите сообщение:')
                    if (msg) handleSendMessage(msg)
                  }}
                  className="w-full px-4 py-3 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-semibold hover:bg-blue-500/30 transition-colors"
                >
                  Написать в Telegram
                </button>
                <button
                  onClick={() => handleDeleteUser(selectedUser.telegram_id)}
                  disabled={deleting}
                  className="w-full px-4 py-3 bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Удаление...' : 'Удалить юзера'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Модалка начисления */}
        {showAdjustModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm border border-white/10">
              <h3 className="text-white text-lg font-bold mb-4">
                {adjustCurrency === 'AR' ? 'Изменить AR' : 'Изменить BUL'}
              </h3>

              <div className="mb-4">
                <div className="text-white/60 text-sm mb-1">Текущий баланс:</div>
                <div className={`text-xl font-bold ${adjustCurrency === 'AR' ? 'text-[#FFD700]' : 'text-blue-400'}`}>
                  {(adjustCurrency === 'AR' ? selectedUser.balance_ar : selectedUser.balance_bul).toLocaleString()}
                </div>
              </div>

              <div className="mb-6">
                <label className="text-white/60 text-sm mb-2 block">Сумма:</label>
                <input
                  type="number"
                  placeholder="+ начислить / - списать"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-500/30"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAdjustModal(false); setAdjustAmount('') }}
                  className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-xl active:scale-95 transition-transform"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAdjustBalance}
                  disabled={!adjustAmount || adjusting}
                  className="flex-1 px-4 py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-xl active:scale-95 transition-transform disabled:opacity-50"
                >
                  {adjusting ? '...' : 'Применить'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Модалка добавления билетов */}
        {showAddTicketsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm border border-white/10">
              <h3 className="text-white text-lg font-bold mb-4">Добавить билеты</h3>

              <div className="mb-4">
                <label className="text-white/60 text-sm mb-2 block">Розыгрыш:</label>
                <select
                  value={ticketGiveawayId}
                  onChange={(e) => setTicketGiveawayId(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-500/30"
                >
                  <option value="">Выберите розыгрыш</option>
                  {activeGiveaways.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="text-white/60 text-sm mb-2 block">Количество:</label>
                <input
                  type="number"
                  min="1"
                  value={ticketCount}
                  onChange={(e) => setTicketCount(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-500/30"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAddTicketsModal(false); setTicketCount('1'); setTicketGiveawayId('') }}
                  className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-xl active:scale-95 transition-transform"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddTickets}
                  disabled={!ticketGiveawayId || !ticketCount || addingTickets}
                  className="flex-1 px-4 py-3 bg-gradient-to-b from-green-500 to-green-600 text-white font-semibold rounded-xl active:scale-95 transition-transform disabled:opacity-50"
                >
                  {addingTickets ? '...' : 'Добавить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ============ СПИСОК ЮЗЕРОВ ============
  return (
    <div className="space-y-4">
      {/* Статистика */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 p-3 text-center">
          <div className="text-white text-xl font-bold">{stats.total}</div>
          <div className="text-white/40 text-xs">Игроков</div>
        </div>
        <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 p-3 text-center">
          <div className="text-[#FFD700] text-xl font-bold">{stats.totalAR.toLocaleString()}</div>
          <div className="text-white/40 text-xs">Всего AR</div>
        </div>
        <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 p-3 text-center">
          <div className="text-blue-400 text-xl font-bold">{stats.totalBUL.toLocaleString()}</div>
          <div className="text-white/40 text-xs">Всего BUL</div>
        </div>
        <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 p-3 text-center">
          <div className="text-green-400 text-xl font-bold">{stats.active24h}</div>
          <div className="text-white/40 text-xs">Активных за 24ч</div>
        </div>
      </div>

      {/* Поиск и кнопка удаления */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Поиск по ID, username, имени..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full px-4 py-3 bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-yellow-500/30"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
        {selectedForDelete.size > 0 && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-3 bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/30 transition-colors whitespace-nowrap"
          >
            Удалить ({selectedForDelete.size})
          </button>
        )}
      </div>

      {/* Таблица */}
      <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-3 py-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={paginatedUsers.length > 0 && paginatedUsers.every(u => selectedForDelete.has(u.telegram_id))}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-white/20 bg-zinc-800 text-red-500 focus:ring-red-500 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wide">
                  Игрок
                </th>
                <th
                  className="px-3 py-3 text-right text-xs font-semibold text-white/50 uppercase tracking-wide cursor-pointer hover:text-white/70"
                  onClick={() => handleSort('balance_ar')}
                >
                  AR <SortIcon field="balance_ar" />
                </th>
                <th
                  className="px-3 py-3 text-right text-xs font-semibold text-white/50 uppercase tracking-wide cursor-pointer hover:text-white/70"
                  onClick={() => handleSort('balance_bul')}
                >
                  BUL <SortIcon field="balance_bul" />
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-white/50 uppercase tracking-wide">
                  Билеты
                </th>
                <th
                  className="px-3 py-3 text-right text-xs font-semibold text-white/50 uppercase tracking-wide cursor-pointer hover:text-white/70"
                  onClick={() => handleSort('last_seen_at')}
                >
                  Был <SortIcon field="last_seen_at" />
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                    {search ? 'Ничего не найдено' : 'Нет игроков'}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`border-b border-white/5 hover:bg-zinc-800/50 transition-colors ${selectedForDelete.has(user.telegram_id) ? 'bg-red-500/10' : ''}`}
                  >
                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedForDelete.has(user.telegram_id)}
                        onChange={() => toggleSelectUser(user.telegram_id)}
                        className="w-4 h-4 rounded border-white/20 bg-zinc-800 text-red-500 focus:ring-red-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-3 cursor-pointer" onClick={() => loadUserProfile(user)}>
                      <div className="flex items-center gap-3">
                        {user.photo_url ? (
                          <img src={user.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm">
                            {user.first_name?.[0] || '?'}
                          </div>
                        )}
                        <div>
                          <div className="text-white text-sm font-medium">
                            {user.first_name || 'Без имени'}
                          </div>
                          <div className="text-white/40 text-xs">
                            {user.username ? `@${user.username}` : user.telegram_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-[#FFD700] cursor-pointer" onClick={() => loadUserProfile(user)}>
                      {user.balance_ar.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-blue-400 cursor-pointer" onClick={() => loadUserProfile(user)}>
                      {user.balance_bul.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-center text-sm text-white/60 cursor-pointer" onClick={() => loadUserProfile(user)}>
                      {user.tickets_count || 0}
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-white/40 cursor-pointer" onClick={() => loadUserProfile(user)}>
                      {formatTimeAgo(user.last_seen_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модалка подтверждения удаления */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm border border-white/10">
            <h3 className="text-white text-lg font-bold mb-4">Подтверждение удаления</h3>
            <p className="text-white/70 mb-6">
              Вы уверены, что хотите удалить <span className="text-red-400 font-bold">{selectedForDelete.size}</span> юзер(ов)?
              <br /><br />
              Это действие нельзя отменить.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-xl active:scale-95 transition-transform"
              >
                Отмена
              </button>
              <button
                onClick={handleMassDelete}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-red-500 text-white font-semibold rounded-xl active:scale-95 transition-transform disabled:opacity-50"
              >
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-zinc-800 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Назад
          </button>
          <div className="text-white/60 text-sm">
            Страница {page} из {totalPages}
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-zinc-800 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Вперёд →
          </button>
        </div>
      )}
    </div>
  )
}
