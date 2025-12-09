import type { Skin } from '../types'
import { MousePointerClick, Battery, Pickaxe } from 'lucide-react'

interface SkinBonusesProps {
  activeSkin: Skin | null
}

export function SkinBonuses({ activeSkin }: SkinBonusesProps) {
  if (!activeSkin) return null

  const hasBonuses = activeSkin.tap_bonus > 0 || activeSkin.regen_bonus > 0 || activeSkin.farm_bonus > 0

  if (!hasBonuses) return null

  return (
    <div className="flex justify-center gap-3 py-2">
      {/* Tap Bonus */}
      {activeSkin.tap_bonus > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-black/20 backdrop-blur-md rounded-full border border-white/5">
          <MousePointerClick className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-xs font-bold text-white">+{activeSkin.tap_bonus}</span>
        </div>
      )}

      {/* Farm Bonus */}
      {activeSkin.farm_bonus > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-black/20 backdrop-blur-md rounded-full border border-white/5">
          <Pickaxe className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs font-bold text-white">+{activeSkin.farm_bonus}</span>
        </div>
      )}

      {/* Regen Bonus */}
      {activeSkin.regen_bonus > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-black/20 backdrop-blur-md rounded-full border border-white/5">
          <Battery className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-bold text-white">+{activeSkin.regen_bonus}</span>
        </div>
      )}
    </div>
  )
}
