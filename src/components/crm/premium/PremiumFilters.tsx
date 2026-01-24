import type { SortByOption, PremiumFilter } from './types'
import { formatMonthLabel } from './helpers'

// ============ PROPS ============
interface PremiumFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  planFilter: string
  onPlanFilterChange: (value: string) => void
  monthFilter: string
  onMonthFilterChange: (value: string) => void
  premiumFilter: PremiumFilter
  onPremiumFilterChange: (value: PremiumFilter) => void
  sortBy: SortByOption
  onSortByChange: (value: SortByOption) => void
  availableMonths: string[]
}

// ============ КОМПОНЕНТ ============
export function PremiumFilters({
  search,
  onSearchChange,
  planFilter,
  onPlanFilterChange,
  monthFilter,
  onMonthFilterChange,
  premiumFilter,
  onPremiumFilterChange,
  sortBy,
  onSortByChange,
  availableMonths
}: PremiumFiltersProps) {
  return (
    <div className="space-y-2">
      {/* Поиск */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Поиск..."
          className="w-full pl-12 pr-4 py-3 bg-zinc-900 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
      </div>

      {/* Dropdown фильтры */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <select
          value={planFilter}
          onChange={e => onPlanFilterChange(e.target.value)}
          className="bg-zinc-900 text-white text-sm rounded-lg px-3 py-2 focus:outline-none min-w-0"
        >
          <option value="all">Все тарифы</option>
          <option value="classic">Classic</option>
          <option value="gold">Gold</option>
          <option value="platinum">Platinum</option>
          <option value="private">Private</option>
        </select>

        <select
          value={monthFilter}
          onChange={e => onMonthFilterChange(e.target.value)}
          className="bg-zinc-900 text-white text-sm rounded-lg px-3 py-2 focus:outline-none min-w-0"
        >
          <option value="all">Все месяцы</option>
          {availableMonths.map(m => (
            <option key={m} value={m}>{formatMonthLabel(m)}</option>
          ))}
        </select>

        <select
          value={premiumFilter}
          onChange={e => onPremiumFilterChange(e.target.value as PremiumFilter)}
          className="bg-zinc-900 text-white text-sm rounded-lg px-3 py-2 focus:outline-none min-w-0"
        >
          <option value="all">Все</option>
          <option value="active">Активные</option>
          <option value="expiring">Истекают</option>
        </select>

        <select
          value={sortBy}
          onChange={e => onSortByChange(e.target.value as SortByOption)}
          className="bg-zinc-900 text-white text-sm rounded-lg px-3 py-2 focus:outline-none min-w-0"
        >
          <option value="last_payment">По платежу</option>
          <option value="expires">По истечению</option>
          <option value="total_paid">По сумме</option>
          <option value="created">По добавлению</option>
        </select>
      </div>
    </div>
  )
}
