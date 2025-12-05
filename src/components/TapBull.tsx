import { useState } from 'react'

interface TapBullProps {
  skinFile: string // например "Bull1.png" или "bull_boss.png"
  onTap: () => void
  children?: React.ReactNode
}

export function TapBull({ skinFile, onTap, children }: TapBullProps) {
  // Путь к скину - всегда в /icons/skins/
  const skinPath = `/icons/skins/${skinFile}`
  const fallbackPath = '/icons/skins/Bull1.png'

  // Состояние для анимации тапа
  const [isTapped, setIsTapped] = useState(false)

  const handleTapAnimation = () => {
    setIsTapped(true)
    setTimeout(() => setIsTapped(false), 100)
    onTap?.()
  }

  return (
    <div
      className="relative flex flex-col justify-center items-center flex-1"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Контейнер для быка с эффектами */}
      <div
        className="relative flex flex-col items-center cursor-pointer select-none"
        onClick={handleTapAnimation}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {/* Тень/объём СЗАДИ быка */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center 70%, rgba(0,0,0,0.6) 0%, transparent 50%)',
            transform: 'scale(1.2)',
          }}
        />

        {/* Бык */}
        <img
          src={skinPath}
          alt="Bull"
          loading="eager"
          className={`
            relative z-10 w-64 max-w-[70%]
            transition-transform duration-100 ease-out
            ${isTapped ? 'scale-90' : 'scale-100'}
          `}
          onError={(e) => {
            // Fallback на Bull1.png если картинка не загрузилась
            const target = e.target as HTMLImageElement
            if (target.src !== fallbackPath) {
              target.src = fallbackPath
            }
          }}
          draggable={false}
        />

        {/* Glow ПОД ногами — двигается вместе с быком */}
        <div
          className="-mt-6 w-36 h-10 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(255,215,0,0.5) 0%, rgba(255,165,0,0.3) 30%, transparent 70%)',
            filter: 'blur(12px)',
          }}
        />
      </div>

      {/* Боковые кнопки */}
      {children}
    </div>
  )
}
