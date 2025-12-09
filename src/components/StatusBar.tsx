import { Zap, Pickaxe, Battery } from 'lucide-react'
import type { Skin } from '../types'

interface StatusBarProps {
  energy: number
  energyMax: number
  activeSkin?: Skin | null
}

export function StatusBar({ energy, energyMax, activeSkin }: StatusBarProps) {
  return (
    <div className="px-4 pb-6 flex justify-center">
      {/* Unified Stats Panel - Like SkinsPage Podium */}
      <div className="flex items-center gap-6 px-6 py-3 rounded-full bg-black/20 backdrop-blur-sm border border-white/5">
        {/* Energy */}
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" fill="currentColor" />
          <span className="text-sm font-bold text-white">
            {energy}<span className="text-white/40 text-xs">/{energyMax}</span>
          </span>
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Tap Bonus */}
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${activeSkin?.tap_bonus ? "text-yellow-400" : "text-white/20"}`} fill={activeSkin?.tap_bonus ? "currentColor" : "none"} />
          <span className={`text-sm font-bold ${activeSkin?.tap_bonus ? "text-white" : "text-white/30"}`}>
            +{activeSkin?.tap_bonus || 0}
          </span>
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Farm Bonus */}
        <div className="flex items-center gap-2">
          <Pickaxe className={`w-4 h-4 ${activeSkin?.farm_bonus ? "text-green-400" : "text-white/20"}`} />
          <span className={`text-sm font-bold ${activeSkin?.farm_bonus ? "text-white" : "text-white/30"}`}>
            +{activeSkin?.farm_bonus || 0}
          </span>
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Regen Bonus */}
        <div className="flex items-center gap-2">
          <Battery className={`w-4 h-4 ${activeSkin?.regen_bonus ? "text-blue-400" : "text-white/20"}`} />
          <span className={`text-sm font-bold ${activeSkin?.regen_bonus ? "text-white" : "text-white/30"}`}>
            +{activeSkin?.regen_bonus || 0}
          </span>
        </div>
      </div>
    </div>
  )
}
