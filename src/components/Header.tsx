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
    <div className="w-full flex justify-between items-center px-4 py-2 pt-14">
      {/* Левая часть: Аватар + Имя */}
      <div className="flex items-center gap-2">
        {/* Аватар */}
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={firstName}
            className="w-10 h-10 rounded-full border-2 border-[#FFD700] object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] flex items-center justify-center text-black font-bold">
            {firstLetter}
          </div>
        )}
        
        {/* Имя пользователя */}
        <span className="text-white font-medium text-base">
          {firstName}
        </span>
      </div>

      {/* Правая часть: Иконка AR + Баланс */}
      <div className="flex items-center gap-1">
        <img
          src="/icons/arcoin.png"
          alt="AR"
          className="w-6 h-6 object-contain"
        />
        <span className="text-[#FFD700] font-bold">
          {formattedBalance}
        </span>
      </div>
    </div>
  )
}
