-- ====================================
-- ОБНОВЛЕНИЕ ТАБЛИЦЫ SKINS
-- ====================================
-- Задача: Полное обновление таблицы с 15 персонажами
-- 12 BUL персонажей + 3 AR персонажа
-- ====================================

-- ШАГ 1: Очистить таблицу
TRUNCATE TABLE skins RESTART IDENTITY CASCADE;

-- ШАГ 2: Вставить 15 персонажей
INSERT INTO skins (name, file, rarity, tap_bonus, regen_bonus, farm_bonus, price_bul, price_ar, is_active, skin_type) VALUES
-- BUL персонажи (12 шт)
('Юзер', 'bull1.png', 'default', 1, 0, 0, 0, 0, true, 'bul'),
('Геймер', 'bull2.png', 'common', 2, 0, 0, 1500, 0, true, 'bul'),
('Спортсмен', 'bull3.png', 'common', 2, 0, 0, 2000, 0, true, 'bul'),
('Рэпер', 'bull4.png', 'common', 2, 0, 0, 2500, 0, true, 'bul'),
('Программист', 'bull5.png', 'uncommon', 3, 0, 0, 4000, 0, true, 'bul'),
('Дизайнер', 'bull6.png', 'uncommon', 3, 0, 0, 5000, 0, true, 'bul'),
('Юрист', 'bull7.png', 'uncommon', 3, 0, 0, 6000, 0, true, 'bul'),
('Политик', 'bull8.png', 'rare', 4, 10, 0, 10000, 0, true, 'bul'),
('Банкир', 'bull9.png', 'rare', 4, 10, 0, 15000, 0, true, 'bul'),
('Мафиози', 'bull10.png', 'rare', 4, 10, 0, 20000, 0, true, 'bul'),
('Олигарх', 'bull11.png', 'epic', 6, 15, 10, 35000, 0, true, 'bul'),
('Криптан', 'bull15.png', 'legendary', 10, 25, 20, 100000, 0, true, 'bul'),
-- AR персонажи (3 шт)
('Чемпион UFC', 'bull12.png', 'epic', 6, 15, 10, 0, 1000, true, 'ar'),
('Локи', 'bull13.png', 'epic', 6, 15, 10, 0, 1500, true, 'ar'),
('ВДВшник', 'bull14.png', 'legendary', 10, 25, 20, 0, 5000, true, 'ar');

-- ШАГ 3: Проверка результата
SELECT id, name, file, rarity, price_bul, price_ar, skin_type
FROM skins ORDER BY id;

-- Подсчет количества записей
SELECT
  COUNT(*) as total_skins,
  SUM(CASE WHEN skin_type = 'bul' THEN 1 ELSE 0 END) as bul_skins,
  SUM(CASE WHEN skin_type = 'ar' THEN 1 ELSE 0 END) as ar_skins
FROM skins;
