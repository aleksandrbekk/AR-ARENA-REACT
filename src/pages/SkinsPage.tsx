import { useState, useEffect } from 'react';
import { useSkins } from '../hooks/useSkins';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { SkinCard } from '../components/skins/SkinCard';
import { RARITY_CONFIG, type RarityType } from '../config/rarityConfig';

const RARITY_GRADIENTS = {
  default: 'linear-gradient(to bottom, #4a4a4a, #1a1a1a)',
  common: 'linear-gradient(to bottom, #5a5a5a, #2a2a2a)',
  uncommon: 'linear-gradient(to bottom, #2d5a3d, #1a2e1f)',
  rare: 'linear-gradient(to bottom, #2d4a6a, #1a2a3f)',
  epic: 'linear-gradient(to bottom, #5a2d6a, #2f1a3f)',
  legendary: 'linear-gradient(to bottom, #6a5a2d, #3f351a)',
};

const RARITY_LABELS: Record<string, string> = {
  default: 'Обычный',
  common: 'Частый',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный',
};

export default function SkinsPage() {
  const { telegramUser, gameState } = useAuth();
  const { skins, activeSkin, isOwned, isEquipped, reload } = useSkins();
  const [selectedSkinId, setSelectedSkinId] = useState<number | null>(null);
  const [buying, setBuying] = useState(false);
  const [equipping, setEquipping] = useState(false);

  // Устанавливаем выбранный скин при загрузке
  useEffect(() => {
    if (activeSkin) {
      setSelectedSkinId(activeSkin.id);
    } else if (skins.length > 0) {
      setSelectedSkinId(skins[0].id);
    }
  }, [activeSkin, skins]);

  const selectedSkin = skins.find(s => s.id === selectedSkinId) || skins[0];
  const owned = selectedSkin ? isOwned(selectedSkin.id) : false;
  const equipped = selectedSkin ? isEquipped(selectedSkin.id) : false;

  const handleBuy = async () => {
    if (!selectedSkinId || owned || !telegramUser) return;
    setBuying(true);
    try {
      const { error } = await supabase.rpc('buy_and_equip_skin', {
        p_telegram_id: telegramUser.id.toString(),
        p_skin_id: selectedSkinId
      });

      if (error) throw error;
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
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', telegramUser.id)
        .single();

      if (userError || !userData) throw userError;

      await supabase
        .from('user_skins')
        .update({ is_equipped: false })
        .eq('user_id', userData.id);

      await supabase
        .from('user_skins')
        .update({ is_equipped: true })
        .eq('user_id', userData.id)
        .eq('skin_id', selectedSkinId);

      await reload();
    } catch (err) {
      console.error('Error equipping skin:', err);
    } finally {
      setEquipping(false);
    }
  };

  const gradient = RARITY_GRADIENTS[selectedSkin?.rarity || 'default'];
  const rarityStyles = RARITY_CONFIG[selectedSkin?.rarity as RarityType] || RARITY_CONFIG.default;

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* ПОДИУМ - БЕЗ padding сверху, градиент от края экрана */}
      <div
        className="relative w-full flex-shrink-0 flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: gradient,
          height: '40vh',
        }}
      >
        {/* Кнопка закрыть поверх градиента */}
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
        >
          ✕
        </button>

        {/* Большой бык с подиумом и аурой */}
        <div className="flex-1 flex flex-col items-center justify-end pt-12 pb-8 relative">
          {/* АУРА за персонажем */}
          <div
            className="absolute -z-10 rounded-full blur-3xl transition-all duration-500"
            style={{
              width: '300px',
              height: '300px',
              background: rarityStyles.auraColor,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />

          {/* Бык */}
          <img
            src={selectedSkin?.file ? `/icons/skins/${selectedSkin.file}` : '/bull.png'}
            alt={selectedSkin?.name}
            className="max-h-[24vh] object-contain relative z-10 transition-all duration-300"
            style={{ marginBottom: '-20px' }}
          />

          {/* Золотой подиум */}
          <div
            className="relative transition-all duration-300"
            style={{
              width: '200px',
              height: '30px',
              background: 'linear-gradient(to bottom, #FFD700, #B8860B)',
              borderRadius: '50%',
              boxShadow: '0 0 30px rgba(255, 215, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '40%',
                left: '10%',
                right: '10%',
                height: '1px',
                background: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '60%',
                left: '15%',
                right: '15%',
                height: '1px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '50%',
              }}
            />
          </div>
        </div>

        {/* Имя и рарность */}
        <div className="px-4 pb-4 w-full flex items-center justify-between z-10">
          <h2 className={`text-2xl font-bold ${rarityStyles.text}`}>
            {selectedSkin?.name || 'Базовый'}
          </h2>
          <span className={`text-sm ${rarityStyles.text} bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full border ${rarityStyles.border}`}>
            {RARITY_LABELS[selectedSkin?.rarity || 'default']}
          </span>
        </div>
      </div>

      {/* ГРИД СКИНОВ - скроллится */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        <div className="grid grid-cols-3 gap-3">
          {skins.map((skin) => (
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

      {/* STICKY ФУТЕР С КНОПКОЙ - фиксирована внизу */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-xl border-t border-white/10 z-30">
        <div className="flex items-center justify-between gap-4 max-w-screen-sm mx-auto">
          {/* Статы или цена */}
          <div className="flex-1">
            {owned ? (
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/60">Клик:</span>
                  <span className={`text-sm font-bold ${rarityStyles.text}`}>
                    +{selectedSkin?.tap_bonus || 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/60">Фарм:</span>
                  <span className={`text-sm font-bold ${rarityStyles.text}`}>
                    +{selectedSkin?.farm_bonus || 0}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <img src="/icons/coin.svg" alt="BUL" className="w-6 h-6" />
                <span className="text-xl font-bold text-white">
                  {selectedSkin?.price_bul?.toLocaleString() || 0}
                </span>
              </div>
            )}
          </div>

          {/* Кнопка с градиентом по редкости */}
          {owned ? (
            <button
              onClick={handleEquip}
              disabled={equipped || equipping}
              className={`
                px-6 py-3 rounded-xl font-bold text-sm transition-all
                ${equipped
                  ? 'bg-gray-600 text-white/50 cursor-not-allowed'
                  : `${rarityStyles.buttonGradient} text-white shadow-lg hover:scale-105`
                }
              `}
            >
              {equipped ? 'Надето' : 'Надеть'}
            </button>
          ) : (
            <button
              onClick={handleBuy}
              disabled={buying || (gameState ? gameState.balance_bul < (selectedSkin?.price_bul || 0) : false)}
              className={`
                px-6 py-3 rounded-xl font-bold text-sm transition-all
                ${rarityStyles.buttonGradient} text-white shadow-lg
                hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              `}
            >
              <div className="flex items-center gap-2">
                <span>{buying ? 'Покупка...' : 'Купить'}</span>
                {!buying && (
                  <img src="/icons/coin.svg" alt="BUL" className="w-5 h-5" />
                )}
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
