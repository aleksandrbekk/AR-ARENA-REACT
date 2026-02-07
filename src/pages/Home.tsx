import { Layout } from '../components/layout/Layout'
import { Header } from '../components/Header'
import { TapBull } from '../components/TapBull'
import { SideButtons } from '../components/SideButtons'
import { Particles } from '../components/Particles'
import { BrowserFallback } from '../components/BrowserFallback'
import { useAuth } from '../hooks/useAuth'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Админы которые видят полное приложение
const ADMIN_IDS = [190202791, 144828618, 288542643, 288475216]

export function Home() {
  const { telegramUser, gameState, isLoading, error } = useAuth()
  const navigate = useNavigate()

  // Редирект не-админов на страницу тарифов (приложение в разработке)
  const isAdmin = telegramUser?.id ? ADMIN_IDS.includes(telegramUser.id) : false

  useEffect(() => {
    if (!isLoading && telegramUser && !isAdmin) {
      navigate('/pricing', { replace: true })
    }
  }, [isLoading, telegramUser, isAdmin, navigate])

  // SECURITY FIX: Removed debug console.log statements with user data

  // Показываем индикатор загрузки
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-xl">Загрузка...</div>
        </div>
      </Layout>
    )
  }

  // Показываем ошибку только если нет данных
  if (error && !gameState && !telegramUser) {
    // Если открыли в браузере (не в Telegram) - показываем красивый экран
    const isTelegramError = error.includes('Invalid Telegram session') ||
      error.includes('only works in Telegram')

    if (isTelegramError) {
      return <BrowserFallback />
    }

    const isConnectionError = error.includes('Failed to fetch') ||
      error.includes('ERR_NAME_NOT_RESOLVED') ||
      error.includes('Load failed') ||
      error.includes('TypeError')

    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
          <div className="text-red-400 text-xl text-center">
            {isConnectionError ? (
              <>
                <div className="mb-2">⚠️ Ошибка подключения к Supabase</div>
                <div className="text-sm text-gray-400 mt-4">
                  Проект Supabase недоступен.<br />
                  Проверьте статус проекта в панели управления.
                </div>
              </>
            ) : (
              `Error: ${error}`
            )}
          </div>
        </div>
      </Layout>
    )
  }

  // Проверяем наличие данных
  if (!telegramUser || !gameState) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-xl">Загрузка...</div>
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

        {/* AR ARENA Premium Title */}
        <div className="flex justify-center py-3">
          <div className="relative px-8 py-2">
            {/* Glow behind */}
            <div
              className="absolute inset-0 rounded-2xl blur-xl opacity-30"
              style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)' }}
            />
            {/* Glass plaque */}
            <div className="relative flex items-center gap-2 px-6 py-2 rounded-2xl bg-black/40 backdrop-blur-md border border-yellow-500/20 shadow-[0_0_30px_rgba(255,215,0,0.1)]">
              <span
                className="text-xl font-black tracking-[0.25em] uppercase bg-gradient-to-r from-[#FFD700] via-[#FFC84D] to-[#FFA500] bg-clip-text text-transparent drop-shadow-sm"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                AR ARENA
              </span>
            </div>
          </div>
        </div>

        {/* TapBull - бык без тапа */}
        <TapBull
          skinFile={gameState.active_skin || 'Bull1.png'}
        >
          <SideButtons
            onFriendsClick={() => navigate('/partners')}
            onTasksClick={() => navigate('/tasks')}
            onSkinsClick={() => navigate('/skins')}
            onGiveawaysClick={() => navigate('/giveaways')}
          />
        </TapBull>
      </div>
    </Layout>
  )
}
