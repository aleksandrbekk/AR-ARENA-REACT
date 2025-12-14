import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface User {
  id: number
  telegram_id: string
  username: string | null
  first_name: string | null
  balance_ar: number
  balance_bul: number
  level: number
  created_at: string
}

export function UsersTab() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustCurrency, setAdjustCurrency] = useState<'AR' | 'BUL'>('AR')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('id, telegram_id, username, first_name, balance_ar, balance_bul, level, created_at')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    const searchLower = search.toLowerCase()
    return (
      String(user.telegram_id).includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower)
    )
  })

  const handleAdjustBalance = async () => {
    if (!selectedUser || !adjustAmount) return

    try {
      const { data, error } = await supabase.rpc('admin_adjust_balance', {
        p_telegram_id: selectedUser.telegram_id,
        p_currency: adjustCurrency,
        p_amount: parseFloat(adjustAmount)
      })

      if (error) throw error

      if (data?.success) {
        alert(`✅ Успешно начислено ${adjustAmount} ${adjustCurrency}\nНовый баланс: ${data.new_balance}`)
        setShowModal(false)
        setAdjustAmount('')
        // Обновить список пользователей
        fetchUsers()
      } else {
        alert(`❌ Ошибка: ${data?.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      console.error('Error adjusting balance:', err)
      alert(`❌ Ошибка: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/40">Загрузка пользователей...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Поиск */}
      <div className="relative">
        <input
          type="text"
          placeholder="Поиск по telegram_id, username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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

      {/* Статистика */}
      <div className="bg-zinc-900/30 backdrop-blur-sm rounded-xl p-3 border border-white/5">
        <div className="text-white/60 text-sm">
          Найдено: <span className="text-white font-semibold">{filteredUsers.length}</span> из{' '}
          <span className="text-white font-semibold">{users.length}</span>
        </div>
      </div>

      {/* Таблица */}
      <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wide">
                  Telegram ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wide">
                  Username
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-white/50 uppercase tracking-wide">
                  AR
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-white/50 uppercase tracking-wide">
                  BUL
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white/50 uppercase tracking-wide">
                  Level
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white/50 uppercase tracking-wide">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                    {search ? 'Ничего не найдено' : 'Нет пользователей'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-white/5 hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-white font-mono">
                      {user.telegram_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/80">
                      {user.username || user.first_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-[#FFD700]">
                      {user.balance_ar.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-blue-400">
                      {user.balance_bul.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-white/60">
                      {user.level}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedUser(user)
                          setShowModal(true)
                        }}
                        className="px-3 py-1.5 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black text-xs font-semibold rounded-lg active:scale-95 transition-transform"
                      >
                        Начислить
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модалка начисления */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm border border-white/10">
            <h3 className="text-white text-lg font-bold mb-4">
              Начислить валюту
            </h3>

            <div className="mb-4">
              <div className="text-white/60 text-sm mb-1">Пользователь:</div>
              <div className="text-white font-mono text-sm">
                {selectedUser.username || selectedUser.telegram_id}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-white/60 text-sm mb-2 block">Валюта:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAdjustCurrency('AR')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    adjustCurrency === 'AR'
                      ? 'bg-[#FFD700] text-black'
                      : 'bg-zinc-800 text-white/60'
                  }`}
                >
                  AR
                </button>
                <button
                  onClick={() => setAdjustCurrency('BUL')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    adjustCurrency === 'BUL'
                      ? 'bg-blue-500 text-white'
                      : 'bg-zinc-800 text-white/60'
                  }`}
                >
                  BUL
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-white/60 text-sm mb-2 block">Сумма:</label>
              <input
                type="number"
                placeholder="Введите сумму"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-500/30"
              />
              <div className="text-white/40 text-xs mt-1">
                Можно указать отрицательное значение для списания
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false)
                  setAdjustAmount('')
                }}
                className="flex-1 px-4 py-3 bg-zinc-800 text-white rounded-xl active:scale-95 transition-transform"
              >
                Отмена
              </button>
              <button
                onClick={handleAdjustBalance}
                disabled={!adjustAmount}
                className="flex-1 px-4 py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Начислить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
