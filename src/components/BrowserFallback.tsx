// Красивый экран для пользователей, открывших сайт в браузере (не в Telegram)
export function BrowserFallback() {
  const botUrl = 'https://t.me/ARARENA_BOT'

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#FFD700]/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10 mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-2xl flex items-center justify-center shadow-[0_0_60px_rgba(255,215,0,0.3)]">
          <span className="text-black font-black text-3xl tracking-tight">AR</span>
        </div>
      </div>

      {/* Title */}
      <h1 className="relative z-10 text-3xl font-black text-white text-center mb-2">
        AR ARENA
      </h1>
      <p className="relative z-10 text-white/50 text-center mb-8">
        Telegram Mini App
      </p>

      {/* Message */}
      <div className="relative z-10 bg-zinc-900/80 border border-white/10 rounded-2xl p-6 max-w-sm text-center mb-8">
        <div className="text-4xl mb-4">📱</div>
        <p className="text-white/80 text-sm leading-relaxed">
          Это приложение работает только в Telegram.
          <br />
          Откройте бота и запустите Mini App.
        </p>
      </div>

      {/* Button */}
      <a
        href={botUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative z-10 px-8 py-4 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold rounded-xl text-lg shadow-[0_4px_20px_rgba(255,215,0,0.4)] hover:shadow-[0_4px_30px_rgba(255,215,0,0.6)] transition-shadow"
      >
        Открыть в Telegram
      </a>

      {/* Bot name */}
      <p className="relative z-10 text-white/30 text-sm mt-4">
        @ARARENA_BOT
      </p>
    </div>
  )
}
