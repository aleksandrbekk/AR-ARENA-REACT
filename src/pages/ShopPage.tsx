import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Layout } from '../components/layout/Layout'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'

interface ARPackage {
  id: string
  amount: number
  price: number
  priceUsd?: number // Цена в USD для Apple Pay
  popular?: boolean
  offerId: string
}

const AR_PACKAGES: ARPackage[] = [
  {
    id: 'test_drive',
    amount: 100,
    price: 100,
    priceUsd: 1.1, // ~100₽ = $1.1 (примерный курс)
    popular: true,
    offerId: 'bfb09100-385e-4e36-932a-682032e54381' // ТЕСТ-ДРАЙВ
  },
  {
    id: 'start',
    amount: 500,
    price: 500,
    priceUsd: 5.5, // ~500₽ = $5.5
    offerId: '8bc3a2ef-e5f1-412a-a356-e8aaf1a7fd06' // СТАРТ
  },
  {
    id: 'advanced',
    amount: 1000,
    price: 1000,
    priceUsd: 11, // ~1000₽ = $11
    offerId: '7b79ce70-e816-4db7-a031-3b8976df9376' // ПРОДВИНУТЫЙ
  },
  {
    id: 'expert',
    amount: 2500,
    price: 2500,
    priceUsd: 27.5, // ~2500₽ = $27.5
    offerId: 'ace5ec7e-371e-473c-80f5-cfe4374a4574' // ЭКСПЕРТ
  },
  {
    id: 'master',
    amount: 5000,
    price: 5000,
    priceUsd: 55, // ~5000₽ = $55
    offerId: '4f758f9b-71ff-47e5-99ff-5244ba9bd80e' // МАСТЕР
  }
]

export function ShopPage() {
  const navigate = useNavigate()
  const { gameState, telegramUser } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)

  // Настройка Telegram Back Button
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      const handleBack = () => navigate('/')
      tg.BackButton.show()
      tg.BackButton.onClick(handleBack)

      return () => {
        tg.BackButton.offClick(handleBack)
        tg.BackButton.hide()
      }
    }
  }, [navigate])

  const [selectedCurrency, setSelectedCurrency] = useState<'RUB' | 'USD'>('RUB')

  const buyAR = async (pkg: ARPackage) => {
    if (!telegramUser) {
      showToast({ variant: 'error', title: 'Нет данных пользователя' })
      return
    }

    setLoading(pkg.id)

    try {
      // Выбираем цену и валюту
      const amount = selectedCurrency === 'USD' && pkg.priceUsd ? pkg.priceUsd : pkg.price
      const currency = selectedCurrency

      console.log('🔄 Создаю счёт:', {
        telegramId: telegramUser.id,
        amount,
        currency
      })

      const response = await fetch('/api/lava-create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: telegramUser.id,
          email: `${telegramUser.id}@ararena.pro`,
          amount,
          currency,
          offerId: pkg.offerId
        })
      })

      console.log('📡 Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API error:', response.status, errorText)
        showToast({ variant: 'error', title: `Ошибка ${response.status}`, description: errorText })
        return
      }

      const data = await response.json()
      console.log('✅ API response:', data)

      if (data.ok && data.paymentUrl) {
        console.log('🔗 Opening payment URL:', data.paymentUrl)
        showToast({ variant: 'success', title: 'Открываю оплату', description: 'Завершите оплату и вернитесь в приложение' })

        // Открываем ссылку через Telegram WebApp API
        if (window.Telegram?.WebApp?.openLink) {
          window.Telegram.WebApp.openLink(data.paymentUrl)
        } else {
          // Фоллбэк для теста в браузере
          window.open(data.paymentUrl, '_blank')
        }
      } else {
        console.error('❌ No payment URL in response:', data)
        showToast({ variant: 'error', title: 'Не получена ссылка на оплату', description: data.error || undefined })
      }
    } catch (error) {
      console.error('❌ Network error:', error)
      showToast({ variant: 'error', title: 'Ошибка сети', description: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a] text-white pt-[60px] pb-8 px-4">
        {/* Header с кнопкой назад */}
        <div className="flex items-center justify-between mb-6 px-2">
          {/* Кнопка назад - убрал, navbar справится */}
          <div></div>

        {/* Баланс AR */}
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-lg border border-white/10 rounded-full px-4 py-2">
          <img
            src="/icons/arcoin.png"
            alt="AR"
            className="w-5 h-5 object-contain"
          />
          <span className="text-[#FFD700] font-bold text-sm">
            {gameState?.balance_ar.toLocaleString('ru-RU') ?? 0}
          </span>
        </div>
      </div>

      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-center mb-4">
          Магазин AR
        </h1>
        
        {/* Выбор валюты */}
        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => setSelectedCurrency('RUB')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedCurrency === 'RUB'
                ? 'bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black'
                : 'bg-zinc-800 text-white/60'
            }`}
          >
            ₽ RUB
          </button>
          <button
            onClick={() => setSelectedCurrency('USD')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedCurrency === 'USD'
                ? 'bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black'
                : 'bg-zinc-800 text-white/60'
            }`}
          >
            $ USD (Apple Pay)
          </button>
        </div>
      </div>

      {/* Пакеты AR */}
      <div className="space-y-4 max-w-md mx-auto">
        {AR_PACKAGES.map((pkg) => (
          <div
            key={pkg.id}
            className="relative bg-black/40 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,165,0,0.05) 100%)',
              boxShadow: '0 8px 32px 0 rgba(255,215,0,0.2)'
            }}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black text-xs font-bold px-4 py-1 rounded-full">
                Популярное
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              {/* AR Amount */}
              <div className="flex items-center gap-3">
                <img
                  src="/icons/arcoin.png"
                  alt="AR"
                  className="w-12 h-12 object-contain"
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.6))'
                  }}
                />
                <div>
                  <div className="text-2xl font-bold text-[#FFD700]">
                    {pkg.amount} AR
                  </div>
                  <div className="text-sm text-white/60">
                    Игровая валюта
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="text-right">
                <div className="text-3xl font-bold text-white">
                  {selectedCurrency === 'USD' && pkg.priceUsd
                    ? `$${pkg.priceUsd}`
                    : `${pkg.price} ₽`}
                </div>
                {selectedCurrency === 'USD' && pkg.priceUsd && (
                  <div className="text-xs text-white/40 line-through">
                    {pkg.price} ₽
                  </div>
                )}
              </div>
            </div>

            {/* Buy Button */}
            <button
              onClick={() => buyAR(pkg)}
              disabled={loading === pkg.id}
              className="w-full py-3 rounded-xl font-bold text-black text-lg transition-all disabled:opacity-50"
              style={{
                background: loading === pkg.id
                  ? 'linear-gradient(135deg, #999 0%, #666 100%)'
                  : 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                boxShadow: '0 4px 20px rgba(255,215,0,0.4)'
              }}
            >
              {loading === pkg.id ? 'Загрузка...' : 'Купить'}
            </button>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="mt-8 max-w-md mx-auto">
        <div className="bg-black/20 backdrop-blur-lg border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-bold text-[#FFD700] mb-2">
            Зачем нужен AR?
          </h3>
          <ul className="text-sm text-white/70 space-y-1">
            <li>• Покупай уникальные скины быков</li>
            <li>• Участвуй в эксклюзивных событиях</li>
            <li>• Получай преимущества в игре</li>
          </ul>
        </div>
      </div>
    </div>
    </Layout>
  )
}
