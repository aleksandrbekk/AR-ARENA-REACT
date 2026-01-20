import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [hasTelegramId, setHasTelegramId] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);

  useEffect(() => {
    // Проверяем наличие telegram_id
    // @ts-ignore
    const tg = window.Telegram?.WebApp;
    const telegramIdFromWebApp = tg?.initDataUnsafe?.user?.id;
    const telegramIdFromStorage = localStorage.getItem('promo_telegram_id');
    const usernameFromStorage = localStorage.getItem('promo_telegram_username');
    
    setHasTelegramId(!!(telegramIdFromWebApp || telegramIdFromStorage));
    setTelegramUsername(usernameFromStorage);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
      {/* Радиальный градиент виньетка */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, #1a1a1a 0%, #0a0a0a 70%)'
        }}
      />

      {/* Контент */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Иконка успеха */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mb-8"
        >
          <div className="relative">
            {/* Свечение */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#FFD700] to-[#FFA500] blur-3xl opacity-50 rounded-full" />

            {/* Иконка */}
            <CheckCircle
              className="relative w-24 h-24 text-[#FFD700]"
              strokeWidth={2}
            />
          </div>
        </motion.div>

        {/* Заголовок */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-3xl font-black text-white mb-3 text-center tracking-wide"
        >
          Оплата успешна!
        </motion.h1>

        {/* Подзаголовок */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-lg text-white/60 mb-8 text-center max-w-md"
        >
          {hasTelegramId 
            ? 'Доступ к Premium клубу активирован! Проверьте сообщения в боте.'
            : 'Оплата успешно обработана! Для получения доступа выполните следующие шаги:'
          }
        </motion.p>

        {/* Инструкция для пользователей не в боте */}
        {!hasTelegramId && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-8 max-w-md w-full"
          >
            <div className="bg-zinc-900/50 border border-yellow-500/20 rounded-xl p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-yellow-500 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <p className="text-white font-medium mb-1">Добавьтесь в бота</p>
                    <p className="text-white/60 text-sm">
                      Откройте Telegram и перейдите по ссылке:
                    </p>
                    <a
                      href="https://t.me/ARARENA_BOT"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-500 hover:text-yellow-400 text-sm font-medium mt-1 inline-block break-all"
                    >
                      @ARARENA_BOT
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-yellow-500 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <p className="text-white font-medium mb-1">Нажмите "Start" в боте</p>
                    <p className="text-white/60 text-sm">
                      {telegramUsername 
                        ? `Используйте ваш username: @${telegramUsername}`
                        : 'Используйте тот же Telegram аккаунт, который вы указали при оплате'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-yellow-500 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <p className="text-white font-medium mb-1">Получите доступ</p>
                    <p className="text-white/60 text-sm">
                      Бот автоматически выдаст вам доступ к Premium клубу и отправит приглашения в канал и чат
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Кнопки */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          {!hasTelegramId && (
            <motion.a
              href="https://t.me/ARARENA_BOT"
              target="_blank"
              rel="noopener noreferrer"
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold text-lg rounded-xl shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-shadow text-center"
            >
              Открыть бота
            </motion.a>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className={`px-8 py-4 ${hasTelegramId 
              ? 'bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black' 
              : 'bg-zinc-800 text-white border border-white/10'
            } font-bold text-lg rounded-xl shadow-lg transition-shadow`}
          >
            {hasTelegramId ? 'Вернуться на главную' : 'Позже'}
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
