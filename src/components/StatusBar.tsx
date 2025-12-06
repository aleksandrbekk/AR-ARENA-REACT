interface StatusBarProps {
  energy: number
  energyMax: number
}

export function StatusBar({ energy, energyMax }: StatusBarProps) {
  return (
    <div className="px-4 pb-2 flex justify-center">
      {/* Energy Bar */}
      <div
        className="flex items-center gap-2 px-4 h-12 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(20,20,20,0.9) 0%, rgba(10,10,10,0.95) 100%)',
          border: '1px solid rgba(255,215,0,0.2)'
        }}
      >
        <img src="/icons/energi2.png" className="w-6 h-6" alt="" />
        <span className="text-base font-bold text-white">
          {energy} <span className="text-white/40">/ {energyMax}</span>
        </span>
      </div>
    </div>
  )
}
