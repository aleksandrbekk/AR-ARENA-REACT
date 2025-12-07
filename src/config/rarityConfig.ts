export type RarityType = 'default' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface RarityStyle {
  border: string;       // Цвет рамки
  glow: string;         // Цвет свечения (shadow)
  text: string;         // Цвет текста названия
  gradient: string;     // Градиент фона (для активного)
  buttonGradient: string; // Градиент кнопки покупки
  auraColor: string;    // Цвет ауры за персонажем
  auraGlow: string;     // Мощное свечение ауры
}

export const RARITY_CONFIG: Record<RarityType, RarityStyle> = {
  legendary: {
    border: 'border-yellow-400',
    glow: 'shadow-[0_0_40px_rgba(250,204,21,0.8),0_0_80px_rgba(251,191,36,0.4)]', // МОЩНОЕ золотое свечение
    text: 'text-yellow-300',
    gradient: 'from-yellow-500/30 via-amber-500/20 to-orange-600/10',
    buttonGradient: 'bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-600 shadow-[0_0_30px_rgba(251,191,36,0.6),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(251,191,36,0.8)]',
    auraColor: 'radial-gradient(circle, rgba(250,204,21,0.6) 0%, rgba(251,191,36,0.4) 30%, rgba(245,158,11,0.2) 60%, transparent 100%)',
    auraGlow: 'blur-[100px]',
  },
  epic: {
    border: 'border-purple-400',
    glow: 'shadow-[0_0_40px_rgba(192,132,252,0.8),0_0_80px_rgba(168,85,247,0.4)]', // МОЩНОЕ фиолетовое свечение
    text: 'text-purple-300',
    gradient: 'from-purple-500/30 via-fuchsia-500/20 to-pink-600/10',
    buttonGradient: 'bg-gradient-to-br from-purple-400 via-fuchsia-500 to-pink-600 shadow-[0_0_30px_rgba(168,85,247,0.6),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(168,85,247,0.8)]',
    auraColor: 'radial-gradient(circle, rgba(192,132,252,0.6) 0%, rgba(168,85,247,0.4) 30%, rgba(147,51,234,0.2) 60%, transparent 100%)',
    auraGlow: 'blur-[100px]',
  },
  rare: {
    border: 'border-blue-400',
    glow: 'shadow-[0_0_40px_rgba(96,165,250,0.8),0_0_80px_rgba(59,130,246,0.4)]', // МОЩНОЕ синее свечение
    text: 'text-blue-300',
    gradient: 'from-blue-500/30 via-cyan-500/20 to-sky-600/10',
    buttonGradient: 'bg-gradient-to-br from-blue-400 via-cyan-500 to-sky-600 shadow-[0_0_30px_rgba(59,130,246,0.6),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(59,130,246,0.8)]',
    auraColor: 'radial-gradient(circle, rgba(96,165,250,0.6) 0%, rgba(59,130,246,0.4) 30%, rgba(37,99,235,0.2) 60%, transparent 100%)',
    auraGlow: 'blur-[100px]',
  },
  uncommon: {
    border: 'border-green-400',
    glow: 'shadow-[0_0_40px_rgba(74,222,128,0.8),0_0_80px_rgba(34,197,94,0.4)]', // МОЩНОЕ зелёное свечение
    text: 'text-green-300',
    gradient: 'from-green-500/30 via-emerald-500/20 to-teal-600/10',
    buttonGradient: 'bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 shadow-[0_0_30px_rgba(34,197,94,0.6),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(34,197,94,0.8)]',
    auraColor: 'radial-gradient(circle, rgba(74,222,128,0.6) 0%, rgba(34,197,94,0.4) 30%, rgba(22,163,74,0.2) 60%, transparent 100%)',
    auraGlow: 'blur-[100px]',
  },
  common: {
    border: 'border-gray-500',
    glow: 'shadow-[0_0_20px_rgba(156,163,175,0.3)]',
    text: 'text-gray-300',
    gradient: 'from-gray-500/20 via-slate-500/10 to-transparent',
    buttonGradient: 'bg-gradient-to-br from-gray-500 to-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]',
    auraColor: 'radial-gradient(circle, rgba(156,163,175,0.3) 0%, rgba(107,114,128,0.2) 50%, transparent 100%)',
    auraGlow: 'blur-[60px]',
  },
  default: {
    border: 'border-gray-600',
    glow: 'shadow-none',
    text: 'text-gray-400',
    gradient: 'bg-white/5',
    buttonGradient: 'bg-gray-700',
    auraColor: 'rgba(128, 128, 128, 0.2)',
    auraGlow: 'blur-[40px]',
  }
};
