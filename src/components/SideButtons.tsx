import { Gift } from 'lucide-react'

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
}

export function SideButtons({
  onFriendsClick,
  onTasksClick,
  onSkinsClick,
  onFarmClick,
  onGiveawaysClick,
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
      icon: Gift,
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
            <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg transition-transform group-active:scale-90">
              {typeof button.icon === 'string' ? (
                <img
                  src={button.icon}
                  alt={button.label}
                  className="w-6 h-6 object-contain drop-shadow-md"
                />
              ) : (
                <button.icon className="w-6 h-6 text-[#FFD700] drop-shadow-md" />
              )}
            </div>
            <span className="text-[10px] font-bold text-white/80 drop-shadow-md">{button.label}</span>
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
            <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg transition-transform group-active:scale-90">
              {typeof button.icon === 'string' ? (
                <img
                  src={button.icon}
                  alt={button.label}
                  className="w-6 h-6 object-contain drop-shadow-md"
                />
              ) : (
                <button.icon className="w-6 h-6 text-[#FFD700] drop-shadow-md" />
              )}
            </div>
            <span className="text-[10px] font-bold text-white/80 drop-shadow-md">{button.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
