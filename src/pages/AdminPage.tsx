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
  const [activeSection, setActiveSection] = useState<AdminSection | null>(null)

  // Проверка admin-only (telegram_id = 190202791)
  const isAdmin = telegramUser?.id === 190202791

  // Debug logging
  console.log('🔍 AdminPage render:', {
    isLoading,
    telegramUser,
    isAdmin,
    userId: telegramUser?.id
  })

  // Loading state
  if (isLoading) {
    console.log('⏳ Showing loading screen');
    return (
      <Layout>
        <div
          className="flex flex-col items-center justify-center min-h-screen px-4"
          style={{ paddingTop: 'env(safe-area-inset-top, 60px)' }}
        >
          <div className="text-white/40 text-lg text-center">
            Загрузка...
          </div>
        </div>
      </Layout>
    )
  }

  // Access denied
  if (!isAdmin) {
    console.log('⛔ Access denied for user:', telegramUser?.id)
    return (
      <Layout>
        <div
          className="flex flex-col items-center justify-center min-h-screen px-4"
          style={{ paddingTop: 'env(safe-area-inset-top, 60px)' }}
        >
          <div className="text-white/40 text-lg text-center">
            ⛔ Доступ запрещён
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-6 py-3 bg-zinc-800 text-white rounded-xl active:scale-95 transition-transform"
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
    { id: 'transactions' as AdminSection, label: 'TRANSACTIONS', icon: '💰' },
    { id: 'settings' as AdminSection, label: 'SETTINGS', icon: '⚙️' }
  ]

  console.log('✅ Rendering admin panel for user:', telegramUser?.id)

  return (
    <Layout>
      <div
        className="flex flex-col min-h-screen pb-24 px-4"
        style={{
          paddingTop: 'env(safe-area-inset-top, 60px)',
          paddingBottom: 'env(safe-area-inset-bottom, 20px)'
        }}
      >
        {/* ГЛАВНЫЙ ЭКРАН — СЕТКА */}
        {activeSection === null && (
          <>
            {/* ЗАГОЛОВОК */}
            <div className="text-center mb-8">
              <h1 className="text-white text-2xl font-bold tracking-wide">🔧 АДМИН-ПАНЕЛЬ</h1>
            </div>

            {/* СЕТКА 2x2 */}
            <div className="grid grid-cols-2 gap-4 flex-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className="bg-zinc-900/50 backdrop-blur-md border border-yellow-500/20 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 active:scale-95 transition-transform hover:border-yellow-500/40"
                >
                  <div className="text-6xl">{section.icon}</div>
                  <div className="text-white/80 text-sm font-semibold tracking-wide">
                    {section.label}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* РАЗДЕЛ — С КНОПКОЙ НАЗАД */}
        {activeSection !== null && (
          <>
            {/* HEADER С КНОПКОЙ НАЗАД */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setActiveSection(null)}
                className="text-gray-400 active:scale-95 transition-transform"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <h2 className="text-white text-xl font-bold tracking-wide">
                {sections.find(s => s.id === activeSection)?.icon}{' '}
                {sections.find(s => s.id === activeSection)?.label}
              </h2>
            </div>

            {/* КОНТЕНТ */}
            <div>
              {activeSection === 'users' && <UsersTab />}
              {activeSection === 'giveaways' && <GiveawaysTab />}
              {activeSection === 'transactions' && <TransactionsTab />}
              {activeSection === 'settings' && <SettingsTab />}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
