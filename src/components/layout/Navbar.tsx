import { Home, User, Shield, Crown, Gift } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTasks } from '../../hooks/useTasks'

const ADMIN_IDS = [190202791, 144828618, 288542643, 288475216]

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { telegramUser } = useAuth()
  const { pendingTasksCount } = useTasks()

  const isAdmin = telegramUser?.id ? ADMIN_IDS.includes(telegramUser.id) : false

  const baseNavItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Gift, label: 'Tasks', path: '/tasks', badge: pendingTasksCount },
    { icon: Crown, label: 'Premium', path: '/pricing' },
    { icon: User, label: 'Profile', path: '/profile' },
  ]

  const navItems = isAdmin
    ? [...baseNavItems, { icon: Shield, label: 'Admin', path: '/admin' }]
    : baseNavItems

  return (
    <nav className="fixed bottom-6 left-6 right-6 z-50">
      <div className="flex justify-between items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 shadow-2xl">
        {navItems.map(({ icon: Icon, label, path, badge }) => {
          const isActive = location.pathname === path
          return (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="relative flex flex-col items-center justify-center w-10 h-10 transition-all active:scale-90"
            >
              <div className={`absolute inset-0 bg-yellow-500/20 blur-lg rounded-full transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`} />

              <Icon
                size={24}
                className={`relative z-10 transition-all duration-300 ${isActive
                  ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                  : 'text-white/40 hover:text-white/60'
                  }`}
                strokeWidth={isActive ? 2.5 : 2}
              />

              {/* Badge for pending tasks */}
              {badge && badge > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center px-1">
                  <span className="text-[10px] font-bold text-white">{badge > 9 ? '9+' : badge}</span>
                </div>
              )}

              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-yellow-400 rounded-full shadow-[0_0_5px_#FACC15]" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}


