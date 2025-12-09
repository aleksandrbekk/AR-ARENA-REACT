import { useState, useEffect } from 'react';
import { useSkins } from '../hooks/useSkins';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { SkinCard } from '../components/skins/SkinCard';
import { RARITY_CONFIG, type RarityType } from '../config/rarityConfig';
import { CurrencyIcon } from '../components/CurrencyIcon';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Pickaxe, Battery, Lock, Check } from 'lucide-react';

const RARITY_GRADIENTS = {
  default: 'radial-gradient(circle at center top, #404040 0%, #1a1a1a 40%, #0a0a0a 100%)',
  common: 'radial-gradient(circle at center top, #4b5563 0%, #1f2937 40%, #030712 100%)',
  uncommon: 'radial-gradient(circle at center top, #059669 0%, #064e3b 40%, #022c22 100%)',
  rare: 'radial-gradient(circle at center top, #2563eb 0%, #1e3a8a 40%, #0f172a 100%)',
  epic: 'radial-gradient(circle at center top, #9333ea 0%, #581c87 40%, #2e1065 100%)',
  legendary: 'radial-gradient(circle at center top, #f59e0b 0%, #b45309 40%, #451a03 100%)',
};

// Компонент частиц
const Particles = ({ color }: { color: string }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full opacity-20 blur-sm"
          style={{
            backgroundColor: color,
            width: Math.random() * 4 + 2 + 'px',
            height: Math.random() * 4 + 2 + 'px',
            left: Math.random() * 100 + '%',
            top: '100%',
          }}
          animate={{
            y: [0, -500],
            opacity: [0, 0.4, 0],
            x: Math.random() * 60 - 30,
          }}
          transition={{
            duration: Math.random() * 5 + 5,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );
};

export default function SkinsPage() {
  const navigate = useNavigate();
  const { telegramUser, gameState } = useAuth();
  const { skins, activeSkin, isOwned, isEquipped, reload } = useSkins();
  const [selectedSkinId, setSelectedSkinId] = useState<number | null>(null);
  const [buying, setBuying] = useState(false);
  const [equipping, setEquipping] = useState(false);

  // Настройка Telegram Back Button
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.BackButton.show();
      tg.BackButton.onClick(() => navigate('/'));

      return () => {
        tg.BackButton.hide();
        tg.BackButton.offClick(() => navigate('/'));
      };
    }
  }, [navigate]);

  // Устанавливаем выбранный скин при загрузке
  useEffect(() => {
    if (activeSkin && selectedSkinId === null) {
      setSelectedSkinId(activeSkin.id);
    } else if (skins.length > 0 && selectedSkinId === null) {
      setSelectedSkinId(skins[0].id);
    }
  }, [activeSkin, skins, selectedSkinId]);

  const selectedSkin = skins.find(s => s.id === selectedSkinId) || skins[0];
  const owned = selectedSkin ? isOwned(selectedSkin.id) : false;
  const equipped = selectedSkin ? isEquipped(selectedSkin.id) : false;

  // Проверка требований
  const levelReq = selectedSkin?.level_req || 0;
  const userLevel = gameState?.level || 0;
  const isLevelLocked = !owned && userLevel < levelReq;

  const handleBuy = async () => {
    if (!selectedSkinId || owned || !telegramUser || isLevelLocked) return;
    setBuying(true);

    try {
      const { data, error } = await supabase.rpc('buy_skin', {
        p_telegram_id: telegramUser.id.toString(),
        p_skin_id: selectedSkinId
      });

      if (error) throw error;

      if (!data.success) {
        if (data.error === 'INSUFFICIENT_BUL') {
          alert('Недостаточно BUL!');
        } else if (data.error === 'INSUFFICIENT_AR') {
          alert('Недостаточно AR!');
        } else if (data.error === 'ALREADY_OWNED') {
          alert('Уже куплен!');
        }
        return;
      }

      await reload();

    } catch (err) {
      console.error('Error buying skin:', err);
    } finally {
      setBuying(false);
    }
  };

  const handleEquip = async () => {
    if (!selectedSkinId || !owned || equipped || !telegramUser) return;
    setEquipping(true);

    try {
      const { data, error } = await supabase.rpc('equip_skin', {
        p_telegram_id: telegramUser.id.toString(),
        p_skin_id: selectedSkinId
      });

      if (error) throw error;

      if (!data.success) {
        if (data.error === 'SKIN_NOT_OWNED') {
          alert('Скин не куплен!');
        } else if (data.error === 'USER_NOT_FOUND') {
          alert('Пользователь не найден!');
        }
        return;
      }

      await reload();
    } catch (err) {
      console.error('Error equipping skin:', err);
    } finally {
      setEquipping(false);
    }
  };

  const gradient = RARITY_GRADIENTS[selectedSkin?.rarity || 'default'];
  const rarityStyles = RARITY_CONFIG[selectedSkin?.rarity as RarityType] || RARITY_CONFIG.default;

  const rarityOrder: Record<string, number> = {
    'default': 0,
    'common': 1,
    'uncommon': 2,
    'rare': 3,
    'epic': 4,
    'legendary': 5,
  };

  const sortedSkins = [...skins].sort((a, b) => {
    const orderA = rarityOrder[a.rarity || 'default'] || 0;
    const orderB = rarityOrder[b.rarity || 'default'] || 0;
    return orderA - orderB;
  });

  const getParticleColor = (rarity: string) => {
    switch(rarity) {
      case 'legendary': return '#fbbf24';
      case 'epic': return '#a855f7';
      case 'rare': return '#3b82f6';
      case 'uncommon': return '#10b981';
      default: return '#ffffff';
    }
  };

  // Calculate total tap power: base (1) + skin bonus
  const totalTap = 1 + (selectedSkin?.tap_bonus || 0)

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* ПОДИУМ */}
      <motion.div
        className="relative w-full flex-shrink-0 flex flex-col items-center overflow-hidden pt-[60px]"
        animate={{ background: gradient }}
        transition={{ duration: 0.6 }}
        style={{ height: '50vh' }}
      >
        <Particles color={getParticleColor(selectedSkin?.rarity || 'default')} />

        {/* 1. ИМЯ СКИНА (Сверху) */}
        <div className="w-full flex flex-col items-center justify-center z-10 mt-16">
          <motion.h2
            key={selectedSkin?.name}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-2xl font-black uppercase tracking-wider ${rarityStyles.text} drop-shadow-lg text-center`}
          >
            {selectedSkin?.name || 'Базовый'}
          </motion.h2>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '24px' }}
            className={`h-1 mt-2 rounded-full ${rarityStyles.text.replace('text-', 'bg-')}`}
          />
        </div>

        {/* 2. ПЕРСОНАЖ (Центр, занимает максимум места) */}
        <div className="flex-1 flex items-center justify-center relative w-full px-8 py-2">
          {/* BACKLIGHT AURA */}
          <motion.div
            className={`
              absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              w-[320px] h-[320px] rounded-full
              opacity-40 blur-[40px] -z-10
              ${rarityStyles.auraColor}
            `}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {selectedSkin?.file && (
            <img
              src={`/icons/skins/${selectedSkin.file}`}
              alt={selectedSkin.name}
              className="relative z-10 max-h-[240px] w-auto object-contain drop-shadow-2xl"
            />
          )}
        </div>

        {/* 3. СТАТЫ (Внизу подиума - PREMIUM MINIMALIST) */}
        <div className="w-full flex justify-center z-20 mb-8">
          <AnimatePresence mode="wait">
            {selectedSkin && (
              <motion.div
                key={selectedSkin.id}
                className="flex items-center gap-6 px-6 py-3 rounded-full bg-black/20 backdrop-blur-sm border border-white/5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Tap (total power) */}
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" fill="currentColor" />
                  <span className="text-sm font-bold text-white">
                    +{totalTap}
                  </span>
                </div>

                <div className="w-px h-4 bg-white/10" />

                {/* Farm */}
                <div className="flex items-center gap-2">
                  <Pickaxe className={`w-4 h-4 ${selectedSkin.farm_bonus > 0 ? "text-green-400" : "text-white/20"}`} />
                  <span className={`text-sm font-bold ${selectedSkin.farm_bonus > 0 ? "text-white" : "text-white/30"}`}>
                    +{selectedSkin.farm_bonus}
                  </span>
                </div>

                <div className="w-px h-4 bg-white/10" />

                {/* Regen */}
                <div className="flex items-center gap-2">
                  <Battery className={`w-4 h-4 ${selectedSkin.regen_bonus > 0 ? "text-blue-400" : "text-white/20"}`} />
                  <span className={`text-sm font-bold ${selectedSkin.regen_bonus > 0 ? "text-white" : "text-white/30"}`}>
                    +{selectedSkin.regen_bonus}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ГРИД СКИНОВ */}
      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-6 bg-[#0a0a0a] rounded-t-3xl -mt-4 z-20 border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="grid grid-cols-3 gap-3">
          {sortedSkins.map((skin) => (
            <SkinCard
              key={skin.id}
              skin={skin}
              isActive={selectedSkinId === skin.id}
              isOwned={isOwned(skin.id)}
              isEquipped={isEquipped(skin.id)}
              onClick={() => setSelectedSkinId(skin.id)}
            />
          ))}
        </div>
      </div>

      {/* STICKY ФУТЕР */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/90 backdrop-blur-xl border-t border-white/10 z-30 pb-8">
        <div className="flex items-center justify-between gap-4 max-w-screen-sm mx-auto">
          
          {/* ЦЕНА (только если не куплен) */}
          <div className="flex-1">
            {!owned ? (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3"
              >
                {selectedSkin?.skin_type === 'ar' ? (
                  <>
                    <div className="w-11 h-11 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-white/10 shadow-inner">
                      <CurrencyIcon type="AR" className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Стоимость</span>
                      <span className="text-2xl font-black text-white tracking-tight">
                        {selectedSkin?.price_ar?.toLocaleString() || 0}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-11 h-11 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-white/10 shadow-inner">
                      <CurrencyIcon type="BUL" className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Стоимость</span>
                      <span className="text-2xl font-black text-white tracking-tight">
                        {selectedSkin?.price_bul?.toLocaleString() || 0}
                      </span>
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
               <div className="flex items-center gap-2 text-white/50">
                 <Check className="w-5 h-5 text-green-500" />
                 <span className="text-sm font-medium">Приобретено</span>
               </div>
            )}
            <span className="text-[10px] font-bold text-white bg-green-500 px-1 rounded absolute -bottom-4 left-0 z-50">v1.4</span>
          </div>

          {/* КНОПКА */}
          <div className="flex-1 max-w-[180px]">
            {owned ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleEquip}
                disabled={equipped || equipping}
                className={`
                  w-full py-3.5 rounded-xl font-bold text-sm transition-all relative overflow-hidden
                  ${equipped
                    ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                    : `${rarityStyles.buttonGradient} text-white shadow-lg shadow-purple-500/20`
                  }
                `}
              >
                {equipped ? 'Используется' : 'Выбрать'}
              </motion.button>
            ) : (
              <motion.button
                whileTap={!isLevelLocked ? { scale: 0.95 } : {}}
                onClick={handleBuy}
                disabled={buying || isLevelLocked || (gameState ? (
                  selectedSkin?.skin_type === 'ar'
                    ? gameState.balance_ar < (selectedSkin?.price_ar || 0)
                    : gameState.balance_bul < (selectedSkin?.price_bul || 0)
                ) : false)}
                className={`
                  w-full py-3.5 rounded-xl font-bold text-sm transition-all relative overflow-hidden
                  ${isLevelLocked 
                    ? 'bg-gray-800 text-white/40 cursor-not-allowed border border-white/5'
                    : `${rarityStyles.buttonGradient} text-white shadow-lg`
                  }
                  disabled:opacity-80
                `}
              >
                <div className="flex items-center justify-center gap-2">
                  {isLevelLocked ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>LVL {levelReq}</span>
                    </>
                  ) : (
                    <span>{buying ? '...' : 'Купить'}</span>
                  )}
                </div>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
