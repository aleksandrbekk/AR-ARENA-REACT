import { motion } from 'framer-motion';
import { RARITY_CONFIG, type RarityType } from '../../config/rarityConfig';
import type { Skin } from '../../types';
import { CurrencyIcon } from '../CurrencyIcon';
import { Check, Lock, Zap, Pickaxe, Battery } from 'lucide-react';

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
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={`
        relative rounded-xl overflow-hidden aspect-[3/4] flex flex-col
        transition-all duration-300 group
        ${isActive
          ? `ring-2 ring-offset-2 ring-offset-black ${styles.border} shadow-lg`
          : 'border border-white/5 hover:border-white/20 bg-white/5'
        }
      `}
    >
      {/* Background Gradient */}
      <div className={`absolute inset-0 opacity-20 bg-gradient-to-b ${styles.gradient}`} />

      {/* Locked Overlay */}
      {!isOwned && (
        <div className="absolute inset-0 bg-black/50 z-20" />
      )}

      {/* Top Status Icons - ABSOLUTE */}
      <div className="absolute top-2 right-2 z-30 flex gap-1">
        {isEquipped && (
          <div className="bg-green-500/20 p-1 rounded-full backdrop-blur-sm">
            <Check className="w-3 h-3 text-green-400" />
          </div>
        )}
        {!isOwned && (
          <div className="bg-black/40 p-1 rounded-full backdrop-blur-sm">
            <Lock className="w-3 h-3 text-white/40" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-end w-full h-full">

        {/* Image - полный рост персонажа */}
        <div className="absolute inset-0 w-full h-full flex items-end justify-center pt-6 pb-14">
          <img
            src={`/icons/skins/${skin.file}`}
            alt={skin.name}
            className={`
              h-full w-auto object-contain object-bottom
              ${isActive ? 'drop-shadow-lg' : ''}
            `}
          />
        </div>

        {/* Bottom Info */}
        <div className="relative z-20 w-full flex flex-col items-center gap-0.5 pb-2 bg-gradient-to-t from-black/60 via-black/40 to-transparent pt-8">
          <span className={`text-[10px] font-bold uppercase tracking-wider truncate max-w-full ${isActive ? 'text-white' : 'text-white/60'}`}>
            {skin.name}
          </span>

          {/* Stats Row (Centered & Clean) */}
          {isOwned ? (
            <div className="flex items-center justify-center gap-1.5 opacity-90">
              {skin.tap_bonus > 0 && (
                <div className="flex items-center gap-0.5">
                  <Zap className="w-2.5 h-2.5 text-yellow-400" fill="currentColor" />
                  <span className="text-[9px] font-bold text-white">+{skin.tap_bonus}</span>
                </div>
              )}
              {skin.farm_bonus > 0 && (
                <div className="flex items-center gap-0.5">
                  <Pickaxe className="w-2.5 h-2.5 text-green-400" />
                  <span className="text-[9px] font-bold text-white">+{skin.farm_bonus}</span>
                </div>
              )}
               {skin.regen_bonus > 0 && (
                <div className="flex items-center gap-0.5">
                  <Battery className="w-2.5 h-2.5 text-blue-400" />
                  <span className="text-[9px] font-bold text-white">+{skin.regen_bonus}</span>
                </div>
              )}
              {skin.tap_bonus === 0 && skin.farm_bonus === 0 && skin.regen_bonus === 0 && (
                 <span className="text-[8px] text-white/30">Cosmetic</span>
              )}
            </div>
          ) : (
            /* Price for unowned */
            <div className="flex items-center justify-center gap-1 bg-black/40 px-2 py-0.5 rounded-full">
               <CurrencyIcon type={skin.skin_type === 'ar' ? 'AR' : 'BUL'} className="w-2.5 h-2.5" />
               <span className="text-[9px] font-bold text-white">
                 {skin.skin_type === 'ar' ? skin.price_ar : skin.price_bul}
               </span>
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}
