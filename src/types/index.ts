// Telegram WebApp
export interface Player {
  id: string
  name: string
  avatar: string
}

export interface Ticket {
  user_id: string
  ticket_number: number
  player: Player
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    query_id?: string;
    auth_date?: number;
    hash?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive: boolean) => void;
    hideProgress: () => void;
    setParams: (params: {
      text?: string;
      color?: string;
      text_color?: string;
      is_active?: boolean;
      is_visible?: boolean;
    }) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  requestFullscreen: () => void;
  exitFullscreen: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  openLink: (url: string) => void;
}

// Состояние игры (ответ от get_bull_game_state)
export interface GameState {
  balance_bul: number;
  balance_ar: number;
  energy: number;
  energy_max: number;
  level: number;
  xp: number;
  xp_to_next: number;
  tap_power: number; // Сила тапа (базовая, без бонусов скина)
  active_skin: string;
  last_energy_update: string;
}

// Результат тапа (ответ от process_bull_tap)
export interface TapResult {
  success: boolean;
  message: string;
  balance_bul: number;
  energy: number;
  level: number;
  xp: number;
  xp_to_next: number;
  bul_earned: number;
  xp_earned: number;
  leveled_up: boolean;
}

// Результат восстановления энергии
export interface EnergyResult {
  energy: number;
  energy_max: number;
  energy_restored: number;
  last_energy_update: string;
}

// Полный стейт пользователя в приложении
export interface UserState {
  telegramUser: TelegramUser | null;
  gameState: GameState | null;
  isLoading: boolean;
  error: string | null;
}

// Редкость скинов
export type SkinRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

// Скин из таблицы skins
export interface Skin {
  id: number
  name: string
  file: string
  rarity: SkinRarity
  skin_type: 'bul' | 'ar'
  price_bul: number
  price_ar: number
  level_req: number
  refs_req: number
  tap_bonus: number
  regen_bonus: number
  farm_bonus: number
  description: string | null
}

// Купленный скин пользователя из таблицы user_skins
export interface UserSkin {
  skin_id: number
  is_equipped: boolean
  purchased_at: string
}

// ==================== DRAW RESULT TYPES ====================

// Участник розыгрыша
export interface DrawParticipant {
  ticket_number: number
  user_id: string
  username: string
}

// Спин в полуфинале (Traffic Light)
export interface SemifinalSpin {
  spin: number
  ticket: number
  hits: number
}

// Выбывший игрок в полуфинале
export interface EliminatedPlayer extends DrawParticipant {
  place: number
  hits: number
}

// Ход в финале (Battle of Traders)
export interface FinalTurn {
  turn: number
  player: number
  playerName: string
  result: 'bull' | 'bear'
  bulls: number
  bears: number
}

// Счёт игрока в финале
export interface PlayerScore {
  bulls: number
  bears: number
  place: number | null
}

// Победитель
export interface DrawWinner {
  place: number
  ticket_number: number
  user_id: string
  username: string
  bulls?: number
  bears?: number
}

// Полная структура результатов розыгрыша (4 этапа)
export interface DrawResults {
  success: boolean
  generated_at: string
  seed: number
  total_participants: number
  total_tickets: number

  // Tour 1: 20 из всех билетов
  tour1: {
    winners: number[]  // номера билетов
    participants: DrawParticipant[]
  }

  // Tour 2: 5 финалистов из 20
  tour2: {
    selected_indices: number[]
    finalists: DrawParticipant[]
  }

  // Semifinal: Traffic Light (выбивание 2 из 5)
  semifinal: {
    spins: SemifinalSpin[]
    eliminated: EliminatedPlayer[]  // места 4-5
    finalists3: DrawParticipant[]   // 3 оставшихся
  }

  // Final: Battle of Traders (места 1-2-3)
  final: {
    turn_order: number[]
    turn_order_names: string[]
    turns: FinalTurn[]
    player_scores: PlayerScore[]
  }

  // Итоговые победители (места 1-5)
  winners: DrawWinner[]
}

// ==================== GIVEAWAY ====================

export interface Giveaway {
  id: string
  name?: string
  main_title?: string
  title?: string  // fallback
  subtitle: string | null
  description: string | null
  prices?: { ar?: number; bul?: number }
  price?: number  // deprecated
  currency?: 'ar' | 'bul'  // deprecated
  jackpot_current_amount?: number
  end_date: string
  start_date?: string
  status: 'active' | 'completed' | 'cancelled' | 'draft'
  image_url?: string | null

  // Admin Fields
  type?: 'money' | 'course'
  draw_date?: string
  prizes?: {
    place: number
    amount?: number
    percentage?: number
  }[]
  requirements?: {
    telegram_channel_id?: string
    min_friends?: number
  }
  is_recurring?: boolean
  vip_enabled?: boolean
  vip_price?: number

  // Draw Results (generated by Edge Function)
  draw_results?: DrawResults
  winners?: string[]

  // Stats (computed)
  total_participants?: number
  total_tickets_sold?: number
}

// Giveaway с статистикой
export interface GiveawayWithStats extends Giveaway {
  participants_count: number
  total_tickets: number
}

// История участия пользователя
export interface GiveawayHistory extends Giveaway {
  my_tickets: number
  is_winner: boolean
  winner_place: number | null
}

// Информация о победителе для отображения
export interface WinnerInfo {
  telegram_id: string
  place: number
  username?: string
  first_name?: string
  prize_amount?: number
  prize_percentage?: number
}

