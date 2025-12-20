import { useState, useEffect, useRef } from 'react'
import { Layout } from '../components/layout/Layout'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'
import { supabase } from '../lib/supabase'

type Screen = 'code' | 'wheel' | 'result'

interface PromocodeResult {
  promocode: string
  discount_percent: number
  expires_at: string
}

export function EventWheelPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [screen, setScreen] = useState<Screen>('code')
  const [code, setCode] = useState<string[]>(['', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [promocodeResult, setPromocodeResult] = useState<PromocodeResult | null>(null)
  const [wheelRotation, setWheelRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60) // 24 часа в секундах

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const wheelRef = useRef<HTMLDivElement>(null)

  // Получаем данные пользователя из Telegram
  const tg = window.Telegram?.WebApp
  const telegramId = tg?.initDataUnsafe?.user?.id
  const username = tg?.initDataUnsafe?.user?.username || tg?.initDataUnsafe?.user?.first_name

  // Настройка Telegram Back Button
  useEffect(() => {
    if (tg) {
      const handleBack = () => {
        if (screen === 'code') {
          navigate('/')
        } else if (screen === 'wheel') {
          setScreen('code')
        } else {
          setScreen('wheel')
        }
      }
      tg.BackButton.show()
      tg.BackButton.onClick(handleBack)

      return () => {
        tg.BackButton.offClick(handleBack)
        tg.BackButton.hide()
      }
    }
  }, [navigate, screen, tg])

  // Таймер обратного отсчёта
  useEffect(() => {
    if (screen === 'result' && promocodeResult) {
      const expiresAt = new Date(promocodeResult.expires_at).getTime()
      const interval = setInterval(() => {
        const now = Date.now()
        const diff = Math.max(0, Math.floor((expiresAt - now) / 1000))
        setTimeLeft(diff)
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [screen, promocodeResult])

  // Форматирование времени
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Обработка ввода кода
  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return // Только цифры

    const newCode = [...code]
    newCode[index] = value.slice(-1) // Только последний символ
    setCode(newCode)
    setError(null)

    // Автопереход на следующий input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  // Обработка удаления
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Проверка кода
  const handleCheckCode = async () => {
    const fullCode = code.join('')
    if (fullCode.length !== 4) {
      setError('Введите 4 цифры')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('check_event_code', {
        input_code: fullCode
      })

      if (rpcError) {
        throw new Error(rpcError.message)
      }

      const result = data as { valid: boolean; error?: string }

      if (result.valid) {
        setScreen('wheel')
        showToast({ variant: 'success', title: 'Код верный!', description: 'Крути колесо и получи скидку' })
      } else {
        setError(result.error || 'Неверный код')
        showToast({ variant: 'error', title: 'Ошибка', description: result.error || 'Неверный код' })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка проверки кода'
      setError(errorMessage)
      showToast({ variant: 'error', title: 'Ошибка', description: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  // Секторы колеса (8 секторов)
  const sectors = [10, 15, 10, 20, 15, 10, 25, 15]
  const sectorAngle = 360 / sectors.length

  // Вращение колеса
  const handleSpin = async () => {
    if (isSpinning || !telegramId) return

    setIsSpinning(true)
    setLoading(true)

    // Анимация вращения (3-4 секунды)
    const spinDuration = 3000 + Math.random() * 1000 // 3-4 секунды
    const spins = 5 + Math.random() * 3 // 5-8 полных оборотов
    const targetRotation = spins * 360

    // Плавная анимация
    const startRotation = wheelRotation
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / spinDuration, 1)
      // Easing функция для плавного замедления
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentRotation = startRotation + targetRotation * easeOut
      setWheelRotation(currentRotation)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)

    // Вызываем RPC после начала анимации
    setTimeout(async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('generate_event_promocode', {
          p_telegram_id: telegramId,
          p_username: username || null
        })

        if (rpcError) {
          throw new Error(rpcError.message)
        }

        const result = data as PromocodeResult

        // Останавливаем колесо на нужном секторе
        const discountIndex = sectors.indexOf(result.discount_percent)
        if (discountIndex !== -1) {
          // Вычисляем финальную позицию
          const finalAngle = discountIndex * sectorAngle + sectorAngle / 2
          const finalRotation = targetRotation - (targetRotation % 360) + (360 - finalAngle)
          setWheelRotation(finalRotation)
        }

        setPromocodeResult(result)
        setTimeout(() => {
          setScreen('result')
          setIsSpinning(false)
          setLoading(false)
        }, 500)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Ошибка генерации промокода'
        showToast({ variant: 'error', title: 'Ошибка', description: errorMessage })
        setIsSpinning(false)
        setLoading(false)
      }
    }, spinDuration)
  }

  // Копирование промокода
  const handleCopyPromocode = () => {
    if (promocodeResult) {
      navigator.clipboard.writeText(promocodeResult.promocode)
      showToast({ variant: 'success', title: 'Промокод скопирован!' })
    }
  }

  // Тарифы
  const tariffs = [
    { months: 1, price: 50, label: '1 месяц' },
    { months: 2, price: 100, label: '2 месяца' },
    { months: 3, price: 135, label: '3 месяца', popular: true }
  ]

  const calculatePrice = (originalPrice: number, discount: number) => {
    return Math.round(originalPrice * (1 - discount / 100))
  }

  return (
    <Layout hideNavbar>
      <div className="min-h-screen bg-[#0a0a0a] text-white pt-[60px] pb-8 px-4">
        {/* ЭКРАН 1: ВВОД КОДА */}
        {screen === 'code' && (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] gap-8">
            <h1 className="text-3xl font-bold text-center">Введи секретный код</h1>

            <div className="flex gap-3 justify-center">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeInput(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-16 h-16 text-center text-2xl font-bold bg-zinc-900/50 backdrop-blur-md border border-yellow-500/20 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                />
              ))}
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center max-w-xs">{error}</div>
            )}

            <button
              onClick={handleCheckCode}
              disabled={loading || code.join('').length !== 4}
              className="px-8 py-4 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? 'Проверка...' : 'Проверить код'}
            </button>
          </div>
        )}

        {/* ЭКРАН 2: РУЛЕТКА */}
        {screen === 'wheel' && (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] gap-8">
            <h1 className="text-2xl font-bold text-center">Крути и узнай свою скидку!</h1>

            <div className="relative w-80 h-80">
              {/* Колесо */}
              <div
                ref={wheelRef}
                className="relative w-full h-full rounded-full overflow-hidden border-4 border-yellow-500/30"
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: isSpinning ? 'none' : 'transform 0.3s ease-out'
                }}
              >
                <svg className="w-full h-full" viewBox="0 0 320 320">
                  {sectors.map((discount, index) => {
                    const angle = index * sectorAngle
                    const isEven = index % 2 === 0
                    const startAngle = (angle - 90) * (Math.PI / 180)
                    const endAngle = (angle + sectorAngle - 90) * (Math.PI / 180)
                    const largeArc = sectorAngle > 180 ? 1 : 0
                    const x1 = 160 + 160 * Math.cos(startAngle)
                    const y1 = 160 + 160 * Math.sin(startAngle)
                    const x2 = 160 + 160 * Math.cos(endAngle)
                    const y2 = 160 + 160 * Math.sin(endAngle)

                    // Позиция текста
                    const textAngle = (angle + sectorAngle / 2 - 90) * (Math.PI / 180)
                    const textX = 160 + 100 * Math.cos(textAngle)
                    const textY = 160 + 100 * Math.sin(textAngle)

                    return (
                      <g key={index}>
                        <path
                          d={`M 160 160 L ${x1} ${y1} A 160 160 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={isEven ? '#1a1a1a' : '#2a2a2a'}
                          stroke="#0a0a0a"
                          strokeWidth="2"
                        />
                        <text
                          x={textX}
                          y={textY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-white font-bold text-lg fill-white"
                          transform={`rotate(${angle + sectorAngle / 2} ${textX} ${textY})`}
                        >
                          {discount}%
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>

              {/* Центральная кнопка */}
              <button
                onClick={handleSpin}
                disabled={isSpinning || loading}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed z-10"
              >
                {isSpinning ? '...' : 'КРУТИТЬ'}
              </button>

              {/* Указатель */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[15px] border-r-[15px] border-t-[30px] border-t-yellow-500 border-l-transparent border-r-transparent z-20" />
            </div>
          </div>
        )}

        {/* ЭКРАН 3: РЕЗУЛЬТАТ + ТАРИФЫ */}
        {screen === 'result' && promocodeResult && (
          <div className="flex flex-col gap-8 max-w-md mx-auto">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">
                Поздравляем! Твоя скидка {promocodeResult.discount_percent}%
              </h1>

              {/* Промокод */}
              <div className="mt-6 p-6 bg-zinc-900/50 backdrop-blur-md border border-yellow-500/20 rounded-lg">
                <div className="text-sm text-white/60 mb-2">Твой промокод:</div>
                <div className="text-3xl font-bold text-[#FFD700] mb-4">{promocodeResult.promocode}</div>
                <button
                  onClick={handleCopyPromocode}
                  className="w-full py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-lg"
                >
                  Копировать
                </button>
              </div>

              {/* Таймер */}
              <div className="mt-4 text-sm text-white/60">
                Действует до: <span className="text-[#FFD700] font-bold">{formatTime(timeLeft)}</span>
              </div>
            </div>

            {/* Тарифы */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center">Выбери тариф:</h2>
              {tariffs.map((tariff) => {
                const discountedPrice = calculatePrice(tariff.price, promocodeResult.discount_percent)
                return (
                  <div
                    key={tariff.months}
                    className={`p-4 bg-zinc-900/50 backdrop-blur-md border rounded-lg ${
                      tariff.popular ? 'border-yellow-500/50' : 'border-yellow-500/20'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-lg">{tariff.label}</div>
                        {tariff.popular && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">ХИТ</span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-white/60 line-through text-sm">${tariff.price}</div>
                        <div className="text-[#FFD700] font-bold text-xl">${discountedPrice}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button className="flex-1 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm font-medium">
                        Карта РФ
                      </button>
                      <button className="flex-1 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm font-medium">
                        Другая карта
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

