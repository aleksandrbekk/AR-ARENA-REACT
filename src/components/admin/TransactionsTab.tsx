import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Transaction {
  id: number
  user_id: number
  currency: 'AR' | 'BUL'
  amount: number
  type: string
  description: string
  created_at: string
  // Связанные данные пользователя (через join)
  users?: {
    telegram_id: string
    username: string | null
  }
}

export function TransactionsTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'AR' | 'BUL'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    fetchTransactions()
  }, [filter, typeFilter])

  const fetchTransactions = async () => {
    try {
      setLoading(true)

      // Проверяем, существует ли таблица transactions
      let query = supabase
        .from('transactions')
        .select('*, users(telegram_id, username)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (filter !== 'all') {
        query = query.eq('currency', filter)
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter)
      }

      const { data, error } = await query

      if (error) {
        // Если таблица не существует, показываем пустой массив
        console.warn('Transactions table not found or error:', error)
        setTransactions([])
      } else {
        setTransactions(data || [])
      }
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      purchase: 'Покупка',
      farm_income: 'Ферма',
      giveaway_win: 'Выигрыш',
      task_reward: 'Задание',
      referral: 'Реферал',
      spend: 'Трата',
      admin_adjust: 'Админ'
    }
    return labels[type] || type
  }

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      purchase: 'bg-green-500/20 text-green-500 border-green-500/30',
      farm_income: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
      giveaway_win: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
      task_reward: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
      referral: 'bg-pink-500/20 text-pink-500 border-pink-500/30',
      spend: 'bg-red-500/20 text-red-500 border-red-500/30',
      admin_adjust: 'bg-orange-500/20 text-orange-500 border-orange-500/30'
    }
    const colorClass = colors[type] || 'bg-zinc-700/50 text-white/50 border-white/10'

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-lg border ${colorClass}`}>
        {getTypeLabel(type)}
      </span>
    )
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/40">Загрузка транзакций...</div>
      </div>
    )
  }

  // Если таблица не существует
  if (transactions.length === 0 && filter === 'all' && typeFilter === 'all') {
    return (
      <div className="bg-zinc-900/30 backdrop-blur-sm rounded-xl p-8 border border-white/5 text-center">
        <div className="text-white/40 text-lg mb-2">💳</div>
        <div className="text-white/60 text-base mb-2">
          Таблица транзакций не найдена
        </div>
        <div className="text-white/40 text-sm">
          Создайте таблицу <code className="bg-zinc-800 px-2 py-1 rounded">transactions</code> в Supabase
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <div className="space-y-3">
        {/* Валюта */}
        <div>
          <div className="text-white/50 text-xs mb-2 uppercase tracking-wide">Валюта:</div>
          <div className="flex gap-2">
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
            <button
              onClick={() => setFilter('AR')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                filter === 'AR'
                  ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30'
                  : 'bg-zinc-800 text-white/60 border border-white/10'
              }`}
            >
              AR
            </button>
            <button
              onClick={() => setFilter('BUL')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                filter === 'BUL'
                  ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                  : 'bg-zinc-800 text-white/60 border border-white/10'
              }`}
            >
              BUL
            </button>
          </div>
        </div>

        {/* Тип транзакции */}
        <div>
          <div className="text-white/50 text-xs mb-2 uppercase tracking-wide">Тип:</div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['all', 'purchase', 'farm_income', 'giveaway_win', 'task_reward', 'spend', 'admin_adjust'].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors whitespace-nowrap ${
                  typeFilter === type
                    ? 'bg-zinc-700 text-white border border-white/30'
                    : 'bg-zinc-800 text-white/60 border border-white/10'
                }`}
              >
                {type === 'all' ? 'Все' : getTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="bg-zinc-900/30 backdrop-blur-sm rounded-xl p-3 border border-white/5">
        <div className="text-white/60 text-sm">
          Показано: <span className="text-white font-semibold">{transactions.length}</span> транзакций
        </div>
      </div>

      {/* Таблица транзакций */}
      <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wide">
                  Дата
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wide">
                  Пользователь
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wide">
                  Тип
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-white/50 uppercase tracking-wide">
                  Сумма
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wide">
                  Описание
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                    Нет транзакций
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-white/5 hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-white/60 whitespace-nowrap">
                      {formatDate(tx.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-mono">
                      {tx.users?.username || tx.users?.telegram_id || `ID: ${tx.user_id}`}
                    </td>
                    <td className="px-4 py-3">
                      {getTypeBadge(tx.type)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold">
                      <span className={tx.amount >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()}
                      </span>
                      <span className={tx.currency === 'AR' ? 'text-[#FFD700]' : 'text-blue-400'}>
                        {' '}{tx.currency}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/60">
                      {tx.description}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
