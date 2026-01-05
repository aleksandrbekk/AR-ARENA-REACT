import { Zap, Pickaxe, Battery } from 'lucide-react'
import type { Skin } from '../types'

interface StatusBarProps {
  energy: number
  energyMax: number
  tapPower?: number // Базовая сила тапа из gameState
  activeSkin?: Skin | null
}

export function StatusBar({ energy, energyMax, tapPower = 1, activeSkin }: StatusBarProps) {
  // Calculate total tap power: tap_power + skin bonus (как в SQL: tap_power + tap_bonus)
  const totalTap = tapPower + (activeSkin?.tap_bonus || 0)

  return (
    <div className="px-4 pb-6 flex justify-center">
      {/* Unified Stats Panel - Compact */}
      <div className="flex items-center gap-4 px-4 py-2 rounded-full bg-black/20 backdrop-blur-sm border border-white/5">
        {/* Energy */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5">
            <Battery className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-bold text-white">
              {energy}<span className="text-white/40 text-[10px]">/{energyMax}</span>
            </span>
          </div>
          <span className="text-[8px] text-white/40 uppercase tracking-wider">Энергия</span>
        </div>

        <div className="w-px h-8 bg-white/10" />

        {/* Tap Power (total) */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" />
            <span className="text-xs font-bold text-white">
              +{totalTap}
            </span>
          </div>
          <span className="text-[8px] text-white/40 uppercase tracking-wider">Тап</span>
        </div>

        <div className="w-px h-8 bg-white/10" />

        {/* Farm Bonus */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5">
            <Pickaxe className={`w-3.5 h-3.5 ${activeSkin?.farm_bonus ? "text-green-400" : "text-white/20"}`} />
            <span className={`text-xs font-bold ${activeSkin?.farm_bonus ? "text-white" : "text-white/30"}`}>
              +{activeSkin?.farm_bonus || 0}
            </span>
          </div>
          <span className="text-[8px] text-white/40 uppercase tracking-wider">Ферма</span>
        </div>

        <div className="w-px h-8 bg-white/10" />

        {/* Regen Bonus */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5">
            <Battery className={`w-3.5 h-3.5 ${activeSkin?.regen_bonus ? "text-blue-400" : "text-white/20"}`} />
            <span className={`text-xs font-bold ${activeSkin?.regen_bonus ? "text-white" : "text-white/30"}`}>
              +{activeSkin?.regen_bonus || 0}
            </span>
          </div>
          <span className="text-[8px] text-white/40 uppercase tracking-wider">Реген</span>
        </div>
      </div>
    </div>
  )
}
