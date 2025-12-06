import type { Skin, SkinRarity } from '../types'

const RARITY_GRADIENTS: Record<SkinRarity, string> = {
  common: 'from-gray-400 to-gray-600',           // Серый
  uncommon: 'from-green-400 to-green-600',       // Зелёный
  rare: 'from-blue-400 to-blue-600',             // Синий
  epic: 'from-purple-400 to-purple-600',         // Фиолетовый
  legendary: 'from-yellow-400 to-orange-500'     // Золотой
}

const RARITY_NAMES: Record<SkinRarity, string> = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный'
}

interface SkinCardProps {
  skin: Skin
  isOwned: boolean
  isEquipped: boolean
  userLevel: number
  userBul: number
  onBuy: (skinId: number) => void
  onEquip: (skinId: number) => void
}

export function SkinCard({
  skin,
  isOwned,
  isEquipped,
  userLevel,
  userBul,
  onBuy,
  onEquip
}: SkinCardProps) {

  const cantAfford = !isOwned && userBul < skin.price_bul
  const levelLocked = !isOwned && userLevel < skin.level_req

  return (
    <div className={`
      relative rounded-2xl p-[2px]
      bg-gradient-to-br ${RARITY_GRADIENTS[skin.rarity]}
    `}>
      {/* Внутренняя карточка */}
      <div className="bg-[#1a1a1a] rounded-2xl p-3 h-full">

        {/* Статус бейдж */}
        {isEquipped && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
            ✓ Активен
          </div>
        )}

        {/* Изображение скина */}
        <div className="aspect-square mb-2 flex items-center justify-center">
          <img
            src={`/icons/skins/${skin.file}`}
            alt={skin.name}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Название и редкость */}
        <h3 className="text-white font-bold text-sm truncate">{skin.name}</h3>
        <p className={`text-xs bg-gradient-to-r ${RARITY_GRADIENTS[skin.rarity]} bg-clip-text text-transparent`}>
          {RARITY_NAMES[skin.rarity]}
        </p>

        {/* Бонусы */}
        <div className="mt-2 space-y-1 text-xs text-gray-400">
          {skin.tap_bonus > 0 && (
            <div className="flex items-center gap-1">
              <span>Tap:</span>
              <span className="text-[#FFD700]">+{skin.tap_bonus}</span>
            </div>
          )}
          {skin.regen_bonus > 0 && (
            <div className="flex items-center gap-1">
              <span>Regen:</span>
              <span className="text-[#FFD700]">+{skin.regen_bonus}%</span>
            </div>
          )}
          {skin.farm_bonus > 0 && (
            <div className="flex items-center gap-1">
              <span>Farm:</span>
              <span className="text-[#FFD700]">+{skin.farm_bonus}%</span>
            </div>
          )}
        </div>

        {/* Кнопка действия */}
        <div className="mt-3">
          {isEquipped ? (
            <button
              disabled
              className="w-full py-2 rounded-xl bg-green-500/20 text-green-400 text-sm"
            >
              Активен
            </button>
          ) : isOwned ? (
            <button
              onClick={() => onEquip(skin.id)}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black font-bold text-sm"
            >
              Надеть
            </button>
          ) : levelLocked ? (
            <button
              disabled
              className="w-full py-2 rounded-xl bg-gray-700 text-gray-400 text-sm"
            >
              🔒 Уровень {skin.level_req}
            </button>
          ) : (
            <button
              onClick={() => onBuy(skin.id)}
              disabled={cantAfford}
              className={`w-full py-2 rounded-xl text-sm font-bold ${
                cantAfford
                  ? 'bg-gray-700 text-gray-400'
                  : 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black'
              }`}
            >
              {cantAfford ? `Нужно ${skin.price_bul} BUL` : `${skin.price_bul} BUL`}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
