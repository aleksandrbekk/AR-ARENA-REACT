import { Layout } from '../components/layout/Layout'
import { Particles } from '../components/Particles'

export default function LandingPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
        <Particles />
        
        {/* Spotlight Effect */}
        <div
          className="absolute top-0 left-0 right-0 h-[60vh] pointer-events-none z-0"
          style={{ background: 'radial-gradient(circle at 50% -20%, rgba(255,255,255,0.1) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 px-4 pt-8 pb-24">
          {/* HERO SECTION */}
          <section className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 uppercase tracking-wider">
              AR ARENA
            </h1>
            <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
              Игровая платформа нового поколения
            </p>
            
            {/* Теги в Hero (строки ~217-227) */}
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              <span className="glass-card glass-card-hover px-4 py-2 rounded-full text-sm font-semibold text-white">
                Играй
              </span>
              <span className="glass-card glass-card-hover px-4 py-2 rounded-full text-sm font-semibold text-white">
                Зарабатывай
              </span>
              <span className="glass-card glass-card-hover px-4 py-2 rounded-full text-sm font-semibold text-white">
                Выигрывай
              </span>
            </div>
          </section>

          {/* СЕКЦИЯ "4 СТОЛПА" (строки ~290-313) */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">4 Столпа</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="glass-card glass-card-hover p-6 rounded-2xl shadow-lg shadow-blue-500/10">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Скорость</h3>
                <p className="text-white/60">Быстрые транзакции и мгновенные действия</p>
              </div>

              <div className="glass-card glass-card-hover p-6 rounded-2xl shadow-lg shadow-purple-500/10">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Безопасность</h3>
                <p className="text-white/60">Защита данных и активов</p>
              </div>

              <div className="glass-card glass-card-hover p-6 rounded-2xl shadow-lg shadow-green-500/10">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Доходность</h3>
                <p className="text-white/60">Реальные возможности заработка</p>
              </div>

              <div className="glass-card glass-card-hover p-6 rounded-2xl shadow-lg shadow-orange-500/10">
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Сообщество</h3>
                <p className="text-white/60">Активное сообщество игроков</p>
              </div>
            </div>
          </section>

          {/* СЕКЦИЯ "КНИГА" (строки ~317-430) */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Книга</h2>
            
            <div className="max-w-4xl mx-auto">
              {/* Обложка с тенью */}
              <div className="mb-8 shadow-2xl shadow-blue-500/20 rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-12 text-center">
                  <h3 className="text-4xl font-black text-white mb-4">AR ARENA</h3>
                  <p className="text-xl text-white/90">Полное руководство</p>
                </div>
              </div>

              {/* Part I Card */}
              <div className="glass-card glass-card-hover p-8 rounded-2xl mb-6">
                <div className="flex items-center gap-4 mb-4">
                  {/* Бейдж "Part I — 12 глав" с SVG иконкой книги (строка 197) */}
                  <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-sm font-semibold text-white">Part I — 12 глав</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Часть I: Основы</h3>
                <p className="text-white/70 mb-4">
                  Изучите основы игры, механики и стратегии для успешного старта в AR ARENA.
                </p>
                <ul className="space-y-2 text-white/60">
                  <li>• Введение в игру</li>
                  <li>• Базовые механики</li>
                  <li>• Система скинов</li>
                  <li>• Энергия и ресурсы</li>
                </ul>
              </div>

              {/* Part II Card */}
              <div className="glass-card glass-card-hover p-8 rounded-2xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-full">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-sm font-semibold text-white">Part II — Продвинутый</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Часть II: Продвинутый уровень</h3>
                <p className="text-white/70 mb-4">
                  Углубитесь в продвинутые стратегии, оптимизацию и максимизацию дохода.
                </p>
                <ul className="space-y-2 text-white/60">
                  <li>• Продвинутые стратегии</li>
                  <li>• Оптимизация фермы</li>
                  <li>• Торговля и инвестиции</li>
                  <li>• Сообщество и события</li>
                </ul>
              </div>
            </div>
          </section>

          {/* СЕКЦИЯ "ДЛЯ КОГО" (строки ~432-465) */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Для кого</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card glass-card-hover p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-3">Новички</h3>
                <p className="text-white/70">
                  Идеально для тех, кто только начинает свой путь в игровых блокчейн-проектах.
                </p>
              </div>

              <div className="glass-card glass-card-hover p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-3">Опытные игроки</h3>
                <p className="text-white/70">
                  Для тех, кто ищет новые возможности заработка и интересные механики.
                </p>
              </div>

              <div className="glass-card glass-card-hover p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-3">Инвесторы</h3>
                <p className="text-white/70">
                  Для тех, кто видит потенциал в игровых токенах и NFT-активах.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  )
}

