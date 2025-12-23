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
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500/20 to-red-600/10 border border-red-500/30 rounded-full mb-5 shadow-lg shadow-red-500/10">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="text-red-400 text-sm font-bold tracking-wider">LIVE</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            <span className="text-[#FFD700]">Крипто-итоги 2025</span>
          </h1>
          <p className="text-white/60 text-lg">
            Разбираем год, планируем 2026
          </p>
        </header>

        {/* YouTube Player */}
        <div className="relative mb-8">
          <div className="aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <iframe
              src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0`}
              title="AR ARENA Live Stream"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
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
