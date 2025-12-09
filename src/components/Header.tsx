interface HeaderProps {
  photoUrl?: string
  firstName: string
  balanceAr: number
}

export function Header({ photoUrl, firstName, balanceAr }: HeaderProps) {
  // Форматируем баланс AR с разделителями тысяч
  const formattedBalance = balanceAr.toLocaleString('ru-RU')

  // Получаем первую букву имени для аватара-заглушки
  const firstLetter = firstName.charAt(0).toUpperCase()

  return (
    <div className="w-full flex justify-between items-center px-4 pt-12 pb-2">
      {/* Левая часть: Аватар + Имя (Pill Style) */}
      <div className="flex items-center gap-2 bg-black/20 backdrop-blur-lg border border-white/5 rounded-full p-1 pr-4 shadow-lg">
        {/* Аватар */}
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={firstName}
            className="w-8 h-8 rounded-full border border-white/20 object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] flex items-center justify-center text-black font-bold text-xs">
            {firstLetter}
          </div>
        )}
        
        {/* Имя пользователя */}
        <span className="text-white/90 font-medium text-sm">
          {firstName}
        </span>
      </div>

      {/* Правая часть: Иконка AR + Баланс (Pill Style) */}
      <div className="flex items-center gap-2 bg-black/20 backdrop-blur-lg border border-white/5 rounded-full px-3 py-1.5 shadow-lg">
        <img
          src="/icons/arcoin.png"
          alt="AR"
          className="w-5 h-5 object-contain"
        />
        <span className="text-[#FFD700] font-bold text-sm">
          {formattedBalance}
        </span>
      </div>
    </div>
  )
}
