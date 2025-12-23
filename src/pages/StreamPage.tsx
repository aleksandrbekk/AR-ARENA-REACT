import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { StreamChat } from '../components/StreamChat'

export function StreamPage() {
  const [searchParams] = useSearchParams()
  const [source, setSource] = useState('organic')

  // YouTube Video ID
  const YOUTUBE_VIDEO_ID = 'TT_xndt5yq4'

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

      </div>
    </div>
  )
}
