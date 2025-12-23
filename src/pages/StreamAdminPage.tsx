import { useState, useEffect } from 'react'
import { StreamChat } from '../components/StreamChat'
import { TapGame } from '../components/TapGame'
import { supabase } from '../lib/supabase'

// Admin stream page with forced admin mode
export function StreamAdminPage() {
  const YOUTUBE_VIDEO_ID = 'TT_xndt5yq4'
  const [showPremiumButton, setShowPremiumButton] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [onlineCount, setOnlineCount] = useState(0)
  const [totalViews, setTotalViews] = useState(0)

  // Загрузка настроек и просмотров
  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from('stream_settings')
        .select('show_premium_button, total_views')
        .eq('id', 1)
        .single()

      if (data) {
        setShowPremiumButton(data.show_premium_button)
        setTotalViews(data.total_views || 0)
      }
    }
    loadSettings()

    // Polling для просмотров каждые 5 секунд
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('stream_settings')
        .select('total_views')
        .eq('id', 1)
        .single()
      if (data) setTotalViews(data.total_views || 0)
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [])

  // Подписка на Presence для онлайн счётчика
  useEffect(() => {
    const presenceChannel = supabase.channel('stream_viewers')

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const count = Object.keys(state).length
        setOnlineCount(count)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(presenceChannel)
    }
  }, [])

  // Переключение кнопки
  const togglePremiumButton = async () => {
    setIsUpdating(true)
    const newValue = !showPremiumButton

    const { error } = await supabase
      .from('stream_settings')
      .update({
        show_premium_button: newValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)

    if (!error) {
      setShowPremiumButton(newValue)
    }
    setIsUpdating(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-b from-yellow-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Animated particles effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-2 h-2 bg-yellow-500/30 rounded-full animate-pulse" />
        <div className="absolute top-40 right-1/3 w-1 h-1 bg-orange-500/40 rounded-full animate-ping" />
        <div className="absolute top-60 left-1/2 w-1.5 h-1.5 bg-yellow-400/20 rounded-full animate-pulse" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 pt-16 pb-8">
        <header className="text-center mb-8">
          {/* LIVE Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500/20 to-red-600/10 border border-red-500/30 rounded-full mb-5 shadow-lg shadow-red-500/10">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="text-red-400 text-sm font-bold tracking-wider">LIVE</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] bg-clip-text text-transparent">
              Крипто-итоги 2025
            </span>
          </h1>
          <p className="text-white/50 text-lg tracking-wide">
            Разбираем год, планируем 2026
          </p>
        </header>

        {/* Admin: Статистика зрителей */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="p-4 bg-zinc-900/80 border border-green-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </span>
              </div>
              <div>
                <p className="text-white/50 text-sm">Онлайн сейчас</p>
                <p className="text-2xl font-bold text-green-400">{onlineCount}</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-zinc-900/80 border border-blue-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <p className="text-white/50 text-sm">Всего просмотров</p>
                <p className="text-2xl font-bold text-blue-400">{totalViews}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin: Premium Button Toggle */}
        <div className="mb-6 p-4 bg-zinc-900/80 border border-yellow-500/30 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold">Кнопка Premium</h3>
              <p className="text-white/50 text-sm">
                {showPremiumButton ? 'Показывается вместо тапалки' : 'Скрыта, показывается тапалка'}
              </p>
            </div>
            <button
              onClick={togglePremiumButton}
              disabled={isUpdating}
              className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
                showPremiumButton ? 'bg-gradient-to-r from-[#FFD700] to-[#FFA500]' : 'bg-zinc-700'
              } ${isUpdating ? 'opacity-50' : ''}`}
            >
              <span
                className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${
                  showPremiumButton ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* YouTube Player */}
        <div className="relative mb-8 group">
          <div className="aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
            <iframe
              src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0`}
              title="AR ARENA Live Stream"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-yellow-500/30 rounded-tl-2xl pointer-events-none" />
            <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-yellow-500/30 rounded-tr-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-yellow-500/30 rounded-bl-2xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-yellow-500/30 rounded-br-2xl pointer-events-none" />
          </div>
          {/* Glow effect */}
          <div className="absolute -inset-2 bg-gradient-to-r from-yellow-500/20 via-red-500/10 to-yellow-500/20 rounded-3xl blur-2xl -z-10 opacity-60 group-hover:opacity-80 transition-opacity" />
        </div>

        {/* Admin: Tap Game Control */}
        <TapGame userName="" isAdmin={true} />

        {/* Live Chat */}
        <div className="w-full overflow-hidden">
          <StreamChat forceAdmin={true} />
        </div>

      </div>
    </div>
  )
}
