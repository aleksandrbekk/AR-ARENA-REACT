// ============ ТИПЫ ДЛЯ UTM ССЫЛОК ============

export interface UtmLink {
  id: number
  name: string
  slug: string
  folder: string | null
  clicks: number
  conversions: number
  created_at: string
}

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

export type TabType = 'payment' | 'tools'

export interface FormData {
  name: string
  slug: string
  folder: string
  tool_type: string
}

export interface PromoStats {
  totalViews: number
  progress25: number
  progress50: number
  progress75: number
  progress100: number
  codeCorrect: number
  codeIncorrect: number
  payments: number
  events: PromoEvent[]
}

export interface PromoEvent {
  id: string
  event_type: string
  utm_slug: string
  code_entered?: string
  progress_percent?: number
  created_at: string
}

export interface FolderStats {
  count: number
  clicks: number
  conversions: number
}
