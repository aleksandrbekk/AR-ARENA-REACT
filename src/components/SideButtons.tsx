interface ButtonConfig {
  icon: string
  label: string
  onClick: () => void
}

interface SideButtonsProps {
  onFriendsClick?: () => void
  onTasksClick?: () => void
  onBoostsClick?: () => void
  onSkinsClick?: () => void
  onFarmClick?: () => void
}

export function SideButtons({
  onFriendsClick,
  onTasksClick,
  onBoostsClick,
  onSkinsClick,
  onFarmClick,
}: SideButtonsProps) {
  // Левая колонка
  const leftButtons: ButtonConfig[] = [
    {
      icon: '/icons/PARTNERS.png',
      label: 'Друзья',
      onClick: onFriendsClick || (() => console.log('Friends clicked')),
    },
    {
      icon: '/icons/tasks-old.png',
      label: 'Задания',
      onClick: onTasksClick || (() => console.log('Tasks clicked')),
    },
  ]

  // Правая колонка
  const rightButtons: ButtonConfig[] = [
    {
      icon: '/icons/boosts.png',
      label: 'Бусты',
      onClick: onBoostsClick || (() => console.log('Boosts clicked')),
    },
    {
      icon: '/icons/SKIN2.png',
      label: 'Скины',
      onClick: onSkinsClick || (() => console.log('Skins clicked')),
    },
    {
      icon: '/icons/FERMA.png',
      label: 'Ферма',
      onClick: onFarmClick || (() => console.log('Farm clicked')),
    },
  ]

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {/* Левая колонка */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 pointer-events-auto">
        {leftButtons.map((button) => (
          <button
            key={button.label}
            onClick={button.onClick}
            className="flex flex-col items-center gap-1 transition-transform active:scale-90"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <img
              src={button.icon}
              alt={button.label}
              className="w-10 h-10 object-contain drop-shadow-lg"
            />
            <span className="text-xs text-white/70">{button.label}</span>
          </button>
        ))}
      </div>

      {/* Правая колонка */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 pointer-events-auto">
        {rightButtons.map((button) => (
          <button
            key={button.label}
            onClick={button.onClick}
            className="flex flex-col items-center gap-1 transition-transform active:scale-90"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <img
              src={button.icon}
              alt={button.label}
              className="w-10 h-10 object-contain drop-shadow-lg"
            />
            <span className="text-xs text-white/70">{button.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
