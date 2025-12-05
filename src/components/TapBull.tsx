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
  const [isGlowing, setIsGlowing] = useState(false)

  const handleTapAnimation = () => {
    setIsTapped(true)
    setIsGlowing(true)
    setTimeout(() => setIsTapped(false), 100)
    setTimeout(() => setIsGlowing(false), 300)
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
            ${isTapped ? 'scale-95' : 'scale-100'}
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

        {/* Glow ПОД ногами с динамической яркостью */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-16 rounded-full pointer-events-none transition-all duration-300"
          style={{
            background: `radial-gradient(ellipse, rgba(255,215,0,${isGlowing ? 0.7 : 0.3}) 0%, rgba(255,165,0,${isGlowing ? 0.4 : 0.15}) 40%, transparent 70%)`,
            filter: `blur(${isGlowing ? '15px' : '12px'})`,
            transform: `scale(${isGlowing ? 1.2 : 1})`
          }}
        />
      </div>

      {/* Боковые кнопки */}
      {children}
    </div>
  )
}
