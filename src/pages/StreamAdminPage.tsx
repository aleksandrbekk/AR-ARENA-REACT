import { useState } from 'react'
import { StreamChat } from '../components/StreamChat'
import { TapGame } from '../components/TapGame'

// Admin stream page with forced admin mode
export function StreamAdminPage() {
  const YOUTUBE_VIDEO_ID = 'TT_xndt5yq4'
  const [utmSource, setUtmSource] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)

  const streamLink = utmSource
    ? `https://ararena.pro/stream?utm_source=${encodeURIComponent(utmSource)}`
    : 'https://ararena.pro/stream'

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(streamLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = streamLink
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
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

        {/* UTM Link Generator */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🔗</span>
            <span className="text-white font-medium">Ссылка на трансляцию</span>
          </div>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="utm_source (instagram, telegram, youtube...)"
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value.replace(/\s/g, '_').toLowerCase())}
              className="flex-1 px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:border-yellow-500/30"
            />
            <button
              onClick={copyLink}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                copiedLink
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-[#FFD700] text-black'
              }`}
            >
              {copiedLink ? '✓ Скопировано' : 'Копировать'}
            </button>
          </div>
          <div className="text-white/40 text-xs font-mono break-all bg-zinc-800/50 px-3 py-2 rounded-lg">
            {streamLink}
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
