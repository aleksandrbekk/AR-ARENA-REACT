import type { UtmToolLink } from './types'

// ============ PROPS ============
interface ToolLinksProps {
  links: UtmToolLink[]
  copiedId: string | null
  loadingStats: boolean
  onCopyLink: (url: string, id: string) => void
  onDeleteLink: (id: number, name: string) => void
  onShowStats: (slug: string) => void
  onCreateLink: () => void
}

// ============ HELPERS ============
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit'
  })
}

const formatRelativeTime = (date: string | null) => {
  if (!date) return '-'
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'сейчас'
  if (diffMins < 60) return `${diffMins}м`
  if (diffHours < 24) return `${diffHours}ч`
  if (diffDays < 7) return `${diffDays}д`
  return formatDate(date)
}

const getConversionRate = (clicks: number, conversions: number) => {
  if (clicks === 0) return '0%'
  return `${((conversions / clicks) * 100).toFixed(1)}%`
}

const getToolUrl = (link: UtmToolLink) => {
  if (link.tool_type === 'stream') {
    return `https://ararena.pro/stream?utm_source=${link.slug}`
  }
  if (link.tool_type === 'promo') {
    return `https://ararena.pro/promo?utm_source=${link.slug}`
  }
  if (link.tool_type === 'promo-tg') {
    return `https://ararena.pro/promo-tg?utm_source=${link.slug}`
  }
  return `https://ararena.pro/?utm_source=${link.slug}`
}

// ============ КОМПОНЕНТ ============
export function ToolLinks({
  links,
  copiedId,
  loadingStats,
  onCopyLink,
  onDeleteLink,
  onShowStats,
  onCreateLink
}: ToolLinksProps) {
  return (
    <div className="space-y-4">
      <button
        onClick={onCreateLink}
        className="w-full px-4 py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-xl active:scale-[0.98] transition-transform"
      >
        Создать ссылку
      </button>

      <div className="space-y-2">
        {links.length === 0 ? (
          <div className="bg-zinc-900/30 rounded-xl p-8 text-center border border-white/5">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div className="text-white/40 text-sm">Нет ссылок</div>
          </div>
        ) : (
          links.map((link) => (
            <div
              key={link.id}
              className="bg-zinc-900/50 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{link.name}</div>
                    <div className="text-white/30 text-xs font-mono truncate">
                      utm_source={link.slug}
                    </div>
                  </div>
                  <div className="text-white/30 text-xs shrink-0 ml-2">
                    {formatDate(link.created_at)}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="text-center">
                    <div className="text-[#FFD700] font-bold">{link.clicks}</div>
                    <div className="text-white/30 text-[10px]">клики</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-400 font-bold">{link.conversions}</div>
                    <div className="text-white/30 text-[10px]">конв.</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold">{getConversionRate(link.clicks, link.conversions)}</div>
                    <div className="text-white/30 text-[10px]">CR</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white/60 font-medium text-sm">{formatRelativeTime(link.last_click_at)}</div>
                    <div className="text-white/30 text-[10px]">визит</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onCopyLink(getToolUrl(link), `t-${link.id}`)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      copiedId === `t-${link.id}`
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-zinc-700 text-white'
                    }`}
                  >
                    {copiedId === `t-${link.id}` ? 'Скопировано' : 'Копировать'}
                  </button>
                  {(link.tool_type === 'promo' || link.tool_type === 'promo-tg') && (
                    <button
                      onClick={() => onShowStats(link.slug)}
                      disabled={loadingStats}
                      className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                      title="Детальная статистика"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteLink(link.id, link.name)}
                    className="px-4 py-2 text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
