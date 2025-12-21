import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'

// ============ ТИПЫ ============
interface Tariff {
  id: string
  name: string
  duration: string
  price: number
  oldPrice: number | null
  discount: string | null
  color: string
  iconColor: string
  gifts: string[]
  isPopular: boolean
}

// ============ ДАННЫЕ ТАРИФОВ ============
const tariffs: Tariff[] = [
  {
    id: 'start',
    name: 'СТАРТ',
    duration: '1 месяц',
    price: 4000,
    oldPrice: null,
    discount: null,
    color: '#CD7F32', // bronze
    iconColor: '#CD7F32',
    gifts: ['Базовый доступ к каналу', 'Сигналы и аналитика'],
    isPopular: false
  },
  {
    id: 'growth',
    name: 'РОСТ',
    duration: '3 месяца',
    price: 10200,
    oldPrice: 12000,
    discount: '-15%',
    color: '#C0C0C0', // silver
    iconColor: '#C0C0C0',
    gifts: ['+1 неделя бонусом', 'Запись эфира', 'Портфель 2025'],
    isPopular: false
  },
  {
    id: 'investor',
    name: 'ИНВЕСТОР',
    duration: '6 месяцев',
    price: 19200,
    oldPrice: 24000,
    discount: '-20%',
    color: '#C9A962', // gold
    iconColor: '#C9A962',
    gifts: ['+1 месяц бонусом', 'Чек-лист антискам', 'Шаблон РМ'],
    isPopular: true
  },
  {
    id: 'partner',
    name: 'ПАРТНЁР',
    duration: '12 месяцев',
    price: 33600,
    oldPrice: 48000,
    discount: '-30%',
    color: '#A8D4E6', // ice blue
    iconColor: '#A8D4E6',
    gifts: ['+2 месяца бонусом', 'VIP-чат', 'Созвон 15 мин', 'Разбор портфеля'],
    isPopular: false
  }
]

// ============ ИКОНКИ SVG ============
const ShieldIcon = ({ color }: { color: string }) => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const ChartIcon = ({ color }: { color: string }) => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M18 9l-5 5-4-4-6 6" />
  </svg>
)

const CrownIcon = ({ color }: { color: string }) => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 17l2-11 5 4 3-6 3 6 5-4 2 11H2z" />
    <path d="M2 17h20v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2z" />
  </svg>
)

const DiamondIcon = ({ color }: { color: string }) => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3h12l4 6-10 13L2 9l4-6z" />
    <path d="M2 9h20" />
    <path d="M12 22L6 9" />
    <path d="M12 22l6-13" />
  </svg>
)

const TariffIcon = ({ id, color }: { id: string; color: string }) => {
  switch (id) {
    case 'start': return <ShieldIcon color={color} />
    case 'growth': return <ChartIcon color={color} />
    case 'investor': return <CrownIcon color={color} />
    case 'partner': return <DiamondIcon color={color} />
    default: return null
  }
}

// ============ ТАЙМЕР ============
const Timer = ({ deadline }: { deadline: string }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const target = new Date(deadline).getTime()

    const updateTimer = () => {
      const now = Date.now()
      const diff = Math.max(0, target - now)

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  const pad = (n: number) => n.toString().padStart(2, '0')

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-md bg-white/[0.03] border border-white/[0.05]">
      <div className="text-white/60 text-sm">До конца акции:</div>
      <div className="font-mono text-white text-lg tracking-wider">
        {timeLeft.days > 0 && <span>{timeLeft.days}д </span>}
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </div>
    </div>
  )
}

// ============ СНЕЖИНКИ ============
const Snowflakes = () => {
  const snowflakes = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      size: 2 + Math.random() * 4,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 15 + Math.random() * 10
    })), []
  )

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {snowflakes.map((flake) => (
        <motion.div
          key={flake.id}
          className="absolute rounded-full bg-white"
          style={{
            width: flake.size,
            height: flake.size,
            left: `${flake.left}%`,
            top: -10,
            opacity: 0.05 + Math.random() * 0.05,
            filter: 'blur(1px)'
          }}
          animate={{
            y: ['0vh', '110vh'],
            x: [0, Math.sin(flake.id) * 50]
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

// ============ ЗОЛОТЫЕ ЧАСТИЦЫ ============
const GoldParticles = () => {
  const particles = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      size: 1 + Math.random() * 2,
      x: 40 + Math.random() * 20,
      y: 30 + Math.random() * 40,
      delay: Math.random() * 3
    })), []
  )

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: '#C9A962',
            opacity: 0.2
          }}
          animate={{
            y: [-5, 5, -5],
            opacity: [0.2, 0.35, 0.2]
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  )
}

// ============ КАРТОЧКА ТАРИФА ============
const TariffCard = ({ tariff }: { tariff: Tariff }) => {
  const isInvestor = tariff.isPopular

  return (
    <motion.div
      className="relative"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Золотые частицы для премиум карточек */}
      {(tariff.id === 'investor' || tariff.id === 'partner') && <GoldParticles />}

      {/* Бейдж ВЫБОР КЛУБА */}
      {isInvestor && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <div
            className="px-3 py-1 text-xs font-medium rounded-full border"
            style={{
              color: '#C9A962',
              borderColor: 'rgba(201, 169, 98, 0.5)',
              background: 'rgba(201, 169, 98, 0.1)'
            }}
          >
            ВЫБОР КЛУБА
          </div>
        </div>
      )}

      <motion.div
        className="relative h-full p-6 rounded-lg"
        style={{
          background: '#0d0d0d',
          border: isInvestor
            ? '1px solid rgba(201, 169, 98, 0.3)'
            : '1px solid rgba(255, 255, 255, 0.05)',
          transform: isInvestor ? 'scale(1.02)' : 'scale(1)',
          boxShadow: isInvestor
            ? '0 0 40px rgba(201, 169, 98, 0.15)'
            : 'none'
        }}
        animate={isInvestor ? {
          boxShadow: [
            '0 0 40px rgba(201, 169, 98, 0.15)',
            '0 0 50px rgba(201, 169, 98, 0.25)',
            '0 0 40px rgba(201, 169, 98, 0.15)'
          ]
        } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Иконка */}
        <div className="mb-4">
          <TariffIcon id={tariff.id} color={tariff.iconColor} />
        </div>

        {/* Название */}
        <h3
          className="text-lg font-bold mb-1 tracking-wide"
          style={{ color: tariff.color }}
        >
          {tariff.name}
        </h3>
        <div className="text-white/50 text-sm mb-4">{tariff.duration}</div>

        {/* Цена */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {tariff.price.toLocaleString('ru-RU')} ₽
            </span>
            {tariff.discount && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded"
                style={{
                  color: tariff.color,
                  background: `${tariff.color}15`
                }}
              >
                {tariff.discount}
              </span>
            )}
          </div>
          {tariff.oldPrice && (
            <div className="text-white/30 text-sm line-through">
              {tariff.oldPrice.toLocaleString('ru-RU')} ₽
            </div>
          )}
        </div>

        {/* Подарки */}
        <div className="space-y-2 mb-6">
          {tariff.gifts.map((gift, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-white/70">
              <span style={{ color: tariff.color }}>+</span>
              <span>{gift}</span>
            </div>
          ))}
        </div>

        {/* Кнопка */}
        <TariffButton tariff={tariff} />
      </motion.div>
    </motion.div>
  )
}

// ============ КНОПКА С SHIMMER ============
const TariffButton = ({ tariff }: { tariff: Tariff }) => {
  const isInvestor = tariff.isPopular

  return (
    <motion.button
      className="relative w-full py-3 rounded-lg font-medium overflow-hidden transition-all"
      style={isInvestor ? {
        background: 'linear-gradient(135deg, #C9A962 0%, #B8954F 100%)',
        color: '#000'
      } : {
        background: 'transparent',
        border: `1px solid ${tariff.color}40`,
        color: tariff.color
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 -translate-x-full"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
          width: '100%'
        }}
        animate={{ x: ['0%', '200%'] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatDelay: 3,
          ease: 'easeInOut'
        }}
      />
      <span className="relative z-10">Выбрать</span>
    </motion.button>
  )
}

// ============ ГЛАВНАЯ СТРАНИЦА ============
export function TariffsPage() {
  // 96 часов от 23.12.2025 18:00 МСК = 27.12.2025 18:00 МСК
  const deadline = '2025-12-27T18:00:00+03:00'

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, #0a0a0a 0%, #050505 100%)'
      }}
    >
      {/* Холодный оттенок */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(100, 150, 200, 0.02) 0%, transparent 50%)'
        }}
      />

      {/* Снежинки */}
      <Snowflakes />

      {/* Контент */}
      <div className="relative z-10 px-4 py-12 max-w-6xl mx-auto">

        {/* Header */}
        <header className="text-center mb-12">
          <div className="text-white/40 text-sm tracking-[0.3em] uppercase mb-2">
            Premium AR Club
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-6 tracking-wide">
            Новогоднее предложение
          </h1>
          <Timer deadline={deadline} />
        </header>

        {/* Карточки тарифов */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {tariffs.map((tariff) => (
            <TariffCard key={tariff.id} tariff={tariff} />
          ))}
        </div>

        {/* Footer */}
        <footer className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4 text-white/40 text-sm flex-wrap">
            <span>82.2% точность</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>5000+ участников</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>С 2022 года</span>
          </div>
          <div className="text-white/30 text-xs">
            Акция 96 часов с 23.12.2025
          </div>
        </footer>
      </div>
    </div>
  )
}
