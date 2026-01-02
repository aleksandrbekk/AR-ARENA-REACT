import { useState } from 'react'

interface ChestProps {
    index: number
    isLocked: boolean
    isGolden: boolean
    isOpened: boolean
    onOpen: (index: number) => void
    disabled?: boolean
}

export function Chest({ index, isLocked, isGolden, isOpened, onOpen, disabled }: ChestProps) {
    const [isHovered, setIsHovered] = useState(false)
    const [isOpening, setIsOpening] = useState(false)

    const handleClick = async () => {
        if (isLocked || isOpened || disabled) return

        setIsOpening(true)

        // Haptic feedback
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy')

        // Небольшая задержка для анимации
        await new Promise(resolve => setTimeout(resolve, 500))

        onOpen(index)
    }

    return (
        <div
            className={`
        relative cursor-pointer transition-all duration-300 transform
        ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}
        ${isHovered && !isLocked && !isOpened ? 'scale-110' : ''}
        ${isOpening ? 'animate-shake' : ''}
        ${isGolden && !isLocked && !isOpened ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-[#0a0a0a]' : ''}
      `}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Свечение для активных сундуков */}
            {!isLocked && !isOpened && (
                <div
                    className={`
            absolute inset-0 rounded-xl blur-xl -z-10
            ${isGolden
                            ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 animate-pulse'
                            : 'bg-yellow-500/30'
                        }
          `}
                />
            )}

            {/* Изображение сундука */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                <img
                    src={isOpened ? '/icons/keisopen.png' : '/icons/keis1.png'}
                    alt="Сундук"
                    className={`
            w-full h-full object-contain transition-all duration-300
            ${!isLocked && !isOpened && isHovered ? 'filter drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]' : ''}
          `}
                />

                {/* Golden chest badge */}
                {isGolden && !isLocked && !isOpened && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-xs">⭐</span>
                    </div>
                )}

                {/* Номер сундука */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs text-white/40">
                    {index + 1}
                </div>
            </div>

            {/* Контейнер для анимации монет */}
            <div className="absolute inset-0 pointer-events-none overflow-visible" id={`coins-${index}`} />
        </div>
    )
}

interface ChestsGridProps {
    canOpen: boolean
    goldenChestIndex: number | null
    openedChestIndex: number | null
    onOpen: (index: number) => void
    disabled?: boolean
}

export function ChestsGrid({ canOpen, goldenChestIndex, openedChestIndex, onOpen, disabled }: ChestsGridProps) {
    return (
        <div className="grid grid-cols-5 gap-3 sm:gap-4 px-4 py-6">
            {[0, 1, 2, 3, 4].map((index) => (
                <Chest
                    key={index}
                    index={index}
                    isLocked={!canOpen}
                    isGolden={goldenChestIndex === index}
                    isOpened={openedChestIndex === index}
                    onOpen={onOpen}
                    disabled={disabled}
                />
            ))}
        </div>
    )
}
