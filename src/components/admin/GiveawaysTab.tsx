import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Giveaway {
  id: number
  name: string
  prize_description: string
  ticket_price_ar: number
  jackpot: number
  status: 'active' | 'completed'
  start_date: string
  end_date: string
  is_recurring: boolean
}

interface GiveawayStats {
  ticketsSold: number
  participants: number
}

export function GiveawaysTab() {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active')
  const [stats, setStats] = useState<Record<number, GiveawayStats>>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)

  // Форма создания розыгрыша
  const [formData, setFormData] = useState({
    title: '',
    prize_ar: '',
    ticket_price: '',
    days: '7'
  })

  useEffect(() => {
    fetchGiveaways()
  }, [filter])

  const fetchGiveaways = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('giveaways')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error

      const giveawaysData = data || []
      setGiveaways(giveawaysData)

      // Получить статистику для каждого розыгрыша
      for (const giveaway of giveawaysData) {
        fetchGiveawayStats(giveaway.id)
      }
    } catch (err) {
      console.error('Error fetching giveaways:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchGiveawayStats = async (giveawayId: number) => {
    try {
      // Количество проданных билетов
      const { count: ticketsSold } = await supabase
        .from('giveaway_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('giveaway_id', giveawayId)

      // Количество уникальных участников
      const { data: participants } = await supabase
        .from('giveaway_tickets')
        .select('user_id')
        .eq('giveaway_id', giveawayId)

      const uniqueParticipants = new Set(participants?.map(p => p.user_id)).size

      setStats(prev => ({
        ...prev,
        [giveawayId]: {
          ticketsSold: ticketsSold || 0,
          participants: uniqueParticipants
        }
      }))
    } catch (err) {
      console.error('Error fetching giveaway stats:', err)
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs font-semibold rounded-lg border border-green-500/30">
          Активный
        </span>
      )
    }
    return (
      <span className="px-2 py-1 bg-zinc-700/50 text-white/50 text-xs font-semibold rounded-lg border border-white/10">
        Завершён
      </span>
    )
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const handleCreateGiveaway = async () => {
    if (!formData.title || !formData.prize_ar || !formData.ticket_price || !formData.days) {
      alert('Заполните все поля')
      return
    }

    try {
      setCreating(true)

      // Рассчитать end_date (NOW + days)
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + parseInt(formData.days))

      const { data, error } = await supabase.rpc('admin_create_giveaway', {
        p_title: formData.title,
        p_prize_ar: parseFloat(formData.prize_ar),
        p_ticket_price: parseFloat(formData.ticket_price),
        p_end_date: endDate.toISOString()
      })

      if (error) throw error

      if (data?.success) {
        alert(`✅ Розыгрыш создан!\nID: ${data.giveaway_id}`)
        setShowCreateModal(false)
        setFormData({ title: '', prize_ar: '', ticket_price: '', days: '7' })
        fetchGiveaways()
      } else {
        alert(`❌ Ошибка: ${data?.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      console.error('Error creating giveaway:', err)
      alert(`❌ Ошибка: ${err.message}`)
    } finally {
      setCreating(false)
    }
  }

  const handleEndGiveaway = async (giveawayId: number) => {
    if (!confirm('Завершить розыгрыш и выбрать победителя?')) return

    try {
      const { data, error } = await supabase.rpc('admin_end_giveaway', {
        p_giveaway_id: giveawayId
      })

      if (error) throw error

      if (data?.success) {
        alert(`✅ Розыгрыш завершён!\n\nПобедитель: ${data.winner_telegram_id}\nПриз: ${data.prize} AR`)
        fetchGiveaways()
      } else {
        alert(`❌ Ошибка: ${data?.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      console.error('Error ending giveaway:', err)
      alert(`❌ Ошибка: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/40">Загрузка розыгрышей...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
            filter === 'active'
              ? 'bg-green-500/20 text-green-500 border border-green-500/30'
              : 'bg-zinc-800 text-white/60 border border-white/10'
          }`}
        >
          Активные
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
            filter === 'completed'
              ? 'bg-zinc-700/50 text-white border border-white/30'
              : 'bg-zinc-800 text-white/60 border border-white/10'
          }`}
        >
          Завершённые
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
            filter === 'all'
              ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
              : 'bg-zinc-800 text-white/60 border border-white/10'
          }`}
        >
          Все
        </button>
      </div>

      {/* Кнопка создать */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full px-4 py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-xl active:scale-95 transition-transform"
      >
        + Создать розыгрыш
      </button>

      {/* Список розыгрышей */}
      <div className="space-y-3">
        {giveaways.length === 0 ? (
          <div className="bg-zinc-900/30 backdrop-blur-sm rounded-xl p-8 border border-white/5 text-center">
            <div className="text-white/40">Нет розыгрышей</div>
          </div>
        ) : (
          giveaways.map((giveaway) => {
            const giveawayStats = stats[giveaway.id]

            return (
              <div
                key={giveaway.id}
                className="bg-zinc-900/50 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-bold">{giveaway.name}</h3>
                      {getStatusBadge(giveaway.status)}
                      {giveaway.is_recurring && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-lg border border-blue-500/30">
                          🔄 Recurring
                        </span>
                      )}
                    </div>
                    <p className="text-white/60 text-sm">{giveaway.prize_description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="text-white/50 text-xs mb-1">Призовой фонд</div>
                    <div className="text-[#FFD700] font-bold text-lg">
                      {giveaway.jackpot.toLocaleString()} AR
                    </div>
                  </div>
                  <div>
                    <div className="text-white/50 text-xs mb-1">Цена билета</div>
                    <div className="text-white font-semibold">
                      {giveaway.ticket_price_ar} AR
                    </div>
                  </div>
                </div>

                {giveawayStats && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-zinc-800/50 rounded-lg p-2">
                      <div className="text-white/50 text-xs">Билетов продано</div>
                      <div className="text-white font-semibold">{giveawayStats.ticketsSold}</div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-2">
                      <div className="text-white/50 text-xs">Участников</div>
                      <div className="text-white font-semibold">{giveawayStats.participants}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="text-white/50">
                    {formatDate(giveaway.start_date)} — {formatDate(giveaway.end_date)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => alert(`[MOCK] Редактировать розыгрыш ${giveaway.id}`)}
                      className="px-3 py-1.5 bg-zinc-700 text-white text-xs font-semibold rounded-lg active:scale-95 transition-transform"
                    >
                      Редактировать
                    </button>
                    {giveaway.status === 'active' && (
                      <button
                        onClick={() => handleEndGiveaway(giveaway.id)}
                        className="px-3 py-1.5 bg-red-500/20 text-red-500 text-xs font-semibold rounded-lg border border-red-500/30 active:scale-95 transition-transform"
                      >
                        Завершить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Модалка создания розыгрыша */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-white/10">
            <h3 className="text-white text-lg font-bold mb-4">
              Создать розыгрыш
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-sm mb-2 block">Название:</label>
                <input
                  type="text"
                  placeholder="Розыгрыш 1000 AR"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-500/30"
                />
              </div>

              <div>
                <label className="text-white/60 text-sm mb-2 block">Призовой фонд (AR):</label>
                <input
                  type="number"
                  placeholder="5000"
                  value={formData.prize_ar}
                  onChange={(e) => setFormData({ ...formData, prize_ar: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-500/30"
                />
              </div>

              <div>
                <label className="text-white/60 text-sm mb-2 block">Цена билета (AR):</label>
                <input
                  type="number"
                  placeholder="10"
                  value={formData.ticket_price}
                  onChange={(e) => setFormData({ ...formData, ticket_price: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-500/30"
                />
              </div>

              <div>
                <label className="text-white/60 text-sm mb-2 block">Длительность (дней):</label>
                <input
                  type="number"
                  placeholder="7"
                  value={formData.days}
                  onChange={(e) => setFormData({ ...formData, days: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-500/30"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setFormData({ title: '', prize_ar: '', ticket_price: '', days: '7' })
                }}
                className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-xl active:scale-95 transition-transform"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateGiveaway}
                disabled={creating || !formData.title || !formData.prize_ar || !formData.ticket_price}
                className="flex-1 px-4 py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
