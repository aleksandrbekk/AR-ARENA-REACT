import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

interface ARPackage {
  id: string
  amount: number
  price: number
  popular?: boolean
}

const AR_PACKAGES: ARPackage[] = [
  { id: 'ar_100', amount: 100, price: 100, popular: true }
]

export function ShopPage() {
  const { gameState, telegramUser } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)

  const buyAR = async (pkg: ARPackage) => {
    if (!telegramUser) return

    setLoading(pkg.id)

    try {
      const response = await fetch('https://ararena.pro/api/lava-create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: telegramUser.id,
          email: `${telegramUser.id}@ararena.pro`,
          amount: pkg.price,
          currency: 'RUB'
        })
      })

      const data = await response.json()

      if (data.paymentUrl) {
        window.Telegram?.WebApp?.openLink(data.paymentUrl)
      } else {
        console.error('No payment URL received:', data)
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-[60px] pb-8 px-4">
      {/* Header с балансом */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-center mb-2">
          Магазин AR
        </h1>
        <div className="flex items-center justify-center gap-2 text-lg">
          <span className="text-white/60">Твой баланс:</span>
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-lg border border-white/10 rounded-full px-4 py-2">
            <img
              src="/icons/arcoin.png"
              alt="AR"
              className="w-6 h-6 object-contain"
            />
            <span className="text-[#FFD700] font-bold">
              {gameState?.balance_ar.toLocaleString('ru-RU') ?? 0}
            </span>
          </div>
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
                  {pkg.price} ₽
                </div>
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
  )
}
