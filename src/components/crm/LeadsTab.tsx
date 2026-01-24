/**
 * LeadsTab - Вкладка "База пользователей" в CRM
 *
 * Показывает:
 * - Воронку конверсий (бот → приложение → покупка)
 * - Фильтры по статусу
 * - Список пользователей с индикаторами
 */

import { useState } from 'react'
import type { BotUser, User, PremiumClient, LeadsStatusFilter } from '../../types/crm'

interface LeadsTabProps {
  botUsers: BotUser[]
  users: User[]
  premiumClients: PremiumClient[]
}

export function LeadsTab({ botUsers, users, premiumClients }: LeadsTabProps) {
  const [leadsSearch, setLeadsSearch] = useState('')
  const [leadsStatusFilter, setLeadsStatusFilter] = useState<LeadsStatusFilter>('all')

  // Наборы для быстрой проверки статусов
  const appOpenedSet = new Set(users.map(u => u.telegram_id))
  const purchasedSet = new Set(premiumClients.map(p => p.telegram_id))

  // Статистика воронки
  const totalBot = botUsers.length
  const appOpenedFromBot = botUsers.filter(bu => appOpenedSet.has(bu.telegram_id)).length
  const purchasedFromBot = botUsers.filter(bu => purchasedSet.has(bu.telegram_id)).length

  const appRate = totalBot > 0 ? ((appOpenedFromBot / totalBot) * 100).toFixed(1) : '0'
  const purchaseRate = appOpenedFromBot > 0 ? ((purchasedFromBot / appOpenedFromBot) * 100).toFixed(1) : '0'
  const totalRate = totalBot > 0 ? ((purchasedFromBot / totalBot) * 100).toFixed(1) : '0'

  // Фильтрация списка
  const filteredUsers = botUsers.filter(bu => {
    // Поиск
    if (leadsSearch) {
      const q = leadsSearch.toLowerCase()
      const match = bu.username?.toLowerCase().includes(q) ||
        bu.first_name?.toLowerCase().includes(q) ||
        bu.telegram_id.toString().includes(q)
      if (!match) return false
    }

    // Фильтр по статусу
    const opened = appOpenedSet.has(bu.telegram_id)
    const purchased = purchasedSet.has(bu.telegram_id)

    if (leadsStatusFilter === 'app_opened' && !opened) return false
    if (leadsStatusFilter === 'not_opened' && opened) return false
    if (leadsStatusFilter === 'purchased' && !purchased) return false

    return true
  })

  return (
    <div className="space-y-4">
      {/* Воронка конверсий */}
      <div className="bg-zinc-900 rounded-2xl p-4">
        <h3 className="text-sm text-white/40 uppercase tracking-wide mb-4">Воронка (из бота)</h3>
        <div className="space-y-3">
          {/* Шаг 1: Бот */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white font-medium">Нажали /start</span>
              <span className="text-white font-bold">{totalBot}</span>
            </div>
            <div className="h-3 bg-blue-500/30 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Стрелка */}
          <div className="flex items-center gap-2 text-white/30 text-xs pl-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span>{appRate}%</span>
          </div>

          {/* Шаг 2: Открыли приложение */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white font-medium">Открыли App</span>
              <span className="text-emerald-400 font-bold">{appOpenedFromBot}</span>
            </div>
            <div className="h-3 bg-emerald-500/20 rounded-full overflow-hidden backdrop-blur-sm">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: `${appRate}%` }} />
            </div>
          </div>

          {/* Стрелка */}
          <div className="flex items-center gap-2 text-white/30 text-xs pl-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span>{purchaseRate}%</span>
          </div>

          {/* Шаг 3: Купили */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white font-medium">Купили Premium</span>
              <span className="text-[#FFD700] font-bold">{purchasedFromBot}</span>
            </div>
            <div className="h-3 bg-[#FFD700]/30 rounded-full overflow-hidden">
              <div className="h-full bg-[#FFD700] rounded-full" style={{ width: `${totalRate}%` }} />
            </div>
          </div>

          {/* Итоговая конверсия */}
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-white/50">Конверсия /start → Premium</span>
            <span className="text-[#FFD700] font-bold text-lg">{totalRate}%</span>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'Все' },
          { key: 'app_opened', label: 'Открыли App' },
          { key: 'not_opened', label: 'Не открыли' },
          { key: 'purchased', label: 'Купили' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setLeadsStatusFilter(f.key as LeadsStatusFilter)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              leadsStatusFilter === f.key ? 'bg-white text-black' : 'bg-zinc-800 text-white/60'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Поиск */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={leadsSearch}
          onChange={e => setLeadsSearch(e.target.value)}
          placeholder="Поиск по имени или ID..."
          className="w-full pl-12 pr-4 py-3 bg-zinc-900 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
      </div>

      {/* Счётчик */}
      <div className="text-sm text-white/40">
        Показано: <span className="text-white">{filteredUsers.length}</span> из {botUsers.length}
      </div>

      {/* Список пользователей */}
      <div className="bg-zinc-900 rounded-2xl overflow-hidden">
        {filteredUsers.slice(0, 100).map((bu, i) => {
          const opened = appOpenedSet.has(bu.telegram_id)
          const purchased = purchasedSet.has(bu.telegram_id)

          return (
            <div
              key={bu.id}
              className={`flex items-center gap-3 px-4 py-3 ${i !== 0 ? 'border-t border-white/5' : ''}`}
            >
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white/60 font-medium">
                {(bu.first_name || bu.username || '?')[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {bu.username ? `@${bu.username}` : bu.first_name || bu.telegram_id}
                </div>
                <div className="text-sm text-white/40 truncate flex items-center gap-2">
                  <span>{bu.source || 'direct'}</span>
                  <span className="text-white/20">•</span>
                  <span>{new Date(bu.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {opened && (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center backdrop-blur-sm" title="Открыл приложение">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {purchased && (
                  <div className="w-6 h-6 rounded-full bg-[#FFD700]/20 flex items-center justify-center" title="Купил подписку">
                    <span className="text-[#FFD700] text-xs">$</span>
                  </div>
                )}
                {!opened && !purchased && (
                  <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center" title="Не открыл приложение">
                    <span className="text-white/30 text-xs">—</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {filteredUsers.length === 0 && (
          <div className="py-12 text-center text-white/30">Ничего не найдено</div>
        )}
        {filteredUsers.length > 100 && (
          <div className="py-3 text-center text-white/30 text-sm border-t border-white/5">
            Показаны первые 100 из {filteredUsers.length}
          </div>
        )}
      </div>
    </div>
  )
}
