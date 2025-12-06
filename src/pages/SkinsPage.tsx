import { useState, useEffect } from 'react';
import { useSkins } from '../hooks/useSkins';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

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

const RARITY_COLORS: Record<string, string> = {
  default: '#808080',
  common: '#808080',
  uncommon: '#4ADE80',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#FFD700',
};

export default function SkinsPage() {
  const { telegramUser, gameState } = useAuth();
  const { skins, activeSkin, loading, isOwned, isEquipped, reload } = useSkins();
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
      // Получаем user_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', telegramUser.id)
        .single();

      if (userError || !userData) throw userError;

      // Снимаем все скины
      await supabase
        .from('user_skins')
        .update({ is_equipped: false })
        .eq('user_id', userData.id);

      // Экипируем выбранный
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

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* ПОДИУМ - БЕЗ padding сверху, градиент от края экрана */}
      <div
        className="relative w-full flex-shrink-0 flex flex-col items-center justify-center"
        style={{
          background: gradient,
          height: '40vh',
        }}
      >
        {/* Кнопка закрыть поверх градиента */}
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white"
        >
          ✕
        </button>

        {/* Большой бык */}
        <div className="flex-1 flex items-center justify-center pt-12">
          <img
            src={selectedSkin?.file ? `/icons/skins/${selectedSkin.file}` : '/bull.png'}
            alt={selectedSkin?.name}
            className="max-h-[28vh] object-contain"
          />
        </div>

        {/* Имя и рарность */}
        <div className="px-4 pb-4 w-full flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {selectedSkin?.name || 'Базовый'}
          </h2>
          <span className="text-sm text-white/80 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
            {RARITY_LABELS[selectedSkin?.rarity || 'default']}
          </span>
        </div>
      </div>

      {/* ГРИД СКИНОВ - скроллится */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          {skins.map((skin) => {
            const skinOwned = isOwned(skin.id);
            const skinEquipped = isEquipped(skin.id);
            const rarityColor = RARITY_COLORS[skin.rarity] || RARITY_COLORS.default;
            const isSelected = selectedSkinId === skin.id;

            return (
              <button
                key={skin.id}
                onClick={() => setSelectedSkinId(skin.id)}
                className={`
                  relative aspect-square rounded-lg overflow-hidden
                  bg-[#1a1a1a] p-2 transition-all
                  ${!skinOwned ? 'opacity-50' : ''}
                `}
                style={{
                  border: isSelected ? `3px solid ${rarityColor}` : `2px solid ${rarityColor}`,
                  boxShadow: isSelected
                    ? `0 0 20px ${rarityColor}80, 0 0 10px ${rarityColor}60`
                    : `0 0 10px ${rarityColor}80`
                }}
                disabled={loading}
              >
                <img
                  src={`/icons/skins/${skin.file}`}
                  alt={skin.name}
                  className="w-full h-full object-contain"
                />
                {skinEquipped && (
                  <div className="absolute top-1 left-1 w-5 h-5 bg-[#FFD700] rounded-full flex items-center justify-center text-[10px]">
                    ✓
                  </div>
                )}
                {!skinOwned && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-xs text-white font-bold">
                      {skin.price_bul?.toLocaleString()}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ПЛАШКА ВНИЗУ - фиксирована */}
      <div className="flex-shrink-0 p-4 bg-[#1a1a1a]/80 backdrop-blur-md border-t border-white/10">
        <div className="flex items-center justify-between gap-4">
          {/* Статы или цена */}
          <div className="flex-1">
            {owned ? (
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/60">Клик:</span>
                  <span className="text-sm font-bold text-[#FFD700]">
                    +{selectedSkin?.tap_bonus || 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/60">Фарм:</span>
                  <span className="text-sm font-bold text-[#FFD700]">
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

          {/* Кнопка */}
          {owned ? (
            <button
              onClick={handleEquip}
              disabled={equipped || equipping}
              className={`
                px-6 py-3 rounded-lg font-bold text-sm
                ${
                  equipped
                    ? 'bg-gray-600 text-white/50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black'
                }
              `}
            >
              {equipped ? 'Надето' : 'Надеть'}
            </button>
          ) : (
            <button
              onClick={handleBuy}
              disabled={buying || (gameState ? gameState.balance_bul < (selectedSkin?.price_bul || 0) : false)}
              className="px-6 py-3 rounded-lg font-bold text-sm bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Купить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
