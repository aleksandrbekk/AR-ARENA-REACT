import { Home, ShoppingBag, ListTodo, User } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: ShoppingBag, label: 'Shop', path: '/shop' },
    { icon: ListTodo, label: 'Tasks', path: '/tasks' },
    { icon: User, label: 'Profile', path: '/profile' },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 px-4 pt-2 pb-6"
      style={{
        background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 100%)',
        borderTop: '1px solid rgba(255,215,0,0.1)',
      }}
    >
      <div
        className="flex justify-around items-center py-2 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(30,30,30,0.9) 0%, rgba(15,15,15,0.95) 100%)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
        }}
      >
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path
          return (
            <button
              key={label}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                isActive ? 'bg-white/5' : ''
              }`}
            >
              <Icon
                size={24}
                className={`transition-all ${isActive ? 'opacity-100' : 'opacity-50'}`}
              />
              <span className={`text-xs ${isActive ? 'text-[#FFD700]' : 'text-white/50'}`}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
