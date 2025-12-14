export function SettingsTab() {
  return (
    <div className="space-y-6">
      {/* Заглушка */}
      <div className="bg-zinc-900/30 backdrop-blur-sm rounded-xl p-8 border border-white/5 text-center">
        <img src="/icons/icons/settings-gear.png" alt="Settings" className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <div className="text-white text-lg font-bold mb-2">
          Настройки
        </div>
        <div className="text-white/60 text-sm">
          Раздел в разработке
        </div>
      </div>

      {/* Информация о будущем функционале */}
      <div className="bg-zinc-900/50 backdrop-blur-md rounded-xl p-4 border border-white/10">
        <div className="text-white/50 text-sm mb-3 font-semibold">
          Планируется:
        </div>
        <ul className="space-y-2 text-white/60 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-yellow-500">•</span>
            <span>Настройки экономики (курс AR/BUL, цены скинов)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-500">•</span>
            <span>Настройки уведомлений (победителям розыгрышей)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-500">•</span>
            <span>Настройки розыгрышей (мин. билеты, % джекпота)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-500">•</span>
            <span>Техническое (очистка кэша, перезапуск задач)</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
