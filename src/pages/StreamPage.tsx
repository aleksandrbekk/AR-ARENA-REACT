import { useState, useEffect } from 'react'
import { StreamChat } from '../components/StreamChat'
import { TapGame } from '../components/TapGame'
import { supabase } from '../lib/supabase'

interface StreamSettings {
  show_premium_button: boolean
  button_text: string
  button_url: string
}

export function StreamPage() {
  const YOUTUBE_VIDEO_ID = 'TT_xndt5yq4'
  const [guestName, setGuestName] = useState('')
  const [settings, setSettings] = useState<StreamSettings>({
    show_premium_button: false,
    button_text: 'Выбрать клубную карту',
    button_url: 'https://t.me/ARARENA_BOT?start=premium_01'
  })

  // Сохранение UTM из URL и запись клика в БД
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const utmSource = params.get('utm_source')
    if (utmSource) {
      localStorage.setItem('stream_utm_source', utmSource)

      // Записываем клик в БД
      const trackClick = async () => {
        try {
          // Находим ссылку по slug
          const { data: link } = await supabase
            .from('utm_tool_links')
            .select('id, clicks')
            .eq('slug', utmSource)
            .single()

          if (link) {
            // Увеличиваем счётчик кликов и записываем время последнего перехода
            await supabase
              .from('utm_tool_links')
              .update({
                clicks: link.clicks + 1,
                last_click_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', link.id)
          }
        } catch (err) {
          // Молча игнорируем ошибки трекинга
          console.error('Track click error:', err)
        }
      }

      trackClick()

      // Убираем UTM из URL без перезагрузки
      window.history.replaceState({}, '', '/stream')
    }
  }, [])

  // Загрузка настроек и подписка на Realtime
  useEffect(() => {
    // Загружаем начальные настройки
    const loadSettings = async () => {
      const { data } = await supabase
        .from('stream_settings')
        .select('show_premium_button, button_text, button_url')
        .eq('id', 1)
        .single()

      if (data) {
        setSettings(data)
      }
    }

    loadSettings()

    // Подписываемся на изменения в реалтайме
    const channel = supabase
      .channel('stream_settings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stream_settings',
          filter: 'id=eq.1'
        },
        (payload) => {
          const newSettings = payload.new as StreamSettings
          setSettings(newSettings)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Загрузка имени из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('stream_guest_name')
    if (saved) setGuestName(saved)

    // Слушаем изменения localStorage
    const handleStorage = () => {
      const name = localStorage.getItem('stream_guest_name')
      if (name) setGuestName(name)
    }
    window.addEventListener('storage', handleStorage)

    // Проверяем каждую секунду (для той же вкладки)
    const interval = setInterval(() => {
      const name = localStorage.getItem('stream_guest_name')
      if (name && name !== guestName) setGuestName(name)
    }, 1000)

    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [guestName])

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
        {/* Header */}
        <header className="text-center mb-8">
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

        {/* Premium Button или Tap Game */}
        {settings.show_premium_button ? (
          <div className="mb-8">
            {/* Aurora rotate animation */}
            <style>{`
              @keyframes aurora-rotate-btn {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>

            <a
              href={settings.button_url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block w-full overflow-hidden rounded-xl"
            >
              {/* Aurora rotating glow - как у GOLD карточки */}
              <div
                className="absolute inset-[-2px] rounded-xl"
                style={{
                  background: `conic-gradient(
                    from 0deg,
                    transparent 0deg,
                    #F5A623 60deg,
                    #E69500 120deg,
                    transparent 180deg,
                    #F5A623 240deg,
                    #E69500 300deg,
                    transparent 360deg
                  )`,
                  filter: 'blur(18px)',
                  opacity: 0.6,
                  animation: 'aurora-rotate-btn 8s linear infinite'
                }}
              />

              {/* Button content */}
              <div className="relative bg-[#08080a] py-4 px-6 rounded-xl">
                <span className="block text-center font-medium text-white">
                  {settings.button_text}
                </span>
              </div>
            </a>
          </div>
        ) : (
          <TapGame userName={guestName} />
        )}

        {/* Live Chat */}
        <div className="w-full overflow-hidden">
          <StreamChat />
        </div>

      </div>
    </div>
  )
}
