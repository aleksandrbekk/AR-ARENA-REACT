import { useState, useEffect } from 'react'
import { Layout } from '../components/layout/Layout'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { UsersTab } from '../components/admin/UsersTab'
import { GiveawaysTab } from '../components/admin/GiveawaysTab'
import { UtmLinksTab } from '../components/admin/UtmLinksTab'
import { supabase } from '../lib/supabase'

type AdminSection = 'dashboard' | 'users' | 'giveaways' | 'utm'

interface DashboardStats {
  usersCount: number
  activeGiveawaysCount: number
  activePremiumClientsCount: number
  utmLinksCount: number
  botUsersCount: number
}

// SECURITY: Password from env variable (set in Vercel)
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || ''

export function AdminPage() {
  const { telegramUser, isLoading } = useAuth()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard')
  const [stats, setStats] = useState<DashboardStats>({ usersCount: 0, activeGiveawaysCount: 0, activePremiumClientsCount: 0, utmLinksCount: 0, botUsersCount: 0 })
  const [loadingStats, setLoadingStats] = useState(true)

  // Защита паролем для браузера
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  // Проверка admin-only
  const ADMIN_IDS = [190202791, 144828618, 288542643, 288475216]
  const isTelegramWebApp = !!window.Telegram?.WebApp?.initData
  const isAdmin = telegramUser?.id ? ADMIN_IDS.includes(telegramUser.id) : false

  // Проверка авторизации при загрузке
  useEffect(() => {
    if (isTelegramWebApp) {
      setIsAuthenticated(isAdmin)
    } else {
      const saved = localStorage.getItem('admin_auth')
      if (saved === 'true') setIsAuthenticated(true)
    }
  }, [isTelegramWebApp, isAdmin])

  const handlePasswordSubmit = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      localStorage.setItem('admin_auth', 'true')
      setPasswordError(false)
    } else {
      setPasswordError(true)
    }
  }

  // Загрузка статистики для дашборда
  useEffect(() => {
    if (activeSection === 'dashboard' && isAuthenticated) {
      loadDashboardStats()
    }
  }, [activeSection, isAuthenticated])

  const loadDashboardStats = async () => {
    try {
      setLoadingStats(true)
      const [usersRes, giveawaysRes, premiumClientsRes, utmLinksRes, botUsersRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('giveaways').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('premium_clients').select('*', { count: 'exact', head: true }), // Все записи, не только активные
        supabase.from('utm_links').select('*', { count: 'exact', head: true }),
        supabase.from('bot_users').select('*', { count: 'exact', head: true })
      ])

      setStats({
        usersCount: usersRes.count || 0,
        activeGiveawaysCount: giveawaysRes.count || 0,
        activePremiumClientsCount: premiumClientsRes.count || 0,
        utmLinksCount: utmLinksRes.count || 0,
        botUsersCount: botUsersRes.count || 0
      })
    } catch (err) {
      console.error('Error loading dashboard stats:', err)
    } finally {
      setLoadingStats(false)
    }
  }

  // ============ TELEGRAM BACK ============
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg?.BackButton) return

    const handleBack = () => {
      if (activeSection !== 'dashboard') {
        setActiveSection('dashboard')
      } else {
        navigate('/')
      }
    }

    tg.BackButton.show()
    tg.BackButton.onClick(handleBack)

    return () => {
      tg.BackButton.offClick(handleBack)
      tg.BackButton.hide()
    }
  }, [navigate, activeSection])

  // Access denied / Password form
  if (!isLoading && !isAuthenticated) {
    // В Telegram и не админ - запрещаем
    if (isTelegramWebApp && !isAdmin) {
      return (
        <Layout hideNavbar>
          <div className="flex flex-col items-center justify-center min-h-screen px-4" style={{ paddingTop: '80px' }}>
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

    // В браузере - форма пароля
    if (!isTelegramWebApp) {
      return (
        <Layout hideNavbar>
          <div className="min-h-screen bg-[#000] flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
              <h1 className="text-2xl font-bold text-[#FFD700] text-center mb-8">Admin Panel</h1>
              <div className="space-y-4">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={e => { setPasswordInput(e.target.value); setPasswordError(false) }}
                  onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                  placeholder="Пароль"
                  className={`w-full px-4 py-3 bg-zinc-900 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 ${passwordError ? 'ring-2 ring-red-500' : 'focus:ring-white/20'
                    }`}
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-400 text-sm text-center">Неверный пароль</p>
                )}
                <button
                  onClick={handlePasswordSubmit}
                  className="w-full py-3 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-xl active:scale-[0.98] transition-transform"
                >
                  Войти
                </button>
              </div>
            </div>
          </div>
        </Layout>
      )
    }
  }

  // ДАШБОРД - Сетка карточек
  if (activeSection === 'dashboard') {
    return (
      <Layout hideNavbar>
        <div className="min-h-screen bg-[#0a0a0a] text-white pt-[80px] pb-8 px-4">
          <div className="max-w-2xl mx-auto">
            {/* Заголовок */}
            <h1 className="text-2xl font-bold text-center mb-6 text-[#FFD700]">Admin Panel</h1>

            {/* Сетка карточек */}
            <div className="grid grid-cols-2 gap-4">
              {/* 1. USERS */}
              <button
                onClick={() => setActiveSection('users')}
                className="p-4 bg-zinc-900/50 backdrop-blur-md border border-yellow-500/20 rounded-xl active:bg-zinc-800 transition-all flex flex-col items-center gap-3"
              >
                <img src="/icons/PARTNERS.png" alt="Users" className="w-8 h-8 object-contain" />
                <div className="text-center">
                  <div className="text-white font-medium">Юзеры</div>
                  <div className="text-white/60 text-sm">
                    {loadingStats ? '...' : `${stats.usersCount} юзеров`}
                  </div>
                </div>
              </button>

              {/* 2. GIVEAWAYS */}
              <button
                onClick={() => setActiveSection('giveaways')}
                className="p-4 bg-zinc-900/50 backdrop-blur-md border border-yellow-500/20 rounded-xl active:bg-zinc-800 transition-all flex flex-col items-center gap-3"
              >
                <img src="/icons/GIVEAWAY.png" alt="Giveaways" className="w-8 h-8 object-contain" />
                <div className="text-center">
                  <div className="text-white font-medium">Розыгрыши</div>
                  <div className="text-white/60 text-sm">
                    {loadingStats ? '...' : `${stats.activeGiveawaysCount} активных`}
                  </div>
                </div>
              </button>

              {/* 3. CRM СИСТЕМА */}
              <button
                onClick={() => navigate('/full-crm')}
                className="p-4 bg-zinc-900/50 backdrop-blur-md border border-yellow-500/20 rounded-xl active:bg-zinc-800 transition-all flex flex-col items-center gap-3"
              >
                <svg
                  className="w-8 h-8 text-[#FFD700]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" />
                </svg>
                <div className="text-center">
                  <div className="text-white font-medium">CRM</div>
                  <div className="text-white/60 text-sm">
                    {loadingStats ? '...' : `${stats.botUsersCount} в боте`}
                  </div>
                </div>
              </button>

              {/* 4. UTM LINKS */}
              <button
                onClick={() => setActiveSection('utm')}
                className="p-4 bg-zinc-900/50 backdrop-blur-md border border-yellow-500/20 rounded-xl active:bg-zinc-800 transition-all flex flex-col items-center gap-3"
              >
                <svg
                  className="w-8 h-8 text-[#FFD700]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                <div className="text-center">
                  <div className="text-white font-medium">UTM-ссылки</div>
                  <div className="text-white/60 text-sm">
                    {loadingStats ? '...' : `${stats.utmLinksCount} ссылок`}
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // КОНТЕНТ РАЗДЕЛОВ
  return (
    <Layout hideNavbar>
      <div className="flex flex-col min-h-screen bg-[#0a0a0a] pt-14 overflow-x-hidden">
        {/* CONTENT AREA */}
        <div className="flex-1 px-4 py-2 overflow-x-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-[#FFD700] text-sm font-mono animate-pulse">LOADING SYSTEM...</div>
            </div>
          ) : (
            <div className="overflow-x-hidden">
              {activeSection === 'users' && <UsersTab />}
              {activeSection === 'giveaways' && <GiveawaysTab />}
              {activeSection === 'utm' && <UtmLinksTab />}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
