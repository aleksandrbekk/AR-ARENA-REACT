import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Layout } from '../components/layout/Layout'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'
import { motion } from 'framer-motion'

interface ARPackage {
  id: string
  name: string
  amount: number
  price: number
  priceUsd?: number
  popular?: boolean
  offerId: string
  icon: string
  gradient: string
  borderColor: string
}

const AR_PACKAGES: ARPackage[] = [
  {
    id: 'start',
    name: 'СТАРТ',
    amount: 100,
    price: 100,
    priceUsd: 1.1,
    offerId: 'bfb09100-385e-4e36-932a-682032e54381',
    icon: '/icons/arcoin.png',
    gradient: 'from-zinc-700 to-zinc-900',
    borderColor: 'border-zinc-600/50'
  },
  {
    id: 'advanced',
    name: 'ПРОДВИНУТЫЙ',
    amount: 500,
    price: 500,
    priceUsd: 5.5,
    popular: true,
    offerId: '8bc3a2ef-e5f1-412a-a356-e8aaf1a7fd06',
    icon: '/icons/arcoinv2.png',
    gradient: 'from-blue-600 to-blue-900',
    borderColor: 'border-blue-500/50'
  },
  {
    id: 'expert',
    name: 'ЭКСПЕРТ',
    amount: 1000,
    price: 1000,
    priceUsd: 11,
    offerId: '7b79ce70-e816-4db7-a031-3b8976df9376',
    icon: '/icons/arcoinv3.png',
    gradient: 'from-purple-600 to-purple-900',
    borderColor: 'border-purple-500/50'
  },
  {
    id: 'master',
    name: 'МАСТЕР',
    amount: 2500,
    price: 2500,
    priceUsd: 27.5,
    offerId: 'ace5ec7e-371e-473c-80f5-cfe4374a4574',
    icon: '/icons/ARCOINv4.png',
    gradient: 'from-[#FFD700] to-[#B8860B]',
    borderColor: 'border-[#FFD700]/50'
  }
]

export function ShopPage() {
  const navigate = useNavigate()
  const { gameState, telegramUser } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)

  // ============ TELEGRAM BACK ============
  const handleBackRef = useRef<() => void>(() => navigate('/'))
  handleBackRef.current = () => navigate('/')

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg?.BackButton) return

    const onBackClick = () => handleBackRef.current()

    tg.BackButton.show()
    tg.BackButton.onClick(onBackClick)

    return () => {
      tg.BackButton.offClick(onBackClick)
      tg.BackButton.hide()
    }
  }, [])

  const buyAR = async (pkg: ARPackage) => {
    if (!telegramUser) {
      showToast({ variant: 'error', title: 'Нет данных пользователя' })
      return
    }

    setLoading(pkg.id)

    try {
      const response = await fetch('/api/lava-create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: telegramUser.id,
          email: `${telegramUser.id}@ararena.pro`,
          amount: pkg.priceUsd || pkg.price,
          currency: 'USD',
          offerId: pkg.offerId
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        showToast({ variant: 'error', title: `Ошибка ${response.status}`, description: errorText })
        return
      }

      const data = await response.json()

      if (data.ok && data.paymentUrl) {
        showToast({ variant: 'success', title: 'Открываю оплату', description: 'Завершите оплату и вернитесь в приложение' })

        if (window.Telegram?.WebApp?.openLink) {
          window.Telegram.WebApp.openLink(data.paymentUrl)
        } else {
          window.open(data.paymentUrl, '_blank')
        }
      } else {
        showToast({ variant: 'error', title: 'Не получена ссылка на оплату', description: data.error || undefined })
      }
    } catch (error) {
      showToast({ variant: 'error', title: 'Ошибка сети', description: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a] text-white pt-[60px] pb-24 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img src="/icons/SHOP.png" alt="" className="w-10 h-10" />
            <h1 className="text-2xl font-bold">Магазин</h1>
          </div>

          {/* Баланс AR */}
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-lg border border-[#FFD700]/30 rounded-full px-4 py-2">
            <img src="/icons/arcoin.png" alt="AR" className="w-5 h-5" />
            <span className="text-[#FFD700] font-bold">
              {gameState?.balance_ar.toLocaleString('ru-RU') ?? 0}
            </span>
          </div>
        </div>

        {/* Тарифы */}
        <div className="space-y-4">
          {AR_PACKAGES.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl overflow-hidden border ${pkg.borderColor}`}
            >
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${pkg.gradient} opacity-30`} />
              <div className="absolute inset-0 bg-[#0f0f0f]/80" />

              {/* Content */}
              <div className="relative p-4 flex items-center gap-4">
                {/* Icon */}
                <div className="relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${pkg.gradient} blur-xl opacity-50`} />
                  <img
                    src={pkg.icon}
                    alt={pkg.name}
                    className={`relative object-contain ${pkg.id === 'start' ? 'w-11 h-11' : 'w-16 h-16'}`}
                  />
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-white/50 uppercase tracking-wider">{pkg.name}</div>
                    {/* Popular badge - inline */}
                    {pkg.popular && (
                      <div className="bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black text-[9px] font-black px-2 py-0.5 rounded-md">
                        ХИТ
                      </div>
                    )}
                  </div>
                  <div className="text-2xl font-black text-white">{pkg.amount} <span className="text-[#FFD700]">AR</span></div>
                </div>

                {/* Buy Button with Price */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => buyAR(pkg)}
                  disabled={loading === pkg.id}
                  className={`px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                    loading === pkg.id
                      ? 'bg-zinc-700 text-white/50'
                      : 'bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black'
                  }`}
                >
                  {loading === pkg.id ? '...' : `$${pkg.priceUsd || pkg.price}`}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Info block */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 rounded-2xl bg-zinc-900/50 border border-white/5"
        >
          <div className="flex items-center gap-2 mb-3">
            <img src="/icons/arcoin.png" alt="" className="w-6 h-6" />
            <h3 className="text-sm font-bold text-[#FFD700]">Зачем нужен AR?</h3>
          </div>
          <ul className="text-sm text-white/60 space-y-1">
            <li>• Покупай билеты на розыгрыши</li>
            <li>• Приобретай уникальные скины</li>
            <li>• Участвуй в эксклюзивных событиях</li>
          </ul>
        </motion.div>
      </div>
    </Layout>
  )
}
