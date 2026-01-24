// ============ ТИПЫ ДЛЯ УПРАВЛЕНИЯ ПОЛЬЗОВАТЕЛЯМИ ============

import type { UserSkin as BaseUserSkin } from '../../../types'

export interface AppUser {
  id: string  // UUID в Supabase
  telegram_id: string
  username: string | null
  first_name: string | null
  last_name: string | null
  photo_url: string | null
  balance_ar: number
  balance_bul: number
  level: number
  xp: number
  energy: number
  energy_max: number
  active_skin: string | null
  created_at: string
  last_seen_at: string | null
  referrer_id: string | null
  // Computed
  tickets_count?: number
}

export interface Transaction {
  id: string  // UUID
  currency: string
  amount: number
  type: string
  description: string | null
  created_at: string
}

// Расширенный UserSkin для админки с дополнительными полями
export interface UserSkin extends BaseUserSkin {
  is_active: boolean
  skin_name?: string
  skin_rarity?: string
}

export interface UserEquipment {
  equipment_slug: string
  quantity: number
  equipment_name?: string
  income_per_hour?: number
}

export interface GiveawayTicket {
  giveaway_id: string
  ticket_number: number
  giveaway_name?: string
  giveaway_status?: string
}

export interface PremiumStatus {
  plan: string
  expires_at: string
  in_channel: boolean
  in_chat: boolean
  total_paid_usd: number
}

export interface ActiveGiveaway {
  id: string
  name: string
}

export type SortField = 'created_at' | 'balance_ar' | 'balance_bul' | 'level' | 'last_seen_at'

// Статистика для списка пользователей
export interface UsersStats {
  total: number
  totalAR: number
  totalBUL: number
  active24h: number
}
