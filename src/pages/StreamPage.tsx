import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { StreamChat } from '../components/StreamChat'

export function StreamPage() {
  const [searchParams] = useSearchParams()
  const [source, setSource] = useState('organic')

  // YouTube Video ID (заменить на актуальный при запуске стрима)
  const YOUTUBE_VIDEO_ID = 'YOUR_VIDEO_ID'

  useEffect(() => {
    // Ловим UTM source и сохраняем
    const utmSource = searchParams.get('utm_source')
    if (utmSource) {
      localStorage.setItem('traffic_source', utmSource)
      setSource(utmSource)
    } else {
      const savedSource = localStorage.getItem('traffic_source')
      setSource(savedSource || 'organic')
    }
  }, [searchParams])

  // Динамическая ссылка на бота с UTM
  const botLink = `https://t.me/ARARENA_BOT?start=premium_${source}`

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-b from-yellow-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-full mb-4">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 text-sm font-medium">LIVE</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            <span className="text-[#FFD700]">Крипто-итоги 2024</span>
          </h1>
          <p className="text-white/60 text-lg">
            Разбираем год, планируем 2025
          </p>
        </header>

        {/* YouTube Player */}
        <div className="relative mb-8">
          <div className="aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {YOUTUBE_VIDEO_ID !== 'YOUR_VIDEO_ID' ? (
              <iframe
                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0`}
                title="AR ARENA Live Stream"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                <div className="text-white/40 text-center">
                  <div className="font-medium">Трансляция скоро начнётся</div>
                  <div className="text-sm">Ожидайте...</div>
                </div>
              </div>
            )}
          </div>

          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/20 via-red-500/20 to-yellow-500/20 rounded-2xl blur-xl -z-10" />
        </div>

        {/* CTA Button */}
        <div className="mb-8">
          <a
            href={botLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-4 px-6 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold text-lg rounded-xl text-center active:scale-[0.98] transition-transform shadow-lg shadow-yellow-500/20"
          >
            Получить Premium доступ
          </a>
          <p className="text-center text-white/40 text-sm mt-3">
            Эксклюзивные сигналы, закрытый чат, персональное сопровождение
          </p>
        </div>

        {/* Live Chat */}
        <div className="mb-8">
          <StreamChat />
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { icon: '📊', label: '9 лет', desc: 'опыта' },
            { icon: '🎯', label: '82%', desc: 'успешных' },
            { icon: '👥', label: '5000+', desc: 'клиентов' },
            { icon: '💎', label: '24/7', desc: 'поддержка' },
          ].map((item, i) => (
            <div key={i} className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-white font-bold">{item.label}</div>
              <div className="text-white/50 text-sm">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="text-center pb-8">
          <a
            href={botLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5 text-[#26A5E4]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            <span className="text-white font-medium">Открыть в Telegram</span>
          </a>

          <div className="mt-6 text-white/30 text-sm">
            AR ARENA © 2024 • Все права защищены
          </div>
        </div>
      </div>
    </div>
  )
}
