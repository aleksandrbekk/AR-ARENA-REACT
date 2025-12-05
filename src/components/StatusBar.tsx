interface StatusBarProps {
  level: number
  xp: number
  xpToNext: number
  energy: number
  energyMax: number
}

export function StatusBar({ level, xp, xpToNext, energy, energyMax }: StatusBarProps) {
  const xpPercent = Math.min((xp / xpToNext) * 100, 100)

  return (
    <div className="px-4 pb-2 flex gap-2">

      {/* Плашка 1: Level + XP */}
      <div
        className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(20,20,20,0.9) 0%, rgba(10,10,10,0.95) 100%)',
          border: '1px solid rgba(255,215,0,0.2)'
        }}
      >
        <div
          className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold"
          style={{
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            color: '#000'
          }}
        >
          {level}
        </div>
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${xpPercent}%`,
              background: 'linear-gradient(90deg, #FFD700, #FFA500)'
            }}
          />
        </div>
        <span className="text-xs text-white/50">{xp}/{xpToNext}</span>
      </div>

      {/* Плашка 2: Energy — ТАКАЯ ЖЕ высота */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(20,20,20,0.9) 0%, rgba(10,10,10,0.95) 100%)',
          border: '1px solid rgba(255,215,0,0.2)'
        }}
      >
        <img src="/icons/energi2.png" className="w-5 h-5" alt="" />
        <span className="text-sm font-bold text-white">{energy}/{energyMax}</span>
      </div>

    </div>
  )
}
