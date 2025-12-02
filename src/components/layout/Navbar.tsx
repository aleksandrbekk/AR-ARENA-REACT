import { Home, ShoppingBag, Gift, ListTodo, User } from 'lucide-react'

export function Navbar() {
  const navItems = [
    { icon: Home, label: 'Home' },
    { icon: ShoppingBag, label: 'Shop' },
    { icon: Gift, label: 'Giveaway' },
    { icon: ListTodo, label: 'Tasks' },
    { icon: User, label: 'Profile' },
  ]

  return (
    <nav className="bg-ar-dark border-t border-white/10 py-3">
      <div className="container mx-auto px-4">
        <div className="flex justify-around items-center">
          {navItems.map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex flex-col items-center gap-1 text-white/60 hover:text-ar-gold transition-colors"
            >
              <Icon size={24} />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
