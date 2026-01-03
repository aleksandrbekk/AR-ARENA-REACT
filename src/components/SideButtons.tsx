

interface ButtonConfig {
  icon: string | React.ElementType
  label: string
  onClick: () => void
}

interface SideButtonsProps {
  onFriendsClick?: () => void
  onTasksClick?: () => void
  onSkinsClick?: () => void
  onFarmClick?: () => void
  onGiveawaysClick?: () => void
  onDevTestClick?: () => void
}

export function SideButtons({
  onFriendsClick,
  onTasksClick,
  onSkinsClick,
  onFarmClick,
  onGiveawaysClick,
  onDevTestClick,
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
    // DEV TEST button (only shown if handler provided)
    ...(onDevTestClick ? [{
      icon: '🧪' as unknown as string,
      label: 'DEV',
      onClick: onDevTestClick,
    }] : []),
  ]

  // Правая колонка
  const rightButtons: ButtonConfig[] = [
    {
      icon: '/icons/GIVEAWAY.png',
      label: 'Розыгрыши',
      onClick: onGiveawaysClick || (() => console.log('Giveaways clicked')),
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
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-6 pointer-events-auto">
        {leftButtons.map((button) => (
          <button
            key={button.label}
            onClick={button.onClick}
            className="flex flex-col items-center gap-1 group"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg transition-transform group-active:scale-90">
              {typeof button.icon === 'string' && button.icon.startsWith('/') ? (
                <img
                  src={button.icon}
                  alt={button.label}
                  className="w-8 h-8 object-contain drop-shadow-md"
                />
              ) : typeof button.icon === 'string' ? (
                <span className="text-2xl">{button.icon}</span>
              ) : (
                <button.icon className="w-8 h-8 text-[#FFD700] drop-shadow-md" />
              )}
            </div>
            <span className="text-[11px] font-bold text-white drop-shadow-md tracking-wide">{button.label}</span>
          </button>
        ))}
      </div>

      {/* Правая колонка */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-6 pointer-events-auto">
        {rightButtons.map((button) => (
          <button
            key={button.label}
            onClick={button.onClick}
            className="flex flex-col items-center gap-1 group"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg transition-transform group-active:scale-90">
              {typeof button.icon === 'string' ? (
                <img
                  src={button.icon}
                  alt={button.label}
                  className="w-8 h-8 object-contain drop-shadow-md"
                />
              ) : (
                <button.icon className="w-8 h-8 text-[#FFD700] drop-shadow-md" />
              )}
            </div>
            <span className="text-[11px] font-bold text-white drop-shadow-md tracking-wide">{button.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
