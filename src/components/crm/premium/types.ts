// ============ ТИПЫ ДЛЯ PREMIUM ============

import type { PremiumClient, PaymentRecord, SortByOption, PremiumFilter } from '../../../types/crm'

// Типы для модалок
export interface TicketTarget {
  id: number
  name: string
}

export interface Giveaway {
  id: string
  title: string
  price: number
}

export interface PremiumTabProps {
  premiumClients: PremiumClient[]
  paymentHistory: PaymentRecord[]
  getAuthHeaders: () => Record<string, string>
  showToast: (opts: { variant: 'success' | 'error'; title: string }) => void
  onDataChange: () => void
}

export interface PremiumStats {
  totalRub: number
  totalUsd: number
  totalUsdt: number
  totalEur: number
  paidCount: number
}

// Re-export типы из crm для удобства
export type { PremiumClient, PaymentRecord, SortByOption, PremiumFilter }
