import { Home, ShoppingBag, User, Shield } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const ADMIN_ID = 190202791

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { telegramUser } = useAuth()

  // Debug: проверяем ID пользователя
  console.log('Navbar: telegramUser =', telegramUser, 'isAdmin =', telegramUser?.id === ADMIN_ID)

  const isAdmin = telegramUser?.id === ADMIN_ID

  const baseNavItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: ShoppingBag, label: 'Shop', path: '/shop' },
    { icon: User, label: 'Profile', path: '/profile' },
  ]

  const navItems = isAdmin 
    ? [...baseNavItems, { icon: Shield, label: 'Admin', path: '/admin' }]
    : baseNavItems

  return (
    <nav className="fixed bottom-6 left-6 right-6 z-50">
      <div className="flex justify-between items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 shadow-2xl">
        {navItems.map(({ icon: Icon, label, path }) => {
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
                className={`relative z-10 transition-all duration-300 ${
                  isActive 
                    ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' 
                    : 'text-white/40 hover:text-white/60'
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              
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

