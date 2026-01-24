import type { UtmLink, FolderStats } from './types'

// ============ PROPS ============
interface PaymentLinksProps {
  links: UtmLink[]
  folders: string[]
  activeFolder: string | null
  copiedId: string | null
  onSetActiveFolder: (folder: string | null) => void
  onCopyLink: (url: string, id: string) => void
  onDeleteLink: (id: number, name: string) => void
  onMoveToFolder: (linkId: number, folder: string | null) => void
  onEditFolder: (folder: string) => void
  onDeleteFolder: (folder: string) => void
  onCreateLink: () => void
  onCreateFolder: () => void
}

// ============ HELPERS ============
const getConversionRate = (clicks: number, conversions: number) => {
  if (clicks === 0) return '0%'
  return `${((conversions / clicks) * 100).toFixed(1)}%`
}

const getFolderStats = (links: UtmLink[], folderName: string): FolderStats => {
  const folderLinks = links.filter(l => l.folder === folderName)
  return {
    count: folderLinks.length,
    clicks: folderLinks.reduce((sum, l) => sum + l.clicks, 0),
    conversions: folderLinks.reduce((sum, l) => sum + l.conversions, 0)
  }
}

// ============ КОМПОНЕНТ ============
export function PaymentLinks({
  links,
  folders,
  activeFolder,
  copiedId,
  onSetActiveFolder,
  onCopyLink,
  onDeleteLink,
  onMoveToFolder,
  onEditFolder,
  onDeleteFolder,
  onCreateLink,
  onCreateFolder
}: PaymentLinksProps) {
  // Ссылки без папки
  const linksWithoutFolder = links.filter(l => !l.folder)
  // Ссылки в текущей папке
  const linksInFolder = activeFolder ? links.filter(l => l.folder === activeFolder) : []

  // ============ РЕЖИМ: ВНУТРИ ПАПКИ ============
  if (activeFolder) {
    return (
      <div className="space-y-4">
        {/* Шапка папки */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onSetActiveFolder(null)}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Назад</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onEditFolder(activeFolder)}
              className="text-white/40 hover:text-white text-xs transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDeleteFolder(activeFolder)}
              className="text-red-400/40 hover:text-red-400 text-xs transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Название папки и статистика */}
        <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#FFD700]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
              </svg>
            </div>
            <div>
              <div className="text-white font-bold text-lg">{activeFolder}</div>
              <div className="text-white/40 text-xs">{linksInFolder.length} ссылок</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
              <div className="text-white/50 text-[10px] uppercase tracking-wider">Клики</div>
              <div className="text-white font-bold">{linksInFolder.reduce((s, l) => s + l.clicks, 0)}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
              <div className="text-white/50 text-[10px] uppercase tracking-wider">Конверсии</div>
              <div className="text-green-400 font-bold">{linksInFolder.reduce((s, l) => s + l.conversions, 0)}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
              <div className="text-white/50 text-[10px] uppercase tracking-wider">CR</div>
              <div className="text-[#FFD700] font-bold">
                {getConversionRate(
                  linksInFolder.reduce((s, l) => s + l.clicks, 0),
                  linksInFolder.reduce((s, l) => s + l.conversions, 0)
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Кнопка добавить */}
        <button
          onClick={onCreateLink}
          className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors border border-white/10 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить ссылку
        </button>

        {/* Список ссылок в папке */}
        <div className="space-y-2">
          {linksInFolder.length === 0 ? (
            <div className="bg-zinc-900/30 rounded-xl p-8 text-center border border-white/5">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div className="text-white/40 text-sm">Папка пуста</div>
            </div>
          ) : (
            linksInFolder.map((link) => (
              <div
                key={link.id}
                className="bg-zinc-900/50 backdrop-blur-md rounded-xl p-3 border border-white/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">{link.name}</div>
                    <div className="text-white/30 text-xs font-mono truncate">
                      premium_{link.slug}
                    </div>
                  </div>
                  <button
                    onClick={() => onCopyLink(`https://t.me/ARARENA_BOT?start=premium_${link.slug}`, `p-${link.id}`)}
                    className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                      copiedId === `p-${link.id}`
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-zinc-700 text-white/70'
                    }`}
                  >
                    {copiedId === `p-${link.id}` ? 'OK' : 'Copy'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-white/50">{link.clicks} кл.</span>
                    <span className="text-green-400/70">{link.conversions} конв.</span>
                    <span className="text-[#FFD700]/70">{getConversionRate(link.clicks, link.conversions)}</span>
                  </div>
                  <button
                    onClick={() => onDeleteLink(link.id, link.name)}
                    className="text-red-400/40 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  // ============ РЕЖИМ: КАТАЛОГ ПАПОК ============
  return (
    <div className="space-y-4">
      {/* Общая статистика */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
          <div className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Всего</div>
          <div className="text-white font-bold text-lg">{links.length}</div>
        </div>
        <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
          <div className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Кликов</div>
          <div className="text-[#FFD700] font-bold text-lg">{links.reduce((s, l) => s + l.clicks, 0)}</div>
        </div>
        <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
          <div className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Конверсий</div>
          <div className="text-green-400 font-bold text-lg">{links.reduce((s, l) => s + l.conversions, 0)}</div>
        </div>
      </div>

      {/* Кнопка создать папку */}
      <button
        onClick={onCreateFolder}
        className="w-full px-4 py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-semibold rounded-xl active:scale-[0.98] transition-transform"
      >
        Создать папку
      </button>

      {/* Список папок */}
      <div className="space-y-2">
        {folders.map(folder => {
          const stats = getFolderStats(links, folder)
          return (
            <button
              key={folder}
              onClick={() => onSetActiveFolder(folder)}
              className="w-full bg-zinc-900/50 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:border-yellow-500/30 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center group-hover:from-yellow-500/30 group-hover:to-orange-500/30 transition-colors">
                  <svg className="w-5 h-5 text-[#FFD700]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium">{folder}</div>
                  <div className="text-white/40 text-xs">{stats.count} ссылок</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-white/60 text-sm">{stats.clicks} кл.</div>
                  <div className="text-green-400/60 text-xs">{stats.conversions} конв.</div>
                </div>
                <svg className="w-5 h-5 text-white/30 group-hover:text-white/50 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )
        })}

        {/* Ссылки без папки */}
        {linksWithoutFolder.length > 0 && (
          <div className="mt-4">
            <div className="text-white/30 text-xs uppercase tracking-wider mb-2 px-1">Без категории</div>
            {linksWithoutFolder.map((link) => (
              <div
                key={link.id}
                className="bg-zinc-900/30 rounded-xl p-3 border border-white/5 mb-2"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-white/70 font-medium text-sm truncate">{link.name}</div>
                    <div className="text-white/20 text-xs font-mono truncate">premium_{link.slug}</div>
                  </div>
                  <button
                    onClick={() => onCopyLink(`https://t.me/ARARENA_BOT?start=premium_${link.slug}`, `p-${link.id}`)}
                    className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                      copiedId === `p-${link.id}`
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-zinc-800 text-white/50'
                    }`}
                  >
                    {copiedId === `p-${link.id}` ? 'OK' : 'Copy'}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-white/40">{link.clicks} кл.</span>
                    <span className="text-green-400/50">{link.conversions} конв.</span>
                  </div>
                  <select
                    value=""
                    onChange={(e) => onMoveToFolder(link.id, e.target.value || null)}
                    className="bg-zinc-800 text-white/50 text-xs rounded px-2 py-1 border border-white/10 focus:outline-none"
                  >
                    <option value="">Переместить...</option>
                    {folders.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {folders.length === 0 && linksWithoutFolder.length === 0 && (
          <div className="bg-zinc-900/30 rounded-xl p-8 text-center border border-white/5">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white/30" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
              </svg>
            </div>
            <div className="text-white/40 text-sm mb-1">Нет папок</div>
            <div className="text-white/30 text-xs">Создайте первую папку для UTM-ссылок</div>
          </div>
        )}
      </div>
    </div>
  )
}
