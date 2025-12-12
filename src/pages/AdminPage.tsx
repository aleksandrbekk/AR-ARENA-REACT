import { useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { UsersTab } from '../components/admin/UsersTab'
import { GiveawaysTab } from '../components/admin/GiveawaysTab'
import { TransactionsTab } from '../components/admin/TransactionsTab'
import { SettingsTab } from '../components/admin/SettingsTab'

type AdminTab = 'users' | 'giveaways' | 'transactions' | 'settings'

export function AdminPage() {
  const { telegramUser } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<AdminTab>('users')

  // Проверка admin-only (telegram_id = 190202791)
  const isAdmin = telegramUser?.id === 190202791

  if (!isAdmin) {
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

  const tabs: Array<{ id: AdminTab; label: string }> = [
    { id: 'users', label: 'Users' },
    { id: 'giveaways', label: 'Giveaways' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'settings', label: 'Settings' }
  ]

  return (
    <Layout>
      {/* Safe Area Top */}
      <div
        className="flex flex-col min-h-screen pb-24"
        style={{
          paddingTop: 'env(safe-area-inset-top, 60px)',
          paddingBottom: 'env(safe-area-inset-bottom, 20px)'
        }}
      >
        {/* HEADER */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-white/60 text-sm active:scale-95 transition-transform"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Назад
            </button>
            <div className="flex items-center gap-2">
              <img src="/icons/admin.png" className="w-8 h-8" alt="Admin" />
              <h1 className="text-white text-xl font-bold">Админ-панель</h1>
            </div>
            <div className="w-16" /> {/* Spacer для центрирования */}
          </div>
        </div>

        {/* TABS — Горизонтальный скролл */}
        <div className="px-4 mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-zinc-900/50 backdrop-blur-md border border-yellow-500/30 text-[#FFD700] shadow-lg shadow-yellow-500/10'
                    : 'bg-zinc-900/30 backdrop-blur-sm border border-white/10 text-white/60 active:scale-95'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className="px-4">
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'giveaways' && <GiveawaysTab />}
          {activeTab === 'transactions' && <TransactionsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </Layout>
  )
}
