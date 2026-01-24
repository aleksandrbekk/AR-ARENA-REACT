/**
 * Типы для CRM системы
 * Используются в FullCrmPage и его подкомпонентах
 */

export interface User {
  id: string
  telegram_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  created_at: string
  status: 'new' | 'active' | 'premium' | 'expired'
  premium_expires?: string | null
}

export interface PremiumClient {
  id: string
  telegram_id: number
  username: string | null
  first_name: string | null
  avatar_url: string | null
  plan: string
  started_at: string
  expires_at: string
  in_channel: boolean
  in_chat: boolean
  total_paid_usd: number
  currency: string | null
  original_amount: number | null
  payments_count: number
  last_payment_at: string | null
  last_payment_method: string | null
  source: string | null
  tags: string[]
}

export interface BotUser {
  id: number
  telegram_id: number
  username: string | null
  first_name: string | null
  source: string | null
  created_at: string
  last_seen_at: string
}

export interface BroadcastRecord {
  id: string
  message: string | null
  image_url: string | null
  recipients_count: number
  filter_type: string | null
  status: 'completed' | 'failed'
  sent_by: string | null
  created_at: string
}

export interface PaymentRecord {
  id: string
  telegram_id: string
  amount: number
  currency: string
  source: string
  created_at: string
  status?: string
}

export interface Giveaway {
  id: string
  title: string
  price: number
}

export type CrmTabType = 'leads' | 'premium' | 'broadcast'
export type LeadsStatusFilter = 'all' | 'app_opened' | 'not_opened' | 'purchased'
export type PremiumFilter = 'all' | 'active' | 'expiring'
export type SortByOption = 'last_payment' | 'expires' | 'total_paid' | 'created'
