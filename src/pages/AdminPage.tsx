import { useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { UsersTab } from '../components/admin/UsersTab'
import { GiveawaysTab } from '../components/admin/GiveawaysTab'
import { TransactionsTab } from '../components/admin/TransactionsTab'
import { SettingsTab } from '../components/admin/SettingsTab'

type AdminSection = 'users' | 'giveaways' | 'transactions' | 'settings'

export function AdminPage() {
  const { telegramUser, isLoading } = useAuth()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<AdminSection>('users')

  // Проверка admin-only (telegram_id = 190202791)
  const isAdmin = telegramUser?.id === 190202791

  // Access denied
  if (!isLoading && !isAdmin) {
    return (
      <Layout hideNavbar>
        <div
          className="flex flex-col items-center justify-center min-h-screen px-4"
          style={{ paddingTop: '80px' }}
        >
          <div className="text-white/40 text-lg text-center font-bold tracking-widest uppercase">
            Доступ запрещён
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-6 py-3 bg-zinc-800 text-white rounded-xl active:scale-95 transition-transform font-medium"
          >
            На главную
          </button>
        </div>
      </Layout>
    )
  }

  const sections = [
    { id: 'users' as AdminSection, label: 'USERS', icon: '/icons/PARTNERS.png' },
    { id: 'giveaways' as AdminSection, label: 'GIVEAWAYS', icon: '/icons/GIVEAWAY.png' },
    { id: 'transactions' as AdminSection, label: 'FINANCE', icon: '/icons/arcoin.png' },
    { id: 'settings' as AdminSection, label: 'SETTINGS', icon: '/icons/icons/settings-gear.png' }
  ]

  return (
    <Layout hideNavbar>
      <div className="flex flex-col min-h-screen bg-[#0a0a0a]">
        {/* HEADER - NOT FIXED, flows with safe-area from Layout */}
        <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/60 active:scale-95 transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-white font-bold tracking-wide text-lg flex items-center gap-2">
                <img src="/icons/admin.png" alt="Admin" className="w-6 h-6" />
                <span className="text-[#FFD700]">Admin</span> Panel
              </h1>
            </div>
            {telegramUser && (
              <div className="text-[10px] font-mono text-white/30 text-right">
                ID: {telegramUser.id}
              </div>
            )}
          </div>

          {/* TABS - SCROLLABLE */}
          <div className="flex overflow-x-auto no-scrollbar px-4 pb-0 items-end gap-5 border-b border-white/5">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`pb-3 relative flex items-center gap-2 transition-all shrink-0 ${activeSection === section.id
                  ? 'text-[#FFD700]'
                  : 'text-white/40'
                  }`}
              >
                <img
                  src={section.icon}
                  alt={section.label}
                  className={`w-5 h-5 object-contain transition-all ${activeSection === section.id
                    ? 'opacity-100 drop-shadow-[0_0_5px_rgba(255,215,0,0.5)]'
                    : 'opacity-40 grayscale'
                    }`}
                />
                <span className={`text-xs tracking-wider ${activeSection === section.id ? 'font-bold' : 'font-medium'
                  }`}>
                  {section.label}
                </span>
                {activeSection === section.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFD700] rounded-t-full shadow-[0_0_10px_#FFD700]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 px-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-[#FFD700] text-sm font-mono animate-pulse">LOADING SYSTEM...</div>
            </div>
          ) : (
            <div>
              {activeSection === 'users' && <UsersTab />}
              {activeSection === 'giveaways' && <GiveawaysTab />}
              {activeSection === 'transactions' && <TransactionsTab />}
              {activeSection === 'settings' && <SettingsTab />}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

