import { Layout } from '../components/layout/Layout'
import { Header } from '../components/Header'
import { BalanceDisplay } from '../components/BalanceDisplay'
import { StatusBar } from '../components/StatusBar'
import { TapBull } from '../components/TapBull'
import { SideButtons } from '../components/SideButtons'
import { FloatingNumber } from '../components/FloatingNumber'
import { Particles } from '../components/Particles'
import { useAuth } from '../hooks/useAuth'
import { useTap } from '../hooks/useTap'
import { useEnergy } from '../hooks/useEnergy'
import { useSkins } from '../hooks/useSkins'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function Home() {
  const { telegramUser, gameState, isLoading, error, updateGameState } = useAuth()
  const { tap, isProcessing } = useTap(telegramUser?.id?.toString() || '')
  const { activeSkin } = useSkins()
  const navigate = useNavigate()

  // Состояние для плавающих чисел
  const [floatingNumbers, setFloatingNumbers] = useState<Array<{
    id: number
    value: number
  }>>([])

  // Функция удаления плавающего числа
  const removeFloatingNumber = useCallback((id: number) => {
    setFloatingNumbers(prev => prev.filter(n => n.id !== id))
  }, [])

  // Callback для обновления энергии
  const handleEnergyUpdate = useCallback((energy: number, energyMax: number) => {
    updateGameState({ energy, energy_max: energyMax })
  }, [updateGameState])

  // Автоматическое восстановление энергии каждые 5 секунд
  useEnergy(telegramUser?.id?.toString() || '', handleEnergyUpdate)

  // Обработчик тапа на быка
  const handleTap = async () => {
    // Проверяем условия для тапа
    if (!telegramUser || !gameState || gameState.energy <= 0 || isProcessing || isLoading) {
      console.log('Tap blocked:', {
        hasUser: !!telegramUser,
        hasState: !!gameState,
        energy: gameState?.energy,
        isProcessing,
        isLoading
      })
      return
    }

    console.log('Processing tap...')
    const result = await tap(1)

    if (result?.success) {
      console.log(`✅ Tap successful! +${result.bul_earned} BUL`)

      if (result.leveled_up) {
        console.log('🎉 LEVEL UP!')
      }

      // Добавить плавающее число
      setFloatingNumbers(prev => [...prev, { id: Date.now(), value: result.bul_earned }])

      // Обновляем данные локально (оптимистичное обновление)
      updateGameState({
        balance_bul: result.balance_bul,
        energy: result.energy,
        level: result.level,
        xp: result.xp,
        xp_to_next: result.xp_to_next
      })
    } else {
      console.log('❌ Tap failed')
    }
  }

  // Выводим данные в консоль для отладки
  console.log('=== HOME PAGE DEBUG ===')
  console.log('isLoading:', isLoading)
  console.log('error:', error)
  console.log('telegramUser:', telegramUser)
  console.log('gameState:', gameState)

  // Показываем индикатор загрузки
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </Layout>
    )
  }

  // Показываем ошибку
  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-red-400 text-xl">Error: {error}</div>
        </div>
      </Layout>
    )
  }

  // Проверяем наличие данных
  if (!telegramUser || !gameState) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-xl">No data</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <Particles />
      {/* Spotlight Effect */}
      <div
        className="absolute top-0 left-0 right-0 h-[60vh] pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle at 50% -20%, rgba(255,255,255,0.1) 0%, transparent 70%)' }}
      />

      <div className="flex flex-col h-full pb-24 relative z-10">
        {/* Header вверху страницы */}
        <Header
          photoUrl={telegramUser.photo_url}
          firstName={telegramUser.first_name}
          balanceAr={gameState.balance_ar}
        />

        {/* BalanceDisplay */}
        <div className="flex justify-center py-2">
          <BalanceDisplay balance={gameState.balance_bul} />
        </div>

        {/* TapBull - основной компонент тапа */}
        <TapBull
          skinFile={gameState.active_skin || 'Bull1.png'}
          onTap={handleTap}
        >
          <SideButtons
            onSkinsClick={() => navigate('/skins')}
            onFarmClick={() => navigate('/farm')}
            onGiveawaysClick={() => navigate('/giveaways')}
          />
        </TapBull>

        {/* StatusBar внизу - Энергия + Статы */}
        <StatusBar
          energy={gameState.energy}
          energyMax={gameState.energy_max}
          activeSkin={activeSkin}
        />
      </div>

      {/* Плавающие числа */}
      {floatingNumbers.map(num => (
        <FloatingNumber
          key={num.id}
          id={num.id}
          value={num.value}
          onComplete={removeFloatingNumber}
        />
      ))}
    </Layout>
  )
}

