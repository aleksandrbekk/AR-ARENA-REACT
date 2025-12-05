interface StatusBarProps {
  level: number
  xp: number
  xpToNext: number
  energy: number
  energyMax: number
}

export function StatusBar({ level, xp, xpToNext, energy }: StatusBarProps) {
  const xpPercent = Math.min((xp / xpToNext) * 100, 100)

  return (
    <div className="px-6 pb-2">
      <div
        className="flex items-center gap-3 px-4 py-2.5 rounded-full"
        style={{
          background: 'linear-gradient(135deg, rgba(20,20,20,0.9) 0%, rgba(10,10,10,0.95) 100%)',
          border: '1px solid rgba(255,215,0,0.2)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}
      >
        {/* Level badge */}
        <div
          className="px-2.5 py-1 rounded-full text-xs font-bold"
          style={{
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            color: '#000'
          }}
        >
          {level}
        </div>

        {/* XP bar — тонкий */}
        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${xpPercent}%`,
              background: 'linear-gradient(90deg, #FFD700, #FFA500)',
              boxShadow: '0 0 8px rgba(255,215,0,0.5)'
            }}
          />
        </div>

        {/* Energy */}
        <div className="flex items-center gap-1.5">
          <img src="/icons/energi2.png" className="w-4 h-4" alt="" />
          <span className="text-sm font-semibold text-white">{energy}</span>
        </div>
      </div>
    </div>
  )
}
