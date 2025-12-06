export type RarityType = 'default' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface RarityStyle {
  border: string;       // Цвет рамки
  glow: string;         // Цвет свечения (shadow)
  text: string;         // Цвет текста названия
  gradient: string;     // Градиент фона (для активного)
  buttonGradient: string; // Градиент кнопки покупки
  auraColor: string;    // Цвет ауры за персонажем
}

export const RARITY_CONFIG: Record<RarityType, RarityStyle> = {
  legendary: {
    border: 'border-yellow-500',
    glow: 'shadow-[0_0_30px_-5px_rgba(234,179,8,0.6)]', // Золотое свечение
    text: 'text-yellow-400',
    gradient: 'from-yellow-500/20 via-orange-500/10 to-transparent',
    buttonGradient: 'bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600',
    auraColor: 'rgba(234, 179, 8, 0.3)',
  },
  epic: {
    border: 'border-purple-500',
    glow: 'shadow-[0_0_30px_-5px_rgba(168,85,247,0.6)]', // Фиолетовое свечение
    text: 'text-purple-400',
    gradient: 'from-purple-500/20 via-pink-500/10 to-transparent',
    buttonGradient: 'bg-gradient-to-r from-purple-500 via-pink-600 to-purple-700',
    auraColor: 'rgba(168, 85, 247, 0.3)',
  },
  rare: {
    border: 'border-blue-500',
    glow: 'shadow-[0_0_30px_-5px_rgba(59,130,246,0.6)]', // Синее свечение
    text: 'text-blue-400',
    gradient: 'from-blue-500/20 via-cyan-500/10 to-transparent',
    buttonGradient: 'bg-gradient-to-r from-blue-500 via-cyan-600 to-blue-700',
    auraColor: 'rgba(59, 130, 246, 0.3)',
  },
  uncommon: {
    border: 'border-green-500',
    glow: 'shadow-[0_0_30px_-5px_rgba(74,222,128,0.6)]', // Зелёное свечение
    text: 'text-green-400',
    gradient: 'from-green-500/20 via-emerald-500/10 to-transparent',
    buttonGradient: 'bg-gradient-to-r from-green-500 via-emerald-600 to-green-700',
    auraColor: 'rgba(74, 222, 128, 0.3)',
  },
  common: {
    border: 'border-gray-600',
    glow: 'shadow-none',
    text: 'text-gray-400',
    gradient: 'bg-white/5',
    buttonGradient: 'bg-gray-700',
    auraColor: 'rgba(128, 128, 128, 0.2)',
  },
  default: {
    border: 'border-gray-600',
    glow: 'shadow-none',
    text: 'text-gray-400',
    gradient: 'bg-white/5',
    buttonGradient: 'bg-gray-700',
    auraColor: 'rgba(128, 128, 128, 0.2)',
  }
};
