export type RarityType = 'default' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface RarityStyle {
  border: string;       // Цвет рамки
  glow: string;         // Цвет свечения (shadow)
  text: string;         // Цвет текста названия
  gradient: string;     // Градиент фона (для активного)
  buttonGradient: string; // Градиент кнопки покупки
  auraColor: string;    // Tailwind bg-класс для ауры за персонажем
  auraGlow: string;     // Мощное свечение ауры (blur)
}

export const RARITY_CONFIG: Record<RarityType, RarityStyle> = {
  legendary: {
    border: 'border-yellow-400',
    glow: 'shadow-[0_0_40px_rgba(250,204,21,0.8),0_0_80px_rgba(251,191,36,0.4)]',
    text: 'text-yellow-300',
    gradient: 'from-yellow-500/30 via-amber-500/20 to-orange-600/10',
    buttonGradient: 'bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-600 shadow-[0_0_30px_rgba(251,191,36,0.6),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(251,191,36,0.8)] border-t border-white/20',
    auraColor: 'bg-yellow-500',
    auraGlow: 'blur-[60px]',
  },
  epic: {
    border: 'border-purple-400',
    glow: 'shadow-[0_0_40px_rgba(192,132,252,0.8),0_0_80px_rgba(168,85,247,0.4)]',
    text: 'text-purple-300',
    gradient: 'from-purple-500/30 via-fuchsia-500/20 to-pink-600/10',
    buttonGradient: 'bg-gradient-to-br from-purple-400 via-fuchsia-500 to-pink-600 shadow-[0_0_30px_rgba(168,85,247,0.6),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(168,85,247,0.8)] border-t border-white/20',
    auraColor: 'bg-purple-500',
    auraGlow: 'blur-[60px]',
  },
  rare: {
    border: 'border-blue-400',
    glow: 'shadow-[0_0_40px_rgba(96,165,250,0.8),0_0_80px_rgba(59,130,246,0.4)]',
    text: 'text-blue-300',
    gradient: 'from-blue-500/30 via-cyan-500/20 to-sky-600/10',
    buttonGradient: 'bg-gradient-to-br from-blue-400 via-cyan-500 to-sky-600 shadow-[0_0_30px_rgba(59,130,246,0.6),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(59,130,246,0.8)] border-t border-white/20',
    auraColor: 'bg-blue-500',
    auraGlow: 'blur-[60px]',
  },
  uncommon: {
    border: 'border-green-400',
    glow: 'shadow-[0_0_40px_rgba(74,222,128,0.8),0_0_80px_rgba(34,197,94,0.4)]',
    text: 'text-green-300',
    gradient: 'from-green-500/30 via-emerald-500/20 to-teal-600/10',
    buttonGradient: 'bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 shadow-[0_0_30px_rgba(34,197,94,0.6),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(34,197,94,0.8)] border-t border-white/20',
    auraColor: 'bg-green-500',
    auraGlow: 'blur-[60px]',
  },
  common: {
    border: 'border-gray-500',
    glow: 'shadow-[0_0_20px_rgba(156,163,175,0.3)]',
    text: 'text-gray-300',
    gradient: 'from-gray-500/20 via-slate-500/10 to-transparent',
    buttonGradient: 'bg-gradient-to-br from-gray-500 to-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] border-t border-white/20',
    auraColor: 'bg-gray-500',
    auraGlow: 'blur-[40px]',
  },
  default: {
    border: 'border-gray-600',
    glow: 'shadow-none',
    text: 'text-gray-400',
    gradient: 'bg-white/5',
    buttonGradient: 'bg-gray-700 border-t border-white/20',
    auraColor: 'bg-gray-600',
    auraGlow: 'blur-[40px]',
  }
};
