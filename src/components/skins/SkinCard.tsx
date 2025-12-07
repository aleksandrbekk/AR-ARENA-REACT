import { RARITY_CONFIG, type RarityType } from '../../config/rarityConfig';
import type { Skin } from '../../types';
import { CurrencyIcon } from '../CurrencyIcon';

interface SkinCardProps {
  skin: Skin;
  isActive: boolean;
  isOwned: boolean;
  isEquipped: boolean;
  onClick: () => void;
}

export function SkinCard({ skin, isActive, isOwned, isEquipped, onClick }: SkinCardProps) {
  const styles = RARITY_CONFIG[skin.rarity as RarityType] || RARITY_CONFIG.default;

  return (
    <button
      onClick={onClick}
      className={`
        relative rounded-2xl p-3 transition-all duration-300 cursor-pointer
        bg-black/40 backdrop-blur-md border-2
        ${isActive ? styles.border : 'border-transparent hover:border-white/10'}
        ${isActive ? styles.glow : ''}
        ${!isOwned ? 'opacity-50' : ''}
      `}
    >
      {/* Градиентный фон для активной карточки */}
      {isActive && (
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${styles.gradient} -z-10`} />
      )}

      {/* Изображение скина */}
      <div className="aspect-square relative mb-2">
        <img
          src={`/icons/skins/${skin.file}`}
          alt={skin.name}
          className="w-full h-full object-contain"
        />

        {/* Индикатор экипировки */}
        {isEquipped && (
          <div className="absolute top-1 right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-black"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Название скина с цветом по редкости */}
      <h3 className={`text-sm font-bold mb-1 ${styles.text} truncate`}>
        {skin.name}
      </h3>

      {/* Цена с иконкой валюты */}
      {!isOwned && (
        <div className="flex items-center justify-center gap-1 text-xs text-white/70">
          <CurrencyIcon type="BUL" className="w-4 h-4" />
          <span>{skin.price_bul.toLocaleString()}</span>
        </div>
      )}

      {/* Бонусы для купленных скинов */}
      {isOwned && (
        <div className="flex items-center justify-center gap-2 text-xs text-white/50">
          <span>+{skin.tap_bonus}</span>
          <span>•</span>
          <span>+{skin.farm_bonus}</span>
        </div>
      )}
    </button>
  );
}
