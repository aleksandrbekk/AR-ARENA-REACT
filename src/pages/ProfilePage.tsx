import { Layout } from '../components/layout/Layout'
import { useAuth } from '../hooks/useAuth'
import { useSkins } from '../hooks/useSkins'
import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'

interface ProfileStats {
  total_taps: number
  skins_owned: number
  created_at: string
}

export function ProfilePage() {
  const { telegramUser, gameState, isLoading } = useAuth()
  const { activeSkin } = useSkins()
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  console.log('=== PROFILE PAGE RENDER ===')
  console.log('isLoading:', isLoading)
  console.log('loadingStats:', loadingStats)
  console.log('telegramUser:', telegramUser)
  console.log('gameState:', gameState)
  console.log('stats:', stats)
  console.log('activeSkin:', activeSkin)

  // Загрузка статистики профиля
  useEffect(() => {
    async function loadStats() {
      console.log('=== PROFILE PAGE LOADING STATS ===')
      console.log('telegramUser:', telegramUser)

      if (!telegramUser) {
        console.log('No telegramUser, skipping stats load')
        setLoadingStats(false)
        return
      }

      try {
        console.log('Loading stats for telegram_id:', telegramUser.id.toString())

        // Получаем данные из users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('total_taps, created_at')
          .eq('telegram_id', telegramUser.id.toString())
          .single()

        console.log('userData:', userData)
        console.log('userError:', userError)

        if (userError) throw userError

        // Считаем количество купленных скинов
        const { count, error: skinsError } = await supabase
          .from('user_skins')
          .select('*', { count: 'exact', head: true })
          .eq('telegram_id', telegramUser.id.toString())

        console.log('skins count:', count)
        console.log('skinsError:', skinsError)

        // Игнорируем ошибку если просто нет скинов
        // Ошибка 400 может быть когда таблица пустая для user
        if (skinsError && skinsError.code !== 'PGRST116') {
          console.warn('Error getting skins count, using 0:', skinsError)
        }

        const profileStats = {
          total_taps: userData.total_taps || 0,
          skins_owned: count || 0,
          created_at: userData.created_at
        }

        console.log('✅ Profile stats loaded:', profileStats)
        setStats(profileStats)
      } catch (err) {
        console.error('❌ Error loading profile stats:', err)
      } finally {
        setLoadingStats(false)
      }
    }

    loadStats()
  }, [telegramUser])

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (isLoading || loadingStats) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </Layout>
    )
  }

  if (!telegramUser || !gameState || !stats) {
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
      <div className="flex flex-col h-full px-4 pt-16 pb-24 overflow-y-auto">
        {/* Шапка профиля */}
        <div className="flex flex-col items-center mb-6">
          {/* Аватар */}
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#FFD700] shadow-lg shadow-[#FFD700]/30">
              {telegramUser.photo_url ? (
                <img
                  src={telegramUser.photo_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center">
                  <span className="text-black text-3xl font-bold">
                    {telegramUser.first_name[0].toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Имя и username */}
          <h1 className="text-2xl font-bold text-white mb-1">
            {telegramUser.first_name}
            {telegramUser.last_name && ` ${telegramUser.last_name}`}
          </h1>
          {telegramUser.username && (
            <p className="text-white/60 text-sm mb-1">@{telegramUser.username}</p>
          )}
          <p className="text-white/40 text-xs">ID: {telegramUser.id}</p>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Всего тапов */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="text-white/60 text-xs mb-1">Всего тапов</div>
            <div className="text-white text-2xl font-bold">
              {stats.total_taps.toLocaleString()}
            </div>
          </div>

          {/* Заработано BUL */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="text-white/60 text-xs mb-1">Заработано BUL</div>
            <div className="flex items-center gap-1">
              <img src="/icons/BUL.png" className="w-6 h-6" alt="BUL" />
              <span className="text-white text-2xl font-bold">
                {gameState.balance_bul.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Уровень */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="text-white/60 text-xs mb-1">Уровень</div>
            <div className="text-white text-2xl font-bold">
              {gameState.level}
            </div>
          </div>

          {/* Куплено скинов */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="text-white/60 text-xs mb-1">Куплено скинов</div>
            <div className="text-white text-2xl font-bold">
              {stats.skins_owned}
            </div>
          </div>
        </div>

        {/* Активный персонаж */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 mb-4">
          <h2 className="text-white text-lg font-bold mb-4">Активный персонаж</h2>

          {activeSkin ? (
            <div className="flex items-center gap-4">
              {/* Изображение скина */}
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                <img
                  src={`/icons/skins/${activeSkin.file}`}
                  alt={activeSkin.name}
                  className="w-20 h-20 object-contain"
                />
              </div>

              {/* Информация о скине */}
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-1">{activeSkin.name}</h3>
                <div className="text-white/60 text-sm space-y-1">
                  <div>Тап бонус: +{activeSkin.tap_bonus}%</div>
                  <div>Реген бонус: +{activeSkin.regen_bonus}%</div>
                  <div>Ферма бонус: +{activeSkin.farm_bonus}%</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-white/40 py-4">
              Нет активного персонажа
            </div>
          )}
        </div>

        {/* Дата регистрации */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
          <div className="text-white/60 text-xs mb-1">Дата регистрации</div>
          <div className="text-white text-base">
            {formatDate(stats.created_at)}
          </div>
        </div>
      </div>
    </Layout>
  )
}
