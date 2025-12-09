import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Автоматический редирект через 3 секунды
    const timer = setTimeout(() => {
      navigate('/shop');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

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
          className="text-lg text-white/60 mb-12 text-center"
        >
          AR зачислены на ваш счёт
        </motion.p>

        {/* Кнопка */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/shop')}
          className="px-8 py-4 bg-gradient-to-b from-[#FFD700] to-[#FFA500] text-black font-bold text-lg rounded-xl shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-shadow"
        >
          Вернуться в магазин
        </motion.button>

        {/* Таймер */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 text-sm text-white/40"
        >
          Автоматический возврат через 3 сек...
        </motion.p>
      </motion.div>
    </div>
  );
}
