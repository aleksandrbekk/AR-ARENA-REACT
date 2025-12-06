import { useState, useEffect } from 'react'
import { Layout } from '../components/layout/Layout'
import { useAuth } from '../hooks/useAuth'
import { useSkins } from '../hooks/useSkins'
import { supabase } from '../lib/supabase'

const BASE_INCOME_PER_HOUR = 100 // BUL в час
const MAX_HOURS = 8 // Максимум накопления

export function FarmPage() {
  const { telegramUser, gameState, updateGameState } = useAuth()
  const { activeSkin } = useSkins()
  const [lastClaim, setLastClaim] = useState<Date | null>(null)
  const [accumulated, setAccumulated] = useState(0)
  const [incomePerHour, setIncomePerHour] = useState(BASE_INCOME_PER_HOUR)
  const [maxAccumulated, setMaxAccumulated] = useState(BASE_INCOME_PER_HOUR * MAX_HOURS)
  const [isClaiming, setIsClaiming] = useState(false)
  const [showCollectAnimation, setShowCollectAnimation] = useState(false)

  // Загружаем last_farm_claim из базы
  useEffect(() => {
    async function loadFarmData() {
      if (!telegramUser) return

      try {
        const { data, error } = await supabase
          .from('users')
          .select('last_farm_claim')
          .eq('telegram_id', telegramUser.id.toString())
          .single()

        // Если колонка не существует или произошла ошибка, используем текущее время
        if (error) {
          console.warn('last_farm_claim column does not exist, using current time')
          setLastClaim(new Date())
          return
        }

        const lastClaimDate = data?.last_farm_claim
          ? new Date(data.last_farm_claim)
          : new Date() // Если не было сбора, начинаем с текущего момента

        setLastClaim(lastClaimDate)
      } catch (err) {
        console.error('Error loading farm data:', err)
        // Fallback на текущее время
        setLastClaim(new Date())
      }
    }

    loadFarmData()
  }, [telegramUser])

  // Пересчитываем доход при изменении активного скина
  useEffect(() => {
    const farmBonus = activeSkin?.farm_bonus || 0
    const income = BASE_INCOME_PER_HOUR * (1 + farmBonus / 100)
    setIncomePerHour(income)
    setMaxAccumulated(income * MAX_HOURS)
  }, [activeSkin])

  // Обновляем накопленное каждую секунду
  useEffect(() => {
    if (!lastClaim) return

    const interval = setInterval(() => {
      const now = new Date()
      const hoursPassed = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60)
      const hoursCapped = Math.min(hoursPassed, MAX_HOURS)
      const earned = incomePerHour * hoursCapped
      setAccumulated(Math.floor(earned))
    }, 1000)

    return () => clearInterval(interval)
  }, [lastClaim, incomePerHour])

  // Форматирование времени
  const getTimeToFull = () => {
    if (!lastClaim) return '0ч 0м'

    const now = new Date()
    const hoursPassed = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60)

    if (hoursPassed >= MAX_HOURS) return 'Заполнено'

    const hoursLeft = MAX_HOURS - hoursPassed
    const hours = Math.floor(hoursLeft)
    const minutes = Math.floor((hoursLeft - hours) * 60)

    return `${hours}ч ${minutes}м`
  }

  // Прогресс бар (0-100%)
  const getProgress = () => {
    return Math.min((accumulated / maxAccumulated) * 100, 100)
  }

  // Сбор награды
  const handleClaim = async () => {
    if (!telegramUser || !gameState || accumulated === 0 || isClaiming) return

    setIsClaiming(true)
    setShowCollectAnimation(true)

    try {
      // ВРЕМЕННО: Обновляем только баланс (без last_farm_claim)
      // АНЯ потом добавит RPC функцию для безопасного начисления
      const newBalance = gameState.balance_bul + accumulated
      const now = new Date()

      const { error } = await supabase
        .from('users')
        .update({
          balance_bul: newBalance
        })
        .eq('telegram_id', telegramUser.id.toString())

      if (error) {
        console.error('Error claiming farm:', error)
        alert('Ошибка при сборе награды')
        return
      }

      // Обновляем локальное состояние
      updateGameState({ balance_bul: newBalance })
      setLastClaim(now)
      setAccumulated(0)

      // Убираем анимацию через 2 секунды
      setTimeout(() => setShowCollectAnimation(false), 2000)

      console.log('✅ Farm claimed:', accumulated, 'BUL')

      // Показываем уведомление
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
      }
    } catch (err) {
      console.error('Error claiming farm:', err)
      alert('Произошла ошибка')
    } finally {
      setIsClaiming(false)
    }
  }

  if (!gameState || !telegramUser) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex flex-col h-full px-4 pt-16 pb-24 overflow-y-auto">
        {/* Заголовок */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Ферма BUL</h1>
          <p className="text-white/60 text-sm">Пассивный доход пока вы не в игре</p>
        </div>

        {/* Иконка фермы */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <img
              src="/icons/FERMA.png"
              alt="Ферма"
              className="w-32 h-32 object-contain"
            />
            {showCollectAnimation && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-[#FFD700] text-2xl font-bold animate-bounce">
                  +{accumulated} BUL
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Доход в час */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 mb-4">
          <div className="flex items-center justify-between">
            <div className="text-white/60 text-sm">Доход в час</div>
            <div className="flex items-center gap-2">
              <img src="/icons/BUL.png" className="w-6 h-6" alt="BUL" />
              <span className="text-white text-xl font-bold">
                {incomePerHour.toFixed(0)} BUL/ч
              </span>
            </div>
          </div>
        </div>

        {/* Бонус от персонажа */}
        {activeSkin && activeSkin.farm_bonus > 0 && (
          <div className="bg-gradient-to-r from-[#FFD700]/10 to-[#FFA500]/10 rounded-2xl p-3 border border-[#FFD700]/20 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Бонус персонажа</span>
              <span className="text-[#FFD700] font-bold">
                +{activeSkin.farm_bonus}% от {activeSkin.name}
              </span>
            </div>
          </div>
        )}

        {/* Накоплено */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 mb-4">
          <div className="text-white/60 text-sm mb-3">Накоплено</div>

          {/* Прогресс бар */}
          <div className="relative w-full h-8 bg-white/10 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] transition-all duration-1000 ease-out flex items-center justify-center"
              style={{ width: `${getProgress()}%` }}
            >
              {getProgress() > 20 && (
                <span className="text-black text-sm font-bold">
                  {accumulated.toLocaleString()} / {maxAccumulated.toFixed(0)}
                </span>
              )}
            </div>
          </div>

          {/* Числа */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/icons/BUL.png" className="w-8 h-8" alt="BUL" />
              <span className="text-white text-2xl font-bold">
                {accumulated.toLocaleString()}
              </span>
            </div>
            <span className="text-white/40 text-sm">
              / {maxAccumulated.toFixed(0)} BUL
            </span>
          </div>

          {/* Таймер */}
          <div className="mt-3 text-center">
            <span className="text-white/60 text-sm">
              {getProgress() >= 100 ? '✓ Заполнено' : `До заполнения: ${getTimeToFull()}`}
            </span>
          </div>
        </div>

        {/* Кнопка сбора */}
        <button
          onClick={handleClaim}
          disabled={accumulated === 0 || isClaiming}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
            accumulated === 0 || isClaiming
              ? 'bg-white/10 text-white/40 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black shadow-lg shadow-[#FFD700]/30 active:scale-95'
          }`}
        >
          {isClaiming ? 'Сбор...' : `Собрать ${accumulated.toLocaleString()} BUL`}
        </button>

        {/* Информация */}
        <div className="mt-6 bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
          <h3 className="text-white font-bold mb-2">Как работает ферма?</h3>
          <ul className="text-white/60 text-sm space-y-1">
            <li>• Базовый доход: {BASE_INCOME_PER_HOUR} BUL/час</li>
            <li>• Бонус персонажа увеличивает доход</li>
            <li>• Максимум накопления: {MAX_HOURS} часов</li>
            <li>• Собирайте награду регулярно!</li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}
