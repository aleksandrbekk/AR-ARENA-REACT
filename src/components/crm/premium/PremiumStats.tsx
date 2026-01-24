import type { PremiumStats as Stats } from './types'
import { currentMonth, formatMonthLabel } from './helpers'

// ============ PROPS ============
interface PremiumStatsProps {
  stats: Stats
  statsMonth: string
  availableMonths: string[]
  onMonthChange: (month: string) => void
  onShowPayments: () => void
}

// ============ КОМПОНЕНТ ============
export function PremiumStats({
  stats,
  statsMonth,
  availableMonths,
  onMonthChange,
  onShowPayments
}: PremiumStatsProps) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm text-white/40 uppercase tracking-wide">Доход</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onShowPayments}
            className="px-3 py-1.5 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black text-sm font-semibold rounded-lg"
          >
            Выплаты
          </button>
          <select
            value={statsMonth}
            onChange={e => onMonthChange(e.target.value)}
            className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="all">Всё время</option>
            <option value={currentMonth}>Этот месяц</option>
            {availableMonths.filter(m => m !== currentMonth).slice(0, 5).map(m => (
              <option key={m} value={m}>{formatMonthLabel(m)}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.totalUsdt > 0 && (
          <div className="bg-zinc-800/50 rounded-xl p-3">
            <div className="text-white/40 text-xs mb-1">Крипто</div>
            <div className="text-emerald-400 font-bold text-lg">${stats.totalUsdt.toLocaleString('ru-RU')}</div>
          </div>
        )}
        {stats.totalRub > 0 && (
          <div className="bg-zinc-800/50 rounded-xl p-3">
            <div className="text-white/40 text-xs mb-1">Рубли</div>
            <div className="text-blue-400 font-bold text-lg">{stats.totalRub.toLocaleString('ru-RU')} ₽</div>
          </div>
        )}
        {stats.totalUsd > 0 && (
          <div className="bg-zinc-800/50 rounded-xl p-3">
            <div className="text-white/40 text-xs mb-1">USD</div>
            <div className="text-green-400 font-bold text-lg">${stats.totalUsd.toLocaleString('ru-RU')}</div>
          </div>
        )}
        {stats.totalEur > 0 && (
          <div className="bg-zinc-800/50 rounded-xl p-3">
            <div className="text-white/40 text-xs mb-1">EUR</div>
            <div className="text-yellow-400 font-bold text-lg">€{stats.totalEur.toLocaleString('ru-RU')}</div>
          </div>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-sm">
        <span className="text-white/40">Оплат</span>
        <span className="text-white font-medium">{stats.paidCount}</span>
      </div>
    </div>
  )
}
