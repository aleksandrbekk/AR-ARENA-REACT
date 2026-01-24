/**
 * Типы для админ-панели
 * Используются в UsersTab, UtmLinksTab и других админ-компонентах
 */

// ============ USERS TAB ============

/** Пользователь приложения (из таблицы users) */
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

/** Транзакция пользователя */
export interface Transaction {
  id: string  // UUID
  currency: string
  amount: number
  type: string
  description: string | null
  created_at: string
}

/** Оборудование пользователя */
export interface UserEquipment {
  equipment_slug: string
  quantity: number
  equipment_name?: string
  income_per_hour?: number
}

/** Билет на розыгрыш */
export interface GiveawayTicket {
  giveaway_id: string
  ticket_number: number
  giveaway_name?: string
  giveaway_status?: string
}

/** Статус Premium подписки */
export interface PremiumStatus {
  plan: string
  expires_at: string
  in_channel: boolean
  in_chat: boolean
  total_paid_usd: number
}

/** Скин пользователя (расширенный для админки) */
export interface UserSkinAdmin {
  skin_id: number
  is_equipped: boolean
  is_active: boolean
  purchased_at: string
  skin_name?: string
  skin_rarity?: string
}

/** Поля сортировки пользователей */
export type UserSortField = 'created_at' | 'balance_ar' | 'balance_bul' | 'level' | 'last_seen_at'

// ============ UTM LINKS TAB ============

/** UTM ссылка для отслеживания платежей */
export interface UtmLink {
  id: number
  name: string
  slug: string
  folder: string | null
  clicks: number
  conversions: number
  created_at: string
}

/** UTM ссылка для инструментов/потоков */
export interface UtmToolLink {
  id: number
  name: string
  slug: string
  tool_type: string
  clicks: number
  conversions: number
  created_at: string
  last_click_at: string | null
}

/** Тип вкладки UTM */
export type UtmTabType = 'payment' | 'tools'

// ============ AUTOMATION ============

/** Правило автоматизации */
export interface AutomationRule {
  id: string
  name: string
  trigger: string
  action: string
  is_active: boolean
  created_at: string
}
