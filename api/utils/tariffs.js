// ============================================
// TARIFF CONFIGURATION
// Тарифы, маппинг сумм, картинки
// ============================================

// Тарифы по periodicity (от Lava.top)
export const PERIODICITY_TO_PERIOD = {
  'MONTHLY': { days: 30, tariff: 'classic', name: 'CLASSIC' },
  'PERIOD_90_DAYS': { days: 90, tariff: 'gold', name: 'GOLD' },
  'PERIOD_180_DAYS': { days: 180, tariff: 'platinum', name: 'PLATINUM' },
  'PERIOD_YEAR': { days: 365, tariff: 'private', name: 'PRIVATE' }
};

// Маппинг суммы USD на период (для 0xProcessing крипто)
// Широкие диапазоны чтобы учитывать комиссии сети
export const AMOUNT_TO_PERIOD_USD = [
  { min: 45, max: 80, days: 30, tariff: 'classic', name: 'CLASSIC' },
  { min: 120, max: 180, days: 90, tariff: 'gold', name: 'GOLD' },
  { min: 200, max: 300, days: 180, tariff: 'platinum', name: 'PLATINUM' },
  { min: 400, max: 550, days: 365, tariff: 'private', name: 'PRIVATE' }
];

// Маппинг суммы на период по валютам (для Lava)
export const AMOUNT_TO_PERIOD = {
  RUB: [
    { min: 3500, max: 4500, days: 30, tariff: 'classic', name: 'CLASSIC' },
    { min: 9500, max: 12500, days: 90, tariff: 'gold', name: 'GOLD' },
    { min: 17000, max: 25000, days: 180, tariff: 'platinum', name: 'PLATINUM' },
    { min: 34000, max: 50000, days: 365, tariff: 'private', name: 'PRIVATE' }
  ],
  USD: [
    { min: 40, max: 60, days: 30, tariff: 'classic', name: 'CLASSIC' },
    { min: 100, max: 150, days: 90, tariff: 'gold', name: 'GOLD' },
    { min: 180, max: 280, days: 180, tariff: 'platinum', name: 'PLATINUM' },
    { min: 350, max: 500, days: 365, tariff: 'private', name: 'PRIVATE' }
  ],
  EUR: [
    { min: 35, max: 55, days: 30, tariff: 'classic', name: 'CLASSIC' },
    { min: 90, max: 140, days: 90, tariff: 'gold', name: 'GOLD' },
    { min: 170, max: 260, days: 180, tariff: 'platinum', name: 'PLATINUM' },
    { min: 330, max: 480, days: 365, tariff: 'private', name: 'PRIVATE' }
  ]
};

// Курсы конвертации в USD
export const CURRENCY_TO_USD = {
  USD: 1,
  EUR: 1.08,
  RUB: 0.011
};

// Картинки карт для тарифов
export const TARIFF_CARD_IMAGES = {
  'classic': 'https://ararena.pro/cards/classic.png',
  'gold': 'https://ararena.pro/cards/gold.png',
  'platinum': 'https://ararena.pro/cards/platinum.png',
  'private': 'https://ararena.pro/cards/PRIVATE.png'
};

// Минимальные суммы для фильтрации тестовых платежей
export const MIN_AMOUNTS = {
  RUB: 500,
  USD: 10,
  EUR: 10
};
