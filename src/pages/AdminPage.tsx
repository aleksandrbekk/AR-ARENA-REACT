import { useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type AdminTab = 'dashboard' | 'users' | 'giveaways' | 'tasks' | 'settings'

// 🎯 MOCK DATA для Dashboard
const MOCK_STATS = {
  totalUsers: 1542,
  onlineNow: 87,
  newToday: 23,
  churnedToday: 5,
  totalAR: 125000,
  totalBUL: 3450000
}

export function AdminPage() {
  const { telegramUser } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')

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
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'users', label: 'Users' },
    { id: 'giveaways', label: 'Giveaways' },
    { id: 'tasks', label: 'Tasks' },
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
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stat Cards Grid — 2x2 */}
              <div className="grid grid-cols-2 gap-3">
                {/* Всего юзеров */}
                <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <div className="text-3xl font-bold text-white mb-1">
                    {MOCK_STATS.totalUsers.toLocaleString()}
                  </div>
                  <div className="text-xs text-white/50 uppercase tracking-wide">
                    Всего юзеров
                  </div>
                </div>

                {/* Онлайн */}
                <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <div className="text-3xl font-bold text-white mb-1">
                    {MOCK_STATS.onlineNow.toLocaleString()}
                  </div>
                  <div className="text-xs text-white/50 uppercase tracking-wide">
                    Онлайн
                  </div>
                </div>

                {/* Новых сегодня */}
                <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-4 border border-green-500/20">
                  <div className="text-3xl font-bold text-green-500 mb-1">
                    {MOCK_STATS.newToday.toLocaleString()}
                  </div>
                  <div className="text-xs text-white/50 uppercase tracking-wide">
                    Новых
                  </div>
                </div>

                {/* Отвалились */}
                <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl p-4 border border-red-500/20">
                  <div className="text-3xl font-bold text-red-500 mb-1">
                    {MOCK_STATS.churnedToday.toLocaleString()}
                  </div>
                  <div className="text-xs text-white/50 uppercase tracking-wide">
                    Отвалились
                  </div>
                </div>
              </div>

              {/* AR + BUL в обороте */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-[#FFD700]/10 to-[#FFA500]/10 backdrop-blur-md rounded-2xl p-4 border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <img src="/icons/arcoin.png" className="w-6 h-6" alt="AR" />
                    <span className="text-xs text-white/50 uppercase tracking-wide">
                      AR в обороте
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-[#FFD700]">
                    {MOCK_STATS.totalAR.toLocaleString()}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-md rounded-2xl p-4 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <img src="/icons/BUL.png" className="w-6 h-6" alt="BUL" />
                    <span className="text-xs text-white/50 uppercase tracking-wide">
                      BUL в обороте
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-blue-400">
                    {MOCK_STATS.totalBUL.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Информация */}
              <div className="bg-zinc-900/30 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
                <div className="text-white/60 text-sm leading-relaxed">
                  📊 Раздел Dashboard — статистика в реальном времени.
                  <br />
                  Данные обновляются каждые 5 минут.
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="bg-zinc-900/30 backdrop-blur-sm rounded-2xl p-8 border border-white/5 text-center">
              <div className="text-white/40 text-lg mb-2">👥</div>
              <div className="text-white/60 text-base">
                Раздел Users — в разработке
              </div>
            </div>
          )}

          {/* Giveaways Tab */}
          {activeTab === 'giveaways' && (
            <div className="bg-zinc-900/30 backdrop-blur-sm rounded-2xl p-8 border border-white/5 text-center">
              <div className="text-white/40 text-lg mb-2">🎁</div>
              <div className="text-white/60 text-base">
                Раздел Giveaways — в разработке
              </div>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="bg-zinc-900/30 backdrop-blur-sm rounded-2xl p-8 border border-white/5 text-center">
              <div className="text-white/40 text-lg mb-2">✅</div>
              <div className="text-white/60 text-base">
                Раздел Tasks — в разработке
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-zinc-900/30 backdrop-blur-sm rounded-2xl p-8 border border-white/5 text-center">
              <div className="text-white/40 text-lg mb-2">⚙️</div>
              <div className="text-white/60 text-base">
                Раздел Settings — в разработке
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
