import { StreamChat } from '../components/StreamChat'

// Admin stream page with forced admin mode
export function StreamAdminPage() {
  const YOUTUBE_VIDEO_ID = 'TT_xndt5yq4'

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="fixed inset-0 bg-gradient-to-b from-yellow-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-500/20 to-orange-600/10 border border-yellow-500/30 rounded-full mb-5 shadow-lg shadow-yellow-500/10">
            <span className="text-yellow-500 text-sm font-bold tracking-wider">ADMIN MODE</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            <span className="text-[#FFD700]">Крипто-итоги 2025</span>
          </h1>
          <p className="text-white/60 text-lg">
            Модерация чата
          </p>
        </header>

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
          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20 rounded-2xl blur-xl -z-10" />
        </div>

        <div className="-mx-4 md:mx-0">
          <StreamChat forceAdmin={true} />
        </div>

      </div>
    </div>
  )
}
