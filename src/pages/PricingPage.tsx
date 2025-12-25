import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PaymentModal } from '../components/premium/PaymentModal'
import { supabase } from '../lib/supabase'

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
export interface Tariff {
  id: string
  name: string
  duration: string
  durationShort: string
  price: number
  oldPrice: number | null
  discount: string | null
  badge: string | null
  cardImage: string
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

// ============ ОБЩИЕ ФИЧИ ДЛЯ ВСЕХ ТАРИФОВ ============
const commonFeatures = [
  'Ежедневная аналитика рынка',
  'Фьючерсные сделки с сопровождением',
  'SPOT-сделки без плечей',
  'Мгновенные оповещения о сделках',
  'Готовые инвестиционные портфели',
  'Актуальный портфель 2025',
  'Долгосрочные стратегии',
  'Ончейн-аналитика — движения китов',
  '900+ обучающих материалов',
  'Живой чат трейдеров',
  'Поддержка 24/7',
  'AMA со мной каждые 2 недели'
]

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
    cardImage: '/cards/classic.png',
    auroraColors: ['#FFFFFF', '#E5E5E5'],
    auroraOpacity: 0.3,
    auroraBlur: 15,
    auroraSpeed: 10,
    isFeatured: false,
    baseFeatures: commonFeatures,
    bonuses: [],
    buttonStyle: 'outline',
    buttonColor: '#FFFFFF'
  },
  {
    id: 'gold',
    name: 'GOLD',
    duration: '3 месяца',
    durationShort: '/3 мес',
    price: 9900,
    oldPrice: 12000,
    discount: null,
    badge: null,
    cardImage: '/cards/gold.png',
    auroraColors: ['#F5A623', '#E69500'],
    auroraOpacity: 0.6,
    auroraBlur: 18,
    auroraSpeed: 8,
    isFeatured: false,
    baseFeatures: commonFeatures,
    bonuses: [],
    buttonStyle: 'outline',
    buttonColor: '#F5A623'
  },
  {
    id: 'platinum',
    name: 'PLATINUM',
    duration: '6 месяцев',
    durationShort: '/6 мес',
    price: 17900,
    oldPrice: 24000,
    discount: null,
    badge: 'ХИТ',
    cardImage: '/cards/platinum.png',
    auroraColors: ['#8A8A8A', '#6B6B6B'],
    auroraOpacity: 0.8,
    auroraBlur: 12,
    auroraSpeed: 5,
    isFeatured: false,
    baseFeatures: commonFeatures,
    bonuses: [],
    buttonStyle: 'outline',
    buttonColor: '#8A8A8A'
  },
  {
    id: 'private',
    name: 'PRIVATE',
    duration: '1 год',
    durationShort: '/12 мес',
    price: 34900,
    oldPrice: 44000,
    discount: null,
    badge: 'VIP',
    cardImage: '/cards/PRIVATE.png',
    auroraColors: ['#9B2335', '#7B1E2D'],
    auroraOpacity: 0.8,
    auroraBlur: 22,
    auroraSpeed: 7,
    isFeatured: false,
    baseFeatures: commonFeatures,
    bonuses: ['🎯 Личный разбор портфеля в Zoom'],
    buttonStyle: 'outline',
    buttonColor: '#9B2335'
  }
]

// Названия предыдущих тарифов для каскада
const previousTariffMap: Record<string, string> = {
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

  const timeString = timeLeft.days > 0
    ? `${timeLeft.days}д ${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`
    : `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      <div className="h-px w-8 sm:w-12 md:w-16 bg-gradient-to-r from-transparent to-white/20" />
      <div className="text-center">
        <div
          className="text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.15em] sm:tracking-[0.2em]"
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #999999 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          {timeString}
        </div>
        <div className="text-[10px] sm:text-xs text-white/30 tracking-[0.3em] uppercase mt-1">
          до конца акции
        </div>
      </div>
      <div className="h-px w-8 sm:w-12 md:w-16 bg-gradient-to-l from-transparent to-white/20" />
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

// ============ КОМПОНЕНТ КАРТОЧКИ ============
interface PricingCardProps {
  tariff: Tariff
  index: number
  previousTariff: Record<string, string>
  onBuy: (tariff: Tariff) => void
}

function PricingCard({ tariff, index, onBuy }: PricingCardProps) {
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
        <div className="relative z-[2] p-5 md:p-6 h-full flex flex-col">
          {/* Верхняя строка: Название + Карта */}
          <div className="flex items-start justify-between mb-4 md:mb-5">
            <div>
              {/* Название */}
              <h3
                className="text-lg md:text-xl font-bold tracking-wider"
                style={{
                  color: tariff.auroraColors[0],
                  textShadow: `0 0 20px ${tariff.auroraColors[0]}80, 0 0 40px ${tariff.auroraColors[0]}40`
                }}
              >
                {tariff.name}
              </h3>
              {/* Срок */}
              <div className="text-gray-500 text-xs md:text-sm mt-1">{tariff.duration}</div>
            </div>

            {/* Карточка */}
            <img
              src={tariff.cardImage}
              alt={`${tariff.name} card`}
              className="w-14 md:w-16 h-auto rounded-md opacity-90 flex-shrink-0"
            />
          </div>

          {/* Цена (с фиксированным отступом для старой цены) */}
          <div className="mb-4 md:mb-6">
            {/* Старая цена - placeholder всегда рендерится для выравнивания */}
            <div className="h-4 md:h-5 mb-1 flex items-center">
              {tariff.oldPrice ? (
                <span className="text-gray-500 text-xs md:text-sm line-through decoration-white/30 decoration-1">
                  {tariff.oldPrice.toLocaleString('ru-RU')} ₽
                </span>
              ) : <div />}
            </div>

            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white whitespace-nowrap">
                {tariff.price.toLocaleString('ru-RU')} ₽
              </span>
              {tariff.durationShort && <span className="text-gray-500 text-xs md:text-sm whitespace-nowrap">{tariff.durationShort}</span>}
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
          {previousTariffMap[tariff.id] && (
            <div className="mb-4 md:mb-5 relative">
              {/* Линия слева */}
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-full rounded-full"
                style={{ background: `linear-gradient(180deg, transparent, ${tariff.auroraColors[0]}40, transparent)` }}
              />
              <div className="pl-3 flex items-center gap-1.5 text-xs md:text-sm">
                <span className="text-white/50">Всё из</span>
                <span className="font-medium text-white/80">{previousTariffMap[tariff.id]}</span>
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
          <motion.button
            onClick={() => onBuy(tariff)}
            className="w-full py-3 md:py-3.5 rounded-lg text-sm md:text-base font-medium transition-all text-center block text-white relative z-20 cursor-pointer"
            style={{
              border: `1px solid ${tariff.auroraColors[0]}50`,
              background: `${tariff.auroraColors[0]}15`
            }}
            whileHover={{
              scale: 1.02,
              boxShadow: `0 0 20px ${tariff.auroraColors[0]}30`
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

  // Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedTariffForPayment, setSelectedTariffForPayment] = useState<Tariff | null>(null)

  // Регистрация пользователя при открытии страницы
  useEffect(() => {
    const registerUser = async () => {
      try {
        // @ts-ignore
        const tg = window.Telegram?.WebApp
        const user = tg?.initDataUnsafe?.user

        if (user?.id) {
          // Вызываем RPC которая создаёт юзера если его нет
          await supabase.rpc('get_bull_game_state', {
            p_telegram_id: user.id.toString()
          })
          console.log('[PricingPage] User registered:', user.id)
        }
      } catch (err) {
        console.warn('[PricingPage] User registration error (non-critical):', err)
      }
    }

    registerUser()
  }, [])

  const handleBuyClick = (tariff: Tariff) => {
    setSelectedTariffForPayment(tariff)
    setIsPaymentModalOpen(true)
  }



  return (
    <>
      {/* Инжектим стили для aurora анимации */}
      <style>{auroraStyles}</style>

      <div className="min-h-screen bg-black text-white relative overflow-x-hidden pt-[60px] pb-20 selection:bg-purple-500/30">
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
        <div className="relative z-10 px-3 sm:px-4 md:px-6 py-8 sm:py-10 md:py-12 max-w-7xl mx-auto">

          {/* Header */}
          <header className="text-center mb-8 sm:mb-10 md:mb-12">
            <motion.div
              className="text-[10px] sm:text-xs md:text-sm tracking-[0.3em] sm:tracking-[0.4em] uppercase mb-2 sm:mb-3 font-medium"
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

            <motion.h1
              className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 sm:mb-5 md:mb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              АКЦИЯ ГОДА
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Timer deadline={deadline} />
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-white/60 text-sm md:text-base mt-4"
            >
              Оформите клубную карту по лучшим условиям
            </motion.p>
          </header>

          {/* Карточки тарифов */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 mb-12 items-start">
            {tariffs.map((tariff, index) => (
              <PricingCard
                key={tariff.id}
                tariff={tariff}
                index={index}
                previousTariff={previousTariffMap}
                onBuy={handleBuyClick}
              />
            ))}
          </div>

        </div>

        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          tariff={selectedTariffForPayment}
        />
      </div>
    </>
  )
}
