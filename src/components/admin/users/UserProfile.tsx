import { useState } from 'react'
import type { AppUser, Transaction, UserSkin, UserEquipment, GiveawayTicket, PremiumStatus, ActiveGiveaway } from './types'

// ============ PROPS ============
interface UserProfileProps {
  user: AppUser
  transactions: Transaction[]
  skins: UserSkin[]
  equipment: UserEquipment[]
  tickets: GiveawayTicket[]
  premium: PremiumStatus | null
  activeGiveaways: ActiveGiveaway[]
  loading: boolean
  onBack: () => void
  onAdjustBalance: (currency: 'AR' | 'BUL', amount: number) => Promise<void>
  onAddTickets: (giveawayId: string, count: number) => Promise<void>
  onSendMessage: (text: string) => Promise<void>
  onDelete: () => Promise<void>
  onRefresh: () => void
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

// ============ КОМПОНЕНТ ============
export function UserProfile({
  user,
  transactions,
  skins,
  equipment,
  tickets,
  premium,
  activeGiveaways,
  loading,
  onBack,
  onAdjustBalance,
  onAddTickets,
  onSendMessage,
  onDelete,
}: UserProfileProps) {
  // Модалка начисления баланса
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustCurrency, setAdjustCurrency] = useState<'AR' | 'BUL'>('AR')
  const [adjusting, setAdjusting] = useState(false)

  // Модалка добавления билетов
  const [showAddTicketsModal, setShowAddTicketsModal] = useState(false)
  const [ticketGiveawayId, setTicketGiveawayId] = useState('')
  const [ticketCount, setTicketCount] = useState('1')
  const [addingTickets, setAddingTickets] = useState(false)

  // Удаление
  const [deleting, setDeleting] = useState(false)

  // ============ HANDLERS ============
  const handleAdjustBalance = async () => {
    if (!adjustAmount) return
    setAdjusting(true)
    try {
      await onAdjustBalance(adjustCurrency, parseFloat(adjustAmount))
      setShowAdjustModal(false)
      setAdjustAmount('')
    } finally {
      setAdjusting(false)
    }
  }

  const handleAddTickets = async () => {
    if (!ticketGiveawayId || !ticketCount) return
    setAddingTickets(true)
    try {
      await onAddTickets(ticketGiveawayId, parseInt(ticketCount))
      setShowAddTicketsModal(false)
      setTicketCount('1')
      setTicketGiveawayId('')
    } finally {
      setAddingTickets(false)
    }
  }

  const handleSendMessage = async () => {
    const msg = prompt('Введите сообщение:')
    if (msg) {
      await onSendMessage(msg)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Удалить юзера ${user.telegram_id}? Это действие нельзя отменить.`)) return
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  // ============ LOADING ============
  if (loading) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <span>←</span>
          <span>Назад к списку</span>
        </button>
        <div className="flex items-center justify-center py-12">
          <div className="text-[#FFD700] text-sm font-mono animate-pulse">Загрузка профиля...</div>
        </div>
      </div>
    )
  }

  // ============ RENDER ============
  return (
    <div className="space-y-4">
      {/* Кнопка назад */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
      >
        <span>←</span>
        <span>Назад к списку</span>
      </button>

      {/* Шапка профиля */}
      <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 p-4">
        <div className="flex items-center gap-4">
          {user.photo_url ? (
            <img
              src={user.photo_url}
              alt=""
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center text-2xl">
              {user.first_name?.[0] || '?'}
            </div>
          )}
          <div className="flex-1">
            <div className="text-white text-lg font-semibold">
              {user.first_name || 'Без имени'}
              {user.username && (
                <span className="text-white/50 font-normal ml-2">@{user.username}</span>
              )}
            </div>
            <div className="text-white/40 text-sm font-mono">{user.telegram_id}</div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-white/40 text-xs">
                Зарег: {formatDate(user.created_at)}
              </span>
              <span className="text-white/40 text-xs">
                Был: {formatTimeAgo(user.last_seen_at)}
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
              {user.balance_ar.toLocaleString()}
            </div>
            <div className="text-white/40 text-sm">AR</div>
          </div>
          <div>
            <div className="text-blue-400 text-2xl font-bold">
              {user.balance_bul.toLocaleString()}
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

      {/* Премиум статус */}
      {premium && (
        <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-md rounded-xl border border-purple-500/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-purple-300 text-xs uppercase tracking-wide font-semibold">Premium</div>
            <div className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
              new Date(premium.expires_at) > new Date()
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {new Date(premium.expires_at) > new Date() ? 'Активен' : 'Истёк'}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-purple-300 text-lg font-bold uppercase">{premium.plan}</div>
              <div className="text-white/40 text-xs">Тариф</div>
            </div>
            <div>
              <div className="text-white text-lg font-bold">${premium.total_paid_usd}</div>
              <div className="text-white/40 text-xs">Оплачено</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="text-white/60 text-sm">
              До: <span className="text-white">{new Date(premium.expires_at).toLocaleDateString('ru-RU')}</span>
            </div>
            <div className="flex gap-3 mt-2">
              <div className={`text-xs ${premium.in_channel ? 'text-green-400' : 'text-red-400'}`}>
                Канал: {premium.in_channel ? '✓' : '✗'}
              </div>
              <div className={`text-xs ${premium.in_chat ? 'text-green-400' : 'text-red-400'}`}>
                Чат: {premium.in_chat ? '✓' : '✗'}
              </div>
            </div>
          </div>
        </div>
      )}

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
        {tickets.length === 0 ? (
          <div className="text-white/40 text-sm">Нет билетов</div>
        ) : (
          <div className="space-y-2">
            <div className="text-white font-semibold">
              Всего: {tickets.length} билет(ов)
            </div>
            <div className="text-white/60 text-sm">
              Номера: {tickets.map(t => t.ticket_number).slice(0, 10).join(', ')}
              {tickets.length > 10 && ` и ещё ${tickets.length - 10}...`}
            </div>
          </div>
        )}
      </div>

      {/* История транзакций */}
      <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 p-4">
        <div className="text-white/50 text-xs uppercase tracking-wide mb-3">
          История транзакций ({transactions.length})
        </div>
        {transactions.length === 0 ? (
          <div className="text-white/40 text-sm">Нет транзакций</div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {transactions.slice(0, 20).map(tx => (
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
          Скины ({skins.length})
        </div>
        {skins.length === 0 ? (
          <div className="text-white/40 text-sm">Нет купленных скинов</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skins.map(skin => (
              <div
                key={skin.skin_id}
                className={`px-3 py-1 rounded-lg text-sm ${skin.is_active ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-zinc-800 text-white/60'}`}
              >
                Скин #{skin.skin_id} {skin.is_active && '✓'}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ферма */}
      <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 p-4">
        <div className="text-white/50 text-xs uppercase tracking-wide mb-3">
          Ферма ({equipment.length} оборудования)
        </div>
        {equipment.length === 0 ? (
          <div className="text-white/40 text-sm">Нет оборудования</div>
        ) : (
          <div className="space-y-2">
            {equipment.map(eq => (
              <div key={eq.equipment_slug} className="flex items-center justify-between">
                <div className="text-white">{eq.equipment_slug}</div>
                <div className="text-white/60">{eq.quantity} шт</div>
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
            onClick={handleSendMessage}
            className="w-full px-4 py-3 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-semibold hover:bg-blue-500/30 transition-colors"
          >
            Написать в Telegram
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full px-4 py-3 bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Удаление...' : 'Удалить юзера'}
          </button>
        </div>
      </div>

      {/* ============ МОДАЛКИ ============ */}

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
                {(adjustCurrency === 'AR' ? user.balance_ar : user.balance_bul).toLocaleString()}
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
