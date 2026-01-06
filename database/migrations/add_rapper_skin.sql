-- Добавление скина "Рэпер" в таблицу skins
INSERT INTO skins (name, file, rarity, tap_bonus, regen_bonus, farm_bonus, price_bul, price_ar, level_req, is_active, skin_type, description)
VALUES ('Рэпер', 'rapper.png', 'common', 2, 0, 0, 2500, 0, 1, true, 'bul', 'Читает биты');

-- Проверка результата
SELECT id, name, rarity, price_bul, price_ar, skin_type
FROM skins
ORDER BY id;
