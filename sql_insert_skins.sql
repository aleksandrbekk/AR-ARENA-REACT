-- =====================================================
-- ЗАПОЛНЕНИЕ ТАБЛИЦЫ SKINS
-- =====================================================
-- Выполни этот скрипт в Supabase SQL Editor, чтобы добавить все 15 скинов

-- Сначала очистим таблицу (опционально, если хочешь начать с чистого листа)
-- TRUNCATE TABLE skins RESTART IDENTITY CASCADE;

-- Вставка всех 15 скинов
INSERT INTO skins (name, file, rarity, price_bul, price_ar, level_req, refs_req, tap_bonus, regen_bonus, farm_bonus, description, is_active)
VALUES
  -- Обычные скины (common) - дешевые, для новичков
  ('Classic Bull', 'Bull1.png', 'common', 0, 0, 1, 0, 1, 0, 0, 'Классический бык - стартовый скин', true),
  ('Brown Bull', 'Bull2.png', 'common', 100, 0, 1, 0, 1, 5, 0, 'Коричневый бык с ускоренной регенерацией', true),
  ('Gray Bull', 'Bull3.png', 'common', 150, 0, 2, 0, 1, 0, 5, 'Серый бык с фарм-бонусом', true),

  -- Необычные скины (uncommon) - средние
  ('Golden Horn', 'Bull4.png', 'uncommon', 500, 0, 3, 0, 2, 10, 0, 'Бык с золотыми рогами', true),
  ('Blue Warrior', 'Bull5.png', 'uncommon', 750, 0, 5, 0, 2, 0, 10, 'Синий бык-воин с фарм-бонусом', true),
  ('Red Fighter', 'Bull6.png', 'uncommon', 1000, 0, 7, 0, 3, 15, 0, 'Красный бык-боец с ускоренной регенерацией', true),

  -- Редкие скины (rare) - дорогие
  ('Cyber Bull', 'Bull7.png', 'rare', 2500, 0, 10, 0, 5, 0, 20, 'Кибернетический бык с фарм-бонусом', true),
  ('Dragon Bull', 'Bull8.png', 'rare', 3500, 0, 12, 0, 6, 25, 0, 'Бык-дракон с ускоренной регенерацией', true),
  ('Crystal Bull', 'Bull9.png', 'rare', 5000, 0, 15, 0, 7, 20, 20, 'Кристальный бык с двойным бонусом', true),

  -- Эпические скины (epic) - очень дорогие
  ('Shadow Bull', 'Bull10.png', 'epic', 10000, 0, 20, 5, 10, 30, 30, 'Теневой бык с мощными бонусами', true),
  ('Inferno Bull', 'Bull11.png', 'epic', 15000, 0, 25, 10, 12, 40, 0, 'Адский бык с огромной регенерацией', true),
  ('Ice King Bull', 'Bull12.png', 'epic', 20000, 0, 30, 15, 15, 0, 50, 'Ледяной король-бык с максимальным фармом', true),

  -- Легендарные скины (legendary) - самые редкие
  ('Cosmic Bull', 'Bull13.png', 'legendary', 50000, 0, 40, 25, 25, 50, 50, 'Космический бык с балансом всех бонусов', true),
  ('Divine Bull', 'Bull14.png', 'legendary', 75000, 0, 50, 50, 30, 75, 0, 'Божественный бык с невероятной регенерацией', true),
  ('Ultimate Bull', 'Bull15.png', 'legendary', 100000, 0, 100, 100, 50, 0, 100, 'Абсолютный бык с максимальным фармом', true)

ON CONFLICT (id) DO NOTHING;

-- Проверка что скины добавлены
SELECT id, name, rarity, price_bul, level_req, is_active FROM skins ORDER BY id;

-- Количество скинов по редкости
SELECT rarity, COUNT(*) as count FROM skins GROUP BY rarity ORDER BY
  CASE rarity
    WHEN 'common' THEN 1
    WHEN 'uncommon' THEN 2
    WHEN 'rare' THEN 3
    WHEN 'epic' THEN 4
    WHEN 'legendary' THEN 5
  END;
