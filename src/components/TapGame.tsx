import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface TapScore {
  id: number
  user_name: string
  taps_count: number
}

interface TapGameProps {
  userName: string
  isAdmin?: boolean
}

export function TapGame({ userName, isAdmin = false }: TapGameProps) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [myTaps, setMyTaps] = useState(0)
  const [topScores, setTopScores] = useState<TapScore[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [pendingTaps, setPendingTaps] = useState(0)

  // Определяем функции загрузки перед useEffect
  const loadSettings = useCallback(async () => {
    const { data } = await supabase
      .from('stream_settings')
      .select('tap_game_enabled')
      .single()

    if (data) {
      setIsEnabled(data.tap_game_enabled)
    }
  }, [])

  const loadTopScores = useCallback(async () => {
    const { data } = await supabase
      .from('stream_taps')
      .select('*')
      .order('taps_count', { ascending: false })
      .limit(5)

    if (data) {
      setTopScores(data)
    }
  }, [])

  const loadMyTaps = useCallback(async () => {
    const { data } = await supabase
      .from('stream_taps')
      .select('taps_count')
      .eq('user_name', userName)
      .single()

    if (data) {
      setMyTaps(data.taps_count)
    }
  }, [userName])

  const saveTaps = useCallback(async () => {
    if (pendingTaps === 0 || !userName) return

    const tapsToSave = pendingTaps
    setPendingTaps(0)

    // Upsert - создаём или обновляем
    const { data: existing } = await supabase
      .from('stream_taps')
      .select('id, taps_count')
      .eq('user_name', userName)
      .single()

    if (existing) {
      await supabase
        .from('stream_taps')
        .update({
          taps_count: existing.taps_count + tapsToSave,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('stream_taps')
        .insert({
          user_name: userName,
          taps_count: tapsToSave
        })
    }
  }, [pendingTaps, userName])

  // Загрузка настроек и топа
  useEffect(() => {
    loadSettings()
    loadTopScores()

    // Подписка на изменения настроек
    const settingsChannel = supabase
      .channel('stream_settings_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'stream_settings'
      }, () => {
        loadSettings()
      })
      .subscribe()

    // Подписка на изменения топа
    const tapsChannel = supabase
      .channel('stream_taps_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stream_taps'
      }, () => {
        loadTopScores()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(settingsChannel)
      supabase.removeChannel(tapsChannel)
    }
  }, [loadSettings, loadTopScores])

  // Загрузка моих тапов при смене имени
  useEffect(() => {
    if (userName && isEnabled) {
      loadMyTaps()
    }
  }, [userName, isEnabled, loadMyTaps])

  // Отправка накопленных тапов каждые 3 секунды
  useEffect(() => {
    if (pendingTaps === 0) return

    const timer = setTimeout(() => {
      saveTaps()
    }, 3000)

    return () => clearTimeout(timer)
  }, [pendingTaps, saveTaps])

  const handleTap = useCallback(() => {
    if (!userName) return

    setMyTaps(prev => prev + 1)
    setPendingTaps(prev => prev + 1)
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 100)
  }, [userName])

  const toggleGame = async () => {
    const newValue = !isEnabled
    await supabase
      .from('stream_settings')
      .update({
        tap_game_enabled: newValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)

    setIsEnabled(newValue)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  // Админская панель управления
  if (isAdmin) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎮</span>
          <div>
            <p className="text-white font-medium">Тапалка</p>
            <p className="text-white/50 text-sm">
              {isEnabled ? 'Активна на лендинге' : 'Выключена'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleGame}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            isEnabled
              ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
              : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
          }`}
        >
          {isEnabled ? 'Выключить' : 'Включить'}
        </button>
      </div>
    )
  }

  // Если выключено - не показываем
  if (!isEnabled) return null

  // Игровая панель для пользователей
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl mb-4">
      {/* Кнопка тапа */}
      <button
        onClick={handleTap}
        disabled={!userName}
        className={`relative w-14 h-14 flex items-center justify-center transition-transform active:scale-90 ${
          isAnimating ? 'scale-95' : ''
        } ${!userName ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <img src="/icons/arcoin.png" alt="coin" className="w-14 h-14 object-contain drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]" />
        {isAnimating && (
          <span className="absolute -top-2 text-[#FFD700] text-sm font-bold animate-ping">+1</span>
        )}
      </button>

      {/* Мой счёт */}
      <div className="flex flex-col">
        <span className="text-[#FFD700] text-xl font-bold">{formatNumber(myTaps)}</span>
        <span className="text-white/50 text-xs">твои тапы</span>
      </div>

      {/* Разделитель */}
      <div className="w-px h-10 bg-white/10" />

      {/* Топ игроков */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-1 text-xs">
          <span className="text-yellow-500">🏆</span>
          {topScores.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {topScores.slice(0, 3).map((score, i) => (
                <span key={score.id} className="text-white/70 whitespace-nowrap">
                  <span className="text-white/40">{i + 1}.</span> {score.user_name.slice(0, 8)} <span className="text-[#FFD700]">{formatNumber(score.taps_count)}</span>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-white/40">Будь первым!</span>
          )}
        </div>
      </div>
    </div>
  )
}
