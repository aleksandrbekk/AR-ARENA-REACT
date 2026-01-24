import { useState } from 'react'
import type { AppUser, SortField, UsersStats } from './types'

// ============ PROPS ============
interface UsersListProps {
  users: AppUser[]
  stats: UsersStats
  loading: boolean
  onSelectUser: (user: AppUser) => void
  onDeleteUsers: (telegramIds: string[]) => Promise<void>
}

// ============ CONSTANTS ============
const ITEMS_PER_PAGE = 20

// ============ HELPERS ============
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
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  })
}

// ============ КОМПОНЕНТ ============
export function UsersList({
  users,
  stats,
  loading,
  onSelectUser,
  onDeleteUsers
}: UsersListProps) {
  // Поиск и фильтрация
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(1)

  // Выбор для удаления
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
      let aVal: string | number | null = a[sortField]
      let bVal: string | number | null = b[sortField]

      if (sortField === 'last_seen_at' || sortField === 'created_at') {
        aVal = aVal ? new Date(aVal as string).getTime() : 0
        bVal = bVal ? new Date(bVal as string).getTime() : 0
      }

      if (sortAsc) {
        return (aVal ?? 0) > (bVal ?? 0) ? 1 : -1
      }
      return (aVal ?? 0) < (bVal ?? 0) ? 1 : -1
    })

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const paginatedUsers = filteredUsers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // ============ СОРТИРОВКА ============
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

  // ============ УДАЛЕНИЕ ============
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

  const handleMassDelete = async () => {
    if (selectedForDelete.size === 0) return

    setDeleting(true)
    try {
      await onDeleteUsers(Array.from(selectedForDelete))
      setSelectedForDelete(new Set())
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  // ============ LOADING ============
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#FFD700] text-sm font-mono animate-pulse">Загрузка игроков...</div>
      </div>
    )
  }

  // ============ RENDER ============
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
                    <td className="px-3 py-3 cursor-pointer" onClick={() => onSelectUser(user)}>
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
                    <td className="px-3 py-3 text-right text-sm font-semibold text-[#FFD700] cursor-pointer" onClick={() => onSelectUser(user)}>
                      {user.balance_ar.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-blue-400 cursor-pointer" onClick={() => onSelectUser(user)}>
                      {user.balance_bul.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-center text-sm text-white/60 cursor-pointer" onClick={() => onSelectUser(user)}>
                      {user.tickets_count || 0}
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-white/40 cursor-pointer" onClick={() => onSelectUser(user)}>
                      {formatTimeAgo(user.last_seen_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  )
}
