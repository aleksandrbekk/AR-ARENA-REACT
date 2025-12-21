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
    baseFeatures: [],
    bonuses: [
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
    baseFeatures: [],
    bonuses: [
      'Чек-лист "Антискам"',
      'Шаблон риск-менеджмента',
      '+1 месяц бесплатно'
    ],
    buttonStyle: 'outline',
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
    auroraColors: ['#9F1239', '#BE123C'],
    auroraOpacity: 0.6,
    auroraBlur: 22,
    auroraSpeed: 7,
    isFeatured: false,
    baseFeatures: [],
    bonuses: [
      'VIP-чат с Алексеем',
      'Welcome-созвон 15 мин',
      'Персональный разбор портфеля',
      '+2 месяца бесплатно'
    ],
    buttonStyle: 'outline',
    buttonColor: '#9F1239'
  }
]

// Названия предыдущих тарифов для каскада
const previousTariff: Record<string, string> = {
  gold: 'CLASSIC',
  platinum: 'GOLD',
  private: 'PLATINUM'
}

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
      className={`relative h-full ${isFeatured ? 'md:scale-105 md:z-10' : ''}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      {/* Aurora glow container */}
      <div
        className="relative rounded-xl overflow-hidden h-full"
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
        <div className={`relative z-[2] p-5 md:p-6 h-full flex flex-col`}>
          {/* Badge - скидка */}
          {tariff.discount && (
            <div
              className="absolute top-3 right-3 md:top-4 md:right-4 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md text-[10px] md:text-xs font-semibold"
              style={{
                background: `${tariff.auroraColors[0]}20`,
                color: tariff.auroraColors[0]
              }}
            >
              {tariff.discount}
            </div>
          )}

          {/* Название */}
          <h3
            className="text-lg md:text-xl font-semibold tracking-wider mb-1"
            style={{ color: isFeatured ? tariff.auroraColors[0] : '#ffffff' }}
          >
            {tariff.name}
          </h3>

          {/* Срок */}
          <div className="text-gray-500 text-xs md:text-sm mb-4 md:mb-6">{tariff.duration}</div>

          {/* Цена */}
          <div className="mb-4 md:mb-6">
            {tariff.oldPrice && (
              <div className="text-gray-600 text-xs md:text-sm line-through mb-1">
                {tariff.oldPrice.toLocaleString('ru-RU')} ₽
              </div>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-3xl md:text-5xl font-bold text-white">
                {tariff.price.toLocaleString('ru-RU')}
              </span>
              <span className="text-gray-500 text-base md:text-lg">₽</span>
              <span className="text-gray-600 text-xs md:text-sm">{tariff.durationShort}</span>
            </div>
          </div>

          {/* Разделитель */}
          <div className="h-px bg-white/10 mb-4 md:mb-6" />

          {/* Базовые функции (только для CLASSIC) */}
          {tariff.baseFeatures.length > 0 && (
            <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
              {tariff.baseFeatures.map((feature, i) => (
                <div key={i} className="flex items-start gap-2 md:gap-3 text-xs md:text-sm">
                  <svg
                    className="w-4 h-4 md:w-5 md:h-5 mt-0.5 flex-shrink-0"
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
          )}

          {/* Каскадная структура: "Всё из [тарифа] +" */}
          {previousTariff[tariff.id] && (
            <div className="mb-4 md:mb-5 relative">
              {/* Линия слева */}
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-full rounded-full"
                style={{ background: `linear-gradient(180deg, transparent, ${tariff.auroraColors[0]}40, transparent)` }}
              />
              <div className="pl-3 flex items-center gap-1.5 text-xs md:text-sm">
                <span className="text-white/50">Всё из</span>
                <span className="font-medium text-white/80">{previousTariff[tariff.id]}</span>
                <span style={{ color: tariff.auroraColors[0] }} className="font-semibold">+</span>
              </div>
            </div>
          )}

          {/* Дополнительные бонусы в плашке */}
          {tariff.bonuses.length > 0 && (
            <div
              className="space-y-2 mb-4 md:mb-6 p-3 md:p-4 rounded-lg"
              style={{
                background: `${tariff.auroraColors[0]}08`,
                border: `1px solid ${tariff.auroraColors[0]}15`
              }}
            >
              {tariff.bonuses.map((bonus, i) => (
                <div key={i} className="flex items-start gap-2 text-xs md:text-sm">
                  <svg
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                    style={{ color: tariff.auroraColors[0] }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-gray-300">{bonus}</span>
                </div>
              ))}
            </div>
          )}

          {/* Spacer для выравнивания кнопок */}
          <div className="flex-grow" />

          {/* Кнопка */}
          <motion.a
            href="https://app.lava.top/products/d42513b3-8c4e-416e-b3cd-68a212a0a36e/d6edc26e-00b2-4fe0-9b0b-45fd7548b037"
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full py-3 md:py-3.5 rounded-lg text-sm md:text-base font-medium transition-all text-center block ${
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
          </motion.a>
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
              className="text-sm tracking-[0.4em] uppercase mb-3 font-medium"
              style={{
                background: 'linear-gradient(90deg, #C9A962, #FFD700, #C9A962)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              AR PREMIUM CLUB
            </motion.div>

            <motion.div
              className="relative inline-block mb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Новогоднее предложение
              </h1>
              {/* Bitcoin как ёлочная игрушка */}
              <motion.div
                className="absolute -top-2 -right-4 md:-right-8"
                animate={{
                  rotate: [0, 5, -5, 0],
                  y: [0, -2, 0]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {/* Нитка */}
                <div
                  className="absolute left-1/2 -top-3 w-px h-3"
                  style={{ background: 'linear-gradient(180deg, #C9A962, #FFD70080)' }}
                />
                {/* Bitcoin */}
                <div
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #F7931A, #FFAB40)',
                    boxShadow: '0 4px 15px rgba(247, 147, 26, 0.4)'
                  }}
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.001 2C6.47813 2 2.00098 6.47715 2.00098 12C2.00098 17.5228 6.47813 22 12.001 22C17.5238 22 22.001 17.5228 22.001 12C22.001 6.47715 17.5238 2 12.001 2ZM13.0881 16.4548V17.9998H11.0871V16.4678C9.97714 16.3398 8.95312 15.9048 8.41211 15.3928L9.25708 13.6758C9.82007 14.1398 10.6351 14.5368 11.5701 14.5368C12.3961 14.5368 12.8711 14.2028 12.8711 13.6758C12.8711 12.4948 8.76611 13.0698 8.76611 10.3378C8.76611 8.88281 9.79712 7.81982 11.0871 7.56982V6.00781H13.0881V7.53979C14.0231 7.66479 14.8701 8.00781 15.4541 8.48682L14.6091 10.1908C14.0671 9.78479 13.3911 9.46582 12.5431 9.46582C11.6741 9.46582 11.2861 9.81384 11.2861 10.2678C11.2861 11.3928 15.3911 10.8428 15.3911 13.5748C15.3911 15.0168 14.3731 16.1678 13.0881 16.4548Z"/>
                  </svg>
                </div>
              </motion.div>
            </motion.div>

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

        </div>
      </div>
    </>
  )
}
