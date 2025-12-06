import type { Skin } from '../types'

interface SkinBonusesProps {
  activeSkin: Skin | null
}

export function SkinBonuses({ activeSkin }: SkinBonusesProps) {
  if (!activeSkin) return null

  const hasBonuses = activeSkin.tap_bonus > 0 || activeSkin.regen_bonus > 0 || activeSkin.farm_bonus > 0

  if (!hasBonuses) return null

  return (
    <div className="px-4 pb-2">
      <div
        className="px-4 py-2 rounded-xl flex items-center justify-center gap-4"
        style={{
          background: 'linear-gradient(135deg, rgba(20,20,20,0.9) 0%, rgba(10,10,10,0.95) 100%)',
          border: '1px solid rgba(255,215,0,0.2)'
        }}
      >
        {/* Tap Bonus */}
        {activeSkin.tap_bonus > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-white/50">Tap:</span>
            <span className="text-sm font-bold" style={{ color: '#FFD700' }}>
              +{activeSkin.tap_bonus}
            </span>
          </div>
        )}

        {/* Regen Bonus */}
        {activeSkin.regen_bonus > 0 && (
          <div className="flex items-center gap-1">
            <img src="/icons/energi2.png" className="w-4 h-4" alt="" />
            <span className="text-sm font-bold" style={{ color: '#FFD700' }}>
              +{activeSkin.regen_bonus}%
            </span>
          </div>
        )}

        {/* Farm Bonus */}
        {activeSkin.farm_bonus > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-base">FARM</span>
            <span className="text-sm font-bold" style={{ color: '#FFD700' }}>
              +{activeSkin.farm_bonus}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
