import { StreamChat } from '../components/StreamChat'

export function StreamPage() {
  // YouTube Video ID
  const YOUTUBE_VIDEO_ID = 'TT_xndt5yq4'

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

        {/* Live Chat - на всю ширину на мобильных */}
        <div className="-mx-4 md:mx-0">
          <StreamChat />
        </div>

      </div>
    </div>
  )
}
