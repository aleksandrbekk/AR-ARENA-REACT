import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, Edit, Ticket, X, Check, Loader2 } from 'lucide-react'

interface User {
  telegram_id: string
  username: string | null
  first_name: string | null
  last_name: string | null
  photo_url: string | null
  balance_ar: number
  balance_bul: number
  created_at: string
}

interface ActiveGiveaway {
  id: number
  title: string
}

export function UserManager() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeGiveaways, setActiveGiveaways] = useState<ActiveGiveaway[]>([])
  
  // Modal states
  const [ticketModal, setTicketModal] = useState<{ userId: string; userName: string } | null>(null)
  const [selectedGiveaway, setSelectedGiveaway] = useState<number | null>(null)
  const [ticketCount, setTicketCount] = useState(1)
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => {
    fetchActiveGiveaways()
  }, [])

  const fetchActiveGiveaways = async () => {
    const { data } = await supabase
      .from('giveaways')
      .select('id, title')
      .eq('status', 'active')
    if (data) setActiveGiveaways(data)
  }

  const searchUsers = async () => {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`telegram_id.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%`)
        .limit(20)
      
      if (error) throw error
      if (data) setUsers(data)
    } catch (error: any) {
      alert('Ошибка поиска: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBalanceEdit = async (userId: string, currency: 'ar' | 'bul', currentBalance: number) => {
    const amount = prompt(`Изменить баланс ${currency.toUpperCase()}\nТекущий: ${currentBalance}\n\nВведите сумму (отрицательная для вычитания):`)
    if (!amount) return

    const delta = parseFloat(amount)
    if (isNaN(delta)) {
      alert('Неверное число')
      return
    }

    setLoading(true)
    try {
      const column = currency === 'ar' ? 'balance_ar' : 'balance_bul'
      const newBalance = currentBalance + delta

      const { error } = await supabase
        .from('users')
        .update({ [column]: newBalance })
        .eq('telegram_id', userId)

      if (error) throw error

      alert(`✅ Баланс обновлён!\n${currentBalance} → ${newBalance} ${currency.toUpperCase()}`)
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.telegram_id === userId 
          ? { ...u, [column]: newBalance }
          : u
      ))
    } catch (error: any) {
      alert('❌ Ошибка: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGiveTickets = async () => {
    if (!ticketModal || !selectedGiveaway || ticketCount < 1) return

    setModalLoading(true)
    try {
      // 1. Get max ticket number for this giveaway
      const { data: maxData } = await supabase
        .from('giveaway_tickets')
        .select('ticket_number')
        .eq('giveaway_id', selectedGiveaway)
        .order('ticket_number', { ascending: false })
        .limit(1)

      const maxNumber = maxData?.[0]?.ticket_number || 0

      // 2. Generate tickets array
      const tickets = Array.from({ length: ticketCount }, (_, i) => ({
        giveaway_id: selectedGiveaway,
        telegram_id: ticketModal.userId,
        ticket_number: maxNumber + i + 1
      }))

      // 3. Insert tickets
      const { error: insertError } = await supabase
        .from('giveaway_tickets')
        .insert(tickets)

      if (insertError) throw insertError

      // 4. Update giveaway stats (total_tickets_sold, jackpot)
      const { data: giveaway } = await supabase
        .from('giveaways')
        .select('jackpot_current_amount, price')
        .eq('id', selectedGiveaway)
        .single()

      if (giveaway) {
        await supabase
          .from('giveaways')
          .update({
            jackpot_current_amount: giveaway.jackpot_current_amount + (giveaway.price * ticketCount)
          })
          .eq('id', selectedGiveaway)
      }

      alert(`✅ Выдано ${ticketCount} билетов пользователю ${ticketModal.userName}!`)
      setTicketModal(null)
      setTicketCount(1)
      setSelectedGiveaway(null)
    } catch (error: any) {
      alert('❌ Ошибка: ' + error.message)
    } finally {
      setModalLoading(false)
    }
  }

  return (
    <div className="p-6 bg-zinc-900 min-h-screen text-white">
      <h2 className="text-2xl font-bold text-[#FFD700] mb-6">Управление пользователями</h2>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchUsers()}
            placeholder="Поиск по ID, username или имени..."
            className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-[#FFD700]/50 focus:outline-none"
          />
        </div>
        <button
          onClick={searchUsers}
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Найти'}
        </button>
      </div>

      {/* Users Table */}
      {users.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-white/50 text-sm border-b border-white/10">
                <th className="pb-3">Пользователь</th>
                <th className="pb-3">Баланс AR</th>
                <th className="pb-3">Баланс BUL</th>
                <th className="pb-3">Регистрация</th>
                <th className="pb-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.telegram_id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      {user.photo_url ? (
                        <img src={user.photo_url} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white/50">
                          {user.first_name?.[0] || '?'}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-xs text-white/40">
                          @{user.username || 'no_username'} • ID: {user.telegram_id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <button
                      onClick={() => handleBalanceEdit(user.telegram_id, 'ar', user.balance_ar)}
                      className="flex items-center gap-1 text-[#FFD700] hover:underline"
                    >
                      {user.balance_ar.toLocaleString()} <Edit size={12} />
                    </button>
                  </td>
                  <td className="py-4">
                    <button
                      onClick={() => handleBalanceEdit(user.telegram_id, 'bul', user.balance_bul)}
                      className="flex items-center gap-1 text-blue-400 hover:underline"
                    >
                      {user.balance_bul.toLocaleString()} <Edit size={12} />
                    </button>
                  </td>
                  <td className="py-4 text-white/50 text-sm">
                    {new Date(user.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="py-4 text-right">
                    <button
                      onClick={() => setTicketModal({ userId: user.telegram_id, userName: user.first_name || user.username || user.telegram_id })}
                      className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm flex items-center gap-1 ml-auto"
                    >
                      <Ticket size={14} /> Выдать билеты
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {users.length === 0 && !loading && (
        <div className="text-center py-12 text-white/30">
          Введите запрос для поиска пользователей
        </div>
      )}

      {/* Give Tickets Modal */}
      {ticketModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-800 rounded-xl p-6 w-full max-w-md border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-[#FFD700]">Выдать билеты</h3>
              <button onClick={() => setTicketModal(null)} className="text-white/50 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/50 mb-1">Пользователь</label>
                <div className="p-3 bg-black/40 rounded-lg text-white">{ticketModal.userName}</div>
              </div>

              <div>
                <label className="block text-sm text-white/50 mb-1">Розыгрыш</label>
                <select
                  value={selectedGiveaway || ''}
                  onChange={e => setSelectedGiveaway(Number(e.target.value))}
                  className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-white"
                >
                  <option value="">Выберите розыгрыш</option>
                  {activeGiveaways.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/50 mb-1">Количество билетов</label>
                <input
                  type="number"
                  min={1}
                  value={ticketCount}
                  onChange={e => setTicketCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-3 bg-black/40 border border-white/10 rounded-lg text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setTicketModal(null)}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-medium"
                >
                  Отмена
                </button>
                <button
                  onClick={handleGiveTickets}
                  disabled={!selectedGiveaway || modalLoading}
                  className="flex-1 py-3 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {modalLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  Выдать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
