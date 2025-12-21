import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

// ============ СТИЛИ ДЛЯ AURORA ============
const auroraStyles = `
  @keyframes aurora-rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes aurora-rotate-fast {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`

// ============ ТИПЫ ============
interface Tariff {
  id: string
  name: string
  duration: string
  durationShort: string
  price: number
  oldPrice: number | null
  discount: string | null
  badge: string | null
  auroraColors: [string, string]
  auroraOpacity: number
  auroraBlur: number
  auroraSpeed: number
  isFeatured: boolean
  baseFeatures: string[]
  bonuses: string[]
  buttonStyle: 'outline' | 'fill'
  buttonColor: string
}

// ============ ДАННЫЕ ТАРИФОВ ============
const tariffs: Tariff[] = [
  {
    id: 'classic',
    name: 'CLASSIC',
    duration: '1 месяц',
    durationShort: '/мес',
    price: 4000,
    oldPrice: null,
    discount: null,
    badge: null,
    auroraColors: ['#4a4a4a', '#2a2a2a'],
    auroraOpacity: 0.3,
    auroraBlur: 15,
    auroraSpeed: 10,
    isFeatured: false,
    baseFeatures: [
      'Торговые сигналы (82% точность)',
      'Авторская аналитика',
      '900+ обучающих материалов',
      'Закрытый чат клуба',
      'AMA-сессии с Алексеем'
    ],
    bonuses: [],
    buttonStyle: 'outline',
    buttonColor: '#666666'
  },
  {
    id: 'gold',
    name: 'GOLD',
    duration: '3 месяца',
    durationShort: '/3 мес',
    price: 10200,
    oldPrice: 12000,
    discount: '-15%',
    badge: null,
    auroraColors: ['#C9A962', '#FFA500'],
    auroraOpacity: 0.5,
    auroraBlur: 20,
    auroraSpeed: 8,
    isFeatured: false,
    baseFeatures: [
      'Торговые сигналы (82% точность)',
      'Авторская аналитика',
      '900+ обучающих материалов',
      'Закрытый чат клуба',
      'AMA-сессии с Алексеем'
    ],
    bonuses: [
      'Запись эфира "Крипто-итоги 2025"',
      'Портфель 2025 (PDF)',
      '+1 неделя бесплатно'
    ],
    buttonStyle: 'outline',
    buttonColor: '#C9A962'
  },
  {
    id: 'platinum',
    name: 'PLATINUM',
    duration: '6 месяцев',
    durationShort: '/6 мес',
    price: 19200,
    oldPrice: 24000,
    discount: '-20%',
    badge: 'ПОПУЛЯРНЫЙ',
    auroraColors: ['#7B68EE', '#06B6D4'],
    auroraOpacity: 0.7,
    auroraBlur: 25,
    auroraSpeed: 6,
    isFeatured: true,
    baseFeatures: [
      'Торговые сигналы (82% точность)',
      'Авторская аналитика',
      '900+ обучающих материалов',
      'Закрытый чат клуба',
      'AMA-сессии с Алексеем'
    ],
    bonuses: [
      'Запись эфира "Крипто-итоги 2025"',
      'Портфель 2025 (PDF)',
      'Чек-лист "Антискам"',
      'Шаблон риск-менеджмента',
      '+1 месяц бесплатно'
    ],
    buttonStyle: 'fill',
    buttonColor: '#7B68EE'
  },
  {
    id: 'private',
    name: 'PRIVATE',
    duration: '12 месяцев',
    durationShort: '/год',
    price: 33600,
    oldPrice: 48000,
    discount: '-30%',
    badge: 'VIP',
    auroraColors: ['#8B5CF6', '#EC4899'],
    auroraOpacity: 0.6,
    auroraBlur: 22,
    auroraSpeed: 7,
    isFeatured: false,
    baseFeatures: [
      'Торговые сигналы (82% точность)',
      'Авторская аналитика',
      '900+ обучающих материалов',
      'Закрытый чат клуба',
      'AMA-сессии с Алексеем'
    ],
    bonuses: [
      'Запись эфира "Крипто-итоги 2025"',
      'Портфель 2025 (PDF)',
      'Чек-лист "Антискам"',
      'Шаблон риск-менеджмента',
      'VIP-чат с Алексеем',
      'Welcome-созвон 15 мин',
      'Персональный разбор портфеля',
      '+2 месяца бесплатно'
    ],
    buttonStyle: 'outline',
    buttonColor: '#EC4899'
  }
]

// ============ ТАЙМЕР ============
const Timer = ({ deadline }: { deadline: string }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const target = new Date(deadline).getTime()

    const updateTimer = () => {
      const now = Date.now()
      const diff = Math.max(0, target - now)

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  const pad = (n: number) => n.toString().padStart(2, '0')

  return (
    <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/[0.03] border border-white/[0.08]">
      <span className="text-white/40 text-sm">До конца акции:</span>
      <span className="font-mono text-white text-lg tracking-wider">
        {timeLeft.days > 0 && <span className="text-white/70">{timeLeft.days}д </span>}
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
    </div>
  )
}

// ============ СНЕЖИНКИ ============
const Snowflakes = () => {
  const flakes = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 3,
    left: Math.random() * 100,
    delay: Math.random() * 10,
    duration: 20 + Math.random() * 10
  }))

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {flakes.map((flake) => (
        <motion.div
          key={flake.id}
          className="absolute rounded-full bg-white"
          style={{
            width: flake.size,
            height: flake.size,
            left: `${flake.left}%`,
            top: -10,
            opacity: 0.06,
            filter: 'blur(1px)'
          }}
          animate={{
            y: ['0vh', '105vh'],
            x: [0, Math.sin(flake.id) * 20]
          }}
          transition={{
            duration: flake.duration,
            delay: flake.delay,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      ))}
    </div>
  )
}

// ============ КАРТОЧКА ТАРИФА ============
const PricingCard = ({ tariff, index }: { tariff: Tariff; index: number }) => {
  const { isFeatured } = tariff

  return (
    <motion.div
      className={`relative ${isFeatured ? 'lg:scale-105 lg:z-10' : ''}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      {/* Aurora glow container */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          background: '#08080a'
        }}
      >
        {/* Aurora ::before effect */}
        <div
          className="absolute inset-[-2px] rounded-xl"
          style={{
            background: `conic-gradient(
              from 0deg,
              transparent 0deg,
              ${tariff.auroraColors[0]} 60deg,
              ${tariff.auroraColors[1]} 120deg,
              transparent 180deg,
              ${tariff.auroraColors[0]} 240deg,
              ${tariff.auroraColors[1]} 300deg,
              transparent 360deg
            )`,
            filter: `blur(${tariff.auroraBlur}px)`,
            opacity: tariff.auroraOpacity,
            animation: `aurora-rotate ${tariff.auroraSpeed}s linear infinite`,
            zIndex: 0
          }}
        />

        {/* Inner background (::after) */}
        <div
          className="absolute inset-[1px] rounded-[11px]"
          style={{ background: '#08080a', zIndex: 1 }}
        />

        {/* Content */}
        <div className={`relative z-[2] ${isFeatured ? 'p-8' : 'p-6'}`}>
          {/* Badge - скидка */}
          {tariff.discount && (
            <div
              className="absolute top-4 right-4 px-2.5 py-1 rounded-md text-xs font-semibold"
              style={{
                background: `${tariff.auroraColors[0]}20`,
                color: tariff.auroraColors[0]
              }}
            >
              {tariff.discount}
            </div>
          )}

          {/* Badge - статус */}
          {tariff.badge && (
            <div
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wider mb-4"
              style={{
                background: `${tariff.auroraColors[0]}20`,
                color: tariff.auroraColors[0],
                border: `1px solid ${tariff.auroraColors[0]}40`
              }}
            >
              {tariff.badge}
            </div>
          )}

          {/* Название */}
          <h3
            className="text-xl font-semibold tracking-wider mb-1"
            style={{ color: isFeatured ? tariff.auroraColors[0] : '#ffffff' }}
          >
            {tariff.name}
          </h3>

          {/* Срок */}
          <div className="text-gray-500 text-sm mb-6">{tariff.duration}</div>

          {/* Цена */}
          <div className="mb-6">
            {tariff.oldPrice && (
              <div className="text-gray-600 text-sm line-through mb-1">
                {tariff.oldPrice.toLocaleString('ru-RU')} ₽
              </div>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold text-white">
                {tariff.price.toLocaleString('ru-RU')}
              </span>
              <span className="text-gray-500 text-lg">₽</span>
              <span className="text-gray-600 text-sm">{tariff.durationShort}</span>
            </div>
          </div>

          {/* Разделитель */}
          <div className="h-px bg-white/10 mb-6" />

          {/* Базовые функции */}
          <div className="space-y-3 mb-6">
            {tariff.baseFeatures.map((feature, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <svg
                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                  style={{ color: tariff.auroraColors[0] }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-300">{feature}</span>
              </div>
            ))}
          </div>

          {/* Бонусы */}
          {tariff.bonuses.length > 0 && (
            <div className="space-y-2 mb-6 p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              {tariff.bonuses.map((bonus, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-lg">🎁</span>
                  <span className="text-gray-400">{bonus}</span>
                </div>
              ))}
            </div>
          )}

          {/* Кнопка */}
          <motion.button
            className={`w-full py-3.5 rounded-lg font-medium transition-all ${
              tariff.buttonStyle === 'fill'
                ? 'text-white'
                : 'bg-transparent'
            }`}
            style={
              tariff.buttonStyle === 'fill'
                ? { background: tariff.buttonColor }
                : {
                    border: `1px solid ${tariff.buttonColor}60`,
                    color: tariff.buttonColor
                  }
            }
            whileHover={{
              scale: 1.02,
              boxShadow: tariff.buttonStyle === 'fill'
                ? `0 0 20px ${tariff.buttonColor}40`
                : 'none'
            }}
            whileTap={{ scale: 0.98 }}
          >
            {tariff.id === 'classic' ? 'Начать' : `Выбрать ${tariff.name}`}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// ============ ГЛАВНАЯ СТРАНИЦА ============
export function PricingPage() {
  const deadline = '2025-12-27T18:00:00+03:00'

  return (
    <>
      {/* Инжектим стили для aurora анимации */}
      <style>{auroraStyles}</style>

      <div className="min-h-screen text-white relative" style={{ background: '#050505' }}>
        {/* Subtle gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(123, 104, 238, 0.03) 0%, transparent 50%)'
          }}
        />

        {/* Снежинки */}
        <Snowflakes />

        {/* Контент */}
        <div className="relative z-10 px-4 py-12 max-w-7xl mx-auto">

          {/* Header */}
          <header className="text-center mb-12">
            <motion.div
              className="text-gray-500 text-sm tracking-[0.4em] uppercase mb-3"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Premium AR Club
            </motion.div>

            <motion.h1
              className="text-4xl md:text-5xl font-bold mb-6 tracking-tight"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Новогоднее предложение
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Timer deadline={deadline} />
            </motion.div>
          </header>

          {/* Карточки тарифов */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 items-start">
            {tariffs.map((tariff, index) => (
              <PricingCard key={tariff.id} tariff={tariff} index={index} />
            ))}
          </div>

          {/* Footer */}
          <footer className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 text-gray-500 text-sm flex-wrap">
              <span>82.2% точность</span>
              <span className="w-1 h-1 rounded-full bg-gray-700" />
              <span>5000+ участников</span>
              <span className="w-1 h-1 rounded-full bg-gray-700" />
              <span>900+ материалов</span>
              <span className="w-1 h-1 rounded-full bg-gray-700" />
              <span>С 2022 года</span>
            </div>
            <div className="text-gray-600 text-xs">
              Акция действует 96 часов с начала эфира 23.12
            </div>
          </footer>
        </div>
      </div>
    </>
  )
}
