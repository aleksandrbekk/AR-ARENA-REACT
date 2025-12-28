import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PaymentModal } from '../components/premium/PaymentModal'
import { supabase } from '../lib/supabase'

// ============ ТИПЫ ============
export interface Tariff {
  id: string
  name: string
  duration: string
  durationShort: string
  price: number
  oldPrice: number | null
  savings: number | null
  cardImage: string
  nameColor: string
  glowColor?: string
  auroraColors: [string, string]
  isFeatured: boolean
  baseFeatures: string[]
  bonuses: string[]
}

// ============ ОБЩИЕ ФИЧИ ДЛЯ ВСЕХ ТАРИФОВ ============
const commonFeatures = [
  'Высокое качество, 4K разрешение, острие детали',
  'Выдеальные сопжзаций',
  'Премию падагот-полозмер',
  'Прометии язрвайта',
  'Высокое качество, 4K разрешение',
  'Роскошная крипто эстетика'
]

// ============ ДАННЫЕ ТАРИФОВ ============
const tariffs: Tariff[] = [
  {
    id: 'classic',
    name: 'CLASSIC',
    duration: '1 month',
    durationShort: '/мес.',
    price: 4000,
    oldPrice: null,
    savings: null,
    cardImage: '/cards/classic.png',
    nameColor: '#FFFFFF',
    auroraColors: ['#FFFFFF', '#E5E5E5'],
    isFeatured: false,
    baseFeatures: commonFeatures,
    bonuses: []
  },
  {
    id: 'gold',
    name: 'GOLD',
    duration: '3 months',
    durationShort: '/3 мес.',
    price: 9900,
    oldPrice: 15666,
    savings: 2100,
    cardImage: '/cards/gold.png',
    nameColor: '#D4AF37',
    auroraColors: ['#D4AF37', '#B8860B'],
    isFeatured: false,
    baseFeatures: commonFeatures,
    bonuses: []
  },
  {
    id: 'platinum',
    name: 'PLATINUM',
    duration: '6 months',
    durationShort: '/6 мес.',
    price: 17900,
    oldPrice: 34680,
    savings: 9100,
    cardImage: '/cards/platinum.png',
    nameColor: '#A0A0A0',
    auroraColors: ['#A0A0A0', '#808080'],
    isFeatured: false,
    baseFeatures: commonFeatures,
    bonuses: ['Роскошная крипто эстетика']
  },
  {
    id: 'private',
    name: 'PRIVATE',
    duration: '1 year',
    durationShort: '/12 мес.',
    price: 34900,
    oldPrice: 44666,
    savings: 9100,
    cardImage: '/cards/PRIVATE.png',
    nameColor: '#C9A962',
    glowColor: '#FF3366',
    auroraColors: ['#C9A962', '#9B2335'],
    isFeatured: true,
    baseFeatures: commonFeatures,
    bonuses: ['Роскошная крипто эстетика', 'Вяопос от пнятая правголая эстетика']
  }
]

// ============ ТАЙМЕР ============
const Timer = ({ deadline }: { deadline: string }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const target = new Date(deadline).getTime()

    const updateTimer = () => {
      const now = Date.now()
      const diff = Math.max(0, target - now)

      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
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
    <div className="text-3xl md:text-4xl font-light tracking-[0.2em] text-white">
      {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
    </div>
  )
}

// ============ КОМПОНЕНТ КАРТОЧКИ ============
interface PricingCardProps {
  tariff: Tariff
  index: number
  onBuy: (tariff: Tariff) => void
}

function PricingCard({ tariff, index, onBuy }: PricingCardProps) {
  const hasGlow = !!tariff.glowColor

  return (
    <motion.div
      className="relative h-full"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      {/* Glow effect for PRIVATE */}
      {hasGlow && (
        <div
          className="absolute -right-20 top-0 bottom-0 w-40 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at right center, ${tariff.glowColor}40 0%, transparent 70%)`,
            filter: 'blur(30px)'
          }}
        />
      )}

      {/* Card container */}
      <div
        className="relative rounded-xl overflow-hidden h-full border border-white/10"
        style={{ background: '#0C0C0C' }}
      >
        {/* Content */}
        <div className="relative z-[2] p-5 md:p-6 h-full flex flex-col">
          {/* Card image */}
          <div className="flex justify-center mb-4">
            <img
              src={tariff.cardImage}
              alt={`${tariff.name} card`}
              className="h-24 md:h-28 w-auto object-contain"
              style={{
                filter: hasGlow ? `drop-shadow(0 0 20px ${tariff.glowColor}60)` : undefined
              }}
            />
          </div>

          {/* Name + Duration */}
          <div className="text-center mb-5">
            <h3
              className="text-xl md:text-2xl font-bold tracking-wider mb-1"
              style={{ color: tariff.nameColor }}
            >
              {tariff.name}
            </h3>
            <div className="text-gray-500 text-sm">{tariff.duration}</div>
          </div>

          {/* Price section */}
          <div className="text-center mb-5">
            {/* Old price */}
            {tariff.oldPrice && (
              <div className="text-gray-500 text-sm line-through mb-1">
                {tariff.oldPrice.toLocaleString('ru-RU')}₽
              </div>
            )}

            {/* Current price */}
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl md:text-3xl font-bold text-white">
                {tariff.price.toLocaleString('ru-RU')}₽
              </span>
              <span className="text-gray-500 text-sm">{tariff.durationShort}</span>
            </div>

            {/* Savings */}
            {tariff.savings && (
              <div className="text-green-400 text-sm mt-1">
                выгода {tariff.savings.toLocaleString('ru-RU')}₽
              </div>
            )}
          </div>

          {/* Button */}
          <motion.button
            onClick={() => onBuy(tariff)}
            className="w-full py-3 rounded-lg text-sm font-medium transition-all text-white border border-white/30 hover:bg-white/10 mb-5"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {tariff.id === 'classic' ? 'Начать' : `Выбрать ${tariff.name}`}
          </motion.button>

          {/* Features */}
          <div className="space-y-2 flex-grow">
            {tariff.baseFeatures.map((feature, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <svg
                  className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-400">{feature}</span>
              </div>
            ))}
            {tariff.bonuses.map((bonus, i) => (
              <div key={`bonus-${i}`} className="flex items-start gap-2 text-xs">
                <svg
                  className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-400">{bonus}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============ ГЛАВНАЯ СТРАНИЦА ============
export function PricingPage3() {
  const deadline = '2025-12-29T00:00:00+03:00'

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
          await supabase.rpc('get_bull_game_state', {
            p_telegram_id: user.id.toString()
          })
          console.log('[PricingPage3] User registered:', user.id)
        }
      } catch (err) {
        console.warn('[PricingPage3] User registration error (non-critical):', err)
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
      <div className="min-h-screen text-white relative overflow-x-hidden pt-[60px] pb-20" style={{ background: '#0A0A0A' }}>
        {/* Контент */}
        <div className="relative z-10 px-3 sm:px-4 md:px-6 py-8 sm:py-10 md:py-12 max-w-7xl mx-auto">

          {/* Header */}
          <header className="text-center mb-10 md:mb-14">
            <motion.div
              className="text-xs md:text-sm tracking-[0.3em] uppercase mb-3 font-medium"
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
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4"
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
          </header>

          {/* Карточки тарифов */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {tariffs.map((tariff, index) => (
              <PricingCard
                key={tariff.id}
                tariff={tariff}
                index={index}
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
