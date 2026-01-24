// ============ ХЕЛПЕРЫ ДЛЯ PREMIUM ============

import type { PremiumClient } from './types'

// Дни до окончания подписки
export const getDaysRemaining = (expiresAt: string): number => {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// Форматирование даты коротко
export const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('ru-RU')

// Форматирование даты полностью
export const formatFullDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Текущий месяц в формате YYYY-MM
export const currentMonth = (() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})()

// Названия месяцев
export const monthNames: Record<string, string> = {
  '01': 'Январь', '02': 'Февраль', '03': 'Март', '04': 'Апрель',
  '05': 'Май', '06': 'Июнь', '07': 'Июль', '08': 'Август',
  '09': 'Сентябрь', '10': 'Октябрь', '11': 'Ноябрь', '12': 'Декабрь'
}

// Форматирование месяца для отображения
export const formatMonthLabel = (m: string) => {
  const [year, month] = m.split('-')
  return `${monthNames[month]} ${year}`
}

// Первая буква имени для аватара
export const getPremiumInitial = (client: PremiumClient) =>
  (client.first_name || client.username || '?')[0]?.toUpperCase()

// Форматирование суммы оплаты
export const formatAmount = (client: PremiumClient) => {
  const amount = client.original_amount || 0
  const currency = client.currency || 'RUB'
  const symbols: Record<string, string> = { RUB: '₽', USD: '$', EUR: '€', USDT: 'USDT' }
  return `${amount.toLocaleString('ru-RU')} ${symbols[currency] || currency}`
}

// Цвет оставшихся дней
export const getDaysColor = (d: number) => {
  if (d <= 0) return 'text-red-400'
  if (d <= 3) return 'text-red-400'
  if (d <= 7) return 'text-orange-400'
  return 'text-emerald-400'
}

// Стиль плана
export const getPlanStyle = (plan: string) => {
  switch (plan?.toLowerCase()) {
    case 'private': return 'bg-purple-500/20 text-purple-400'
    case 'platinum': return 'bg-cyan-500/20 text-cyan-400'
    case 'gold': return 'bg-[#FFD700]/20 text-[#FFD700]'
    default: return 'bg-zinc-700/50 text-white/70'
  }
}
