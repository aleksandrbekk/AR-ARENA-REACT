import { Zap } from 'lucide-react'

interface StatusBarProps {
  energy: number
  energyMax: number
}

export function StatusBar({ energy, energyMax }: StatusBarProps) {
  return (
    <div className="px-4 pb-6 flex justify-center">
      <div className="flex items-center gap-2 px-4 py-1.5 bg-black/20 backdrop-blur-md border border-white/5 rounded-full shadow-lg">
        <Zap className="w-4 h-4 text-yellow-400" fill="currentColor" />
        <span className="text-sm font-bold text-white">
          {energy} <span className="text-white/30">/ {energyMax}</span>
        </span>
      </div>
    </div>
  )
}
