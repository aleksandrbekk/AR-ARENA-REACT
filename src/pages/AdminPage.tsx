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
      <Layout>
        <div
          className="flex flex-col items-center justify-center min-h-screen px-4"
          style={{ paddingTop: 'env(safe-area-inset-top, 60px)' }}
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
    { id: 'users' as AdminSection, label: 'USERS', icon: '👥' },
    { id: 'giveaways' as AdminSection, label: 'GIVEAWAYS', icon: '🎁' },
    { id: 'transactions' as AdminSection, label: 'FINANCE', icon: '💰' },
    { id: 'settings' as AdminSection, label: 'SETTINGS', icon: '⚙️' }
  ]

  return (
    <Layout>
      <div className="flex flex-col min-h-screen bg-[#0a0a0a]">
        {/* HEADER - STICKY */}
        <div
          className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5"
          style={{ paddingTop: 'env(safe-area-inset-top, 20px)' }}
        >
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/60 active:scale-95 transition-all"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-white font-bold tracking-wide text-lg flex items-center gap-2">
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
          <div className="flex overflow-x-auto no-scrollbar px-4 pb-0 items-end gap-6 border-b border-white/5">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`pb-3 relative flex items-center gap-2 transition-all ${activeSection === section.id
                    ? 'text-[#FFD700]'
                    : 'text-white/40 hover:text-white/60'
                  }`}
              >
                <span className="text-lg">{section.icon}</span>
                <span className={`text-xs font-bold tracking-wider ${activeSection === section.id ? '' : 'font-medium'}`}>
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
        <div
          className="flex-1 px-4 pb-24"
          style={{ marginTop: 'calc(env(safe-area-inset-top, 20px) + 100px)' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-[#FFD700] text-sm font-mono animate-pulse">LOADING SYSTEM...</div>
            </div>
          ) : (
            <div className="animate-fade-in">
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
