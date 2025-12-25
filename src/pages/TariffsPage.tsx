import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

// ============ ТИПЫ ============
interface Tariff {
  id: string
  name: string
  duration: string
  price: number
  oldPrice: number | null
  discount: string | null
  gifts: string[]
  isFeatured: boolean
}

// ============ ДАННЫЕ ТАРИФОВ ============
const tariffs: Tariff[] = [
  {
    id: 'classic',
    name: 'CLASSIC',
    duration: '1 месяц',
    price: 4000,
    oldPrice: null,
    discount: null,
    gifts: ['Базовый доступ к каналу', 'Сигналы и аналитика'],
    isFeatured: false
  },
  {
    id: 'gold',
    name: 'GOLD',
    duration: '3 месяца',
    price: 10200,
    oldPrice: 12000,
    discount: '-15%',
    gifts: ['+1 неделя бонусом', 'Запись эфира', 'Портфель 2025'],
    isFeatured: false
  },
  {
    id: 'platinum',
    name: 'PLATINUM',
    duration: '6 месяцев',
    price: 19200,
    oldPrice: 24000,
    discount: '-20%',
    gifts: ['+1 месяц бонусом', 'Чек-лист антискам', 'Шаблон РМ'],
    isFeatured: true
  },
  {
    id: 'private',
    name: 'PRIVATE',
    duration: '12 месяцев',
    price: 33600,
    oldPrice: 48000,
    discount: '-30%',
    gifts: ['+2 месяца бонусом', 'VIP-чат', 'Созвон 15 мин', 'Разбор портфеля'],
    isFeatured: false
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
      <span className="text-white/50 text-sm">До конца акции:</span>
      <span className="font-mono text-white text-lg tracking-wider">
        {timeLeft.days > 0 && <span className="text-white/80">{timeLeft.days}д </span>}
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
    </div>
  )
}

// ============ AURORA GLOW EFFECT ============
const AuroraGlow = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let time = 0

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (rect) {
        canvas.width = rect.width
        canvas.height = rect.height
      }
    }

    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      time += 0.005
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const w = canvas.width
      const h = canvas.height

      // Создаём aurora эффект по границам
      const gradient = ctx.createConicGradient(time * 2, w / 2, h / 2)

      // Фиолетово-синие оттенки как на Unicorn
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0)')
      gradient.addColorStop(0.1, 'rgba(139, 92, 246, 0.6)')
      gradient.addColorStop(0.2, 'rgba(99, 102, 241, 0.4)')
      gradient.addColorStop(0.3, 'rgba(59, 130, 246, 0)')
      gradient.addColorStop(0.4, 'rgba(139, 92, 246, 0.5)')
      gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0)')
      gradient.addColorStop(0.6, 'rgba(99, 102, 241, 0.6)')
      gradient.addColorStop(0.7, 'rgba(59, 130, 246, 0.3)')
      gradient.addColorStop(0.8, 'rgba(139, 92, 246, 0)')
      gradient.addColorStop(0.9, 'rgba(168, 85, 247, 0.5)')
      gradient.addColorStop(1, 'rgba(99, 102, 241, 0)')

      // Рисуем внешнее свечение
      ctx.save()
      ctx.filter = 'blur(40px)'
      ctx.fillStyle = gradient
      ctx.fillRect(-50, -50, w + 100, h + 100)
      ctx.restore()

      // Более яркое свечение по краям
      ctx.save()
      ctx.filter = 'blur(20px)'
      ctx.strokeStyle = gradient
      ctx.lineWidth = 60
      ctx.strokeRect(-30, -30, w + 60, h + 60)
      ctx.restore()

      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}

// ============ КАРТОЧКА ТАРИФА ============
const TariffCard = ({ tariff, index }: { tariff: Tariff; index: number }) => {
  const isFeatured = tariff.isFeatured

  return (
    <motion.div
      className="relative h-full"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      {/* Featured badge */}
      {isFeatured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
          <div className="px-4 py-1 text-xs font-semibold tracking-wider rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
            ЛУЧШИЙ ВЫБОР
          </div>
        </div>
      )}

      <motion.div
        className={`relative h-full rounded-xl overflow-hidden ${
          isFeatured ? 'ring-1 ring-violet-500/30' : ''
        }`}
        style={{ background: '#08080a' }}
        whileHover={{ y: -4, transition: { duration: 0.3 } }}
      >
        {/* Aurora glow для featured карточки */}
        {isFeatured && <AuroraGlow />}

        {/* Контент карточки */}
        <div className={`relative z-10 p-8 h-full flex flex-col ${isFeatured ? 'pt-10' : ''}`}>
          {/* Название */}
          <h3 className={`text-lg font-semibold tracking-wider mb-1 ${
            isFeatured ? 'text-violet-300' : 'text-white/90'
          }`}>
            {tariff.name}
          </h3>

          {/* Срок */}
          <div className="text-white/40 text-sm mb-6">{tariff.duration}</div>

          {/* Цена */}
          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-white/50 text-lg">₽</span>
              <span className="text-4xl font-bold text-white">
                {tariff.price.toLocaleString('ru-RU')}
              </span>
            </div>
            {tariff.oldPrice && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/30 text-sm line-through">
                  {tariff.oldPrice.toLocaleString('ru-RU')} ₽
                </span>
                {tariff.discount && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    isFeatured
                      ? 'bg-violet-500/20 text-violet-300'
                      : 'bg-white/10 text-white/60'
                  }`}>
                    {tariff.discount}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Описание */}
          <div className="text-white/50 text-sm mb-6">
            {isFeatured ? 'Оптимальный выбор для серьёзных инвесторов' :
             tariff.id === 'classic' ? 'Идеально для старта' :
             tariff.id === 'gold' ? 'Популярный выбор' : 'Максимум возможностей'}
          </div>

          {/* Список преимуществ */}
          <div className="space-y-3 mb-8 flex-grow">
            {tariff.gifts.map((gift, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  isFeatured ? 'text-violet-400' : 'text-white/40'
                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-white/70">{gift}</span>
              </div>
            ))}
          </div>

          {/* Кнопка */}
          <motion.button
            className={`w-full py-3.5 rounded-lg font-medium transition-all ${
              isFeatured
                ? 'bg-violet-600 hover:bg-violet-500 text-white'
                : 'bg-white/[0.08] hover:bg-white/[0.12] text-white/90 border border-white/[0.08]'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isFeatured ? 'Выбрать PLATINUM' : `Выбрать ${tariff.name}`}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============ СНЕЖИНКИ ============
const Snowflakes = () => {
  const flakes = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 3,
    left: Math.random() * 100,
    delay: Math.random() * 10,
    duration: 18 + Math.random() * 12
  }))

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {flakes.map((flake) => (
        <motion.div
          key={flake.id}
          className="absolute rounded-full bg-white/[0.06]"
          style={{
            width: flake.size,
            height: flake.size,
            left: `${flake.left}%`,
            top: -10,
            filter: 'blur(1px)'
          }}
          animate={{
            y: ['0vh', '105vh'],
            x: [0, Math.sin(flake.id) * 30]
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

// ============ ГЛАВНАЯ СТРАНИЦА ============
export function TariffsPage() {
  const deadline = '2025-12-27T18:00:00+03:00'

  return (
    <div className="min-h-screen text-white relative" style={{ background: '#050507' }}>
      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(139, 92, 246, 0.03) 0%, transparent 50%)'
        }}
      />

      {/* Снежинки */}
      <Snowflakes />

      {/* Контент */}
      <div className="relative z-10 px-4 py-16 max-w-6xl mx-auto">

        {/* Header */}
        <header className="text-center mb-16">
          <motion.div
            className="text-white/30 text-sm tracking-[0.4em] uppercase mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Premium AR Club
          </motion.div>

          <motion.h1
            className="text-4xl md:text-5xl font-bold mb-8 tracking-tight"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {tariffs.map((tariff, index) => (
            <TariffCard key={tariff.id} tariff={tariff} index={index} />
          ))}
        </div>

        {/* Footer */}
        <footer className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4 text-white/30 text-sm flex-wrap">
            <span>82.2% точность</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>5000+ участников</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>С 2022 года</span>
          </div>
          <div className="text-white/20 text-xs">
            Акция 96 часов с 23.12.2025
          </div>
        </footer>
      </div>
    </div>
  )
}
