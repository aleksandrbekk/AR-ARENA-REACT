-- ====================================
-- ИСПРАВЛЕНИЕ ВСЕЙ ИГРОВОЙ МЕХАНИКИ
-- ====================================

-- ==========================================
-- ЗАДАЧА 1: Исправить энергию у ВСЕХ пользователей
-- ==========================================

-- 1.1 Обновить всех юзеров: 1000 → 100
UPDATE users
SET energy = 100, energy_max = 100
WHERE energy_max = 1000;

-- 1.2 Изменить дефолт в таблице
ALTER TABLE users
ALTER COLUMN energy SET DEFAULT 100;

ALTER TABLE users
ALTER COLUMN energy_max SET DEFAULT 100;

-- ==========================================
-- ЗАДАЧА 2: Исправить формулу тапа в process_bull_tap
-- ==========================================

CREATE OR REPLACE FUNCTION process_bull_tap(
  p_telegram_id BIGINT,
  p_taps INTEGER
)
RETURNS TABLE(
  energy INTEGER,
  energy_max INTEGER,
  balance_bul BIGINT,
  bul_earned INTEGER
) AS $$
DECLARE
  v_user RECORD;
  v_skin_bonus INTEGER := 0;
  v_bul_earned INTEGER;
  v_energy_cost INTEGER;
BEGIN
  -- Получить данные пользователя
  SELECT u.* INTO v_user
  FROM users u
  WHERE u.telegram_id = p_telegram_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Получить tap_bonus от активного скина
  IF v_user.active_skin_id IS NOT NULL THEN
    SELECT COALESCE(s.tap_bonus, 0) INTO v_skin_bonus
    FROM skins s
    WHERE s.id = v_user.active_skin_id;
  END IF;

  -- Рассчитать стоимость энергии (1 тап = 1 энергия)
  v_energy_cost := p_taps;

  -- Проверить энергию
  IF v_user.energy < v_energy_cost THEN
    RAISE EXCEPTION 'Not enough energy';
  END IF;

  -- Награда = базовый tap_power + бонус скина
  -- Юзер (tap_bonus=1) → 1 тап = 1 BUL
  -- Криптан (tap_bonus=10) → 1 тап = 10 BUL
  v_bul_earned := p_taps * (COALESCE(v_user.tap_power, 1) + v_skin_bonus);

  -- Обновить пользователя (БЕЗ логики уровней!)
  UPDATE users
  SET
    energy = GREATEST(energy - v_energy_cost, 0),
    balance_bul = balance_bul + v_bul_earned,
    last_energy_update = NOW()
  WHERE telegram_id = p_telegram_id
  RETURNING
    users.energy,
    users.energy_max,
    users.balance_bul,
    v_bul_earned
  INTO energy, energy_max, balance_bul, bul_earned;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- ЗАДАЧА 3: Исправить buy_skin для обеих валют
-- ==========================================

CREATE OR REPLACE FUNCTION buy_skin(p_telegram_id BIGINT, p_skin_id INTEGER)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_skin RECORD;
BEGIN
  -- Получить пользователя
  SELECT * INTO v_user FROM users WHERE telegram_id = p_telegram_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'USER_NOT_FOUND');
  END IF;

  -- Получить скин
  SELECT * INTO v_skin FROM skins WHERE id = p_skin_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'SKIN_NOT_FOUND');
  END IF;

  -- Проверить что скин ещё не куплен
  IF EXISTS (SELECT 1 FROM user_skins WHERE telegram_id = p_telegram_id AND skin_id = p_skin_id) THEN
    RETURN json_build_object('success', false, 'error', 'ALREADY_OWNED');
  END IF;

  -- Проверить валюту и баланс
  IF v_skin.skin_type = 'ar' THEN
    -- AR скин
    IF v_user.balance_ar < v_skin.price_ar THEN
      RETURN json_build_object('success', false, 'error', 'INSUFFICIENT_AR');
    END IF;

    -- Списать AR
    UPDATE users
    SET balance_ar = balance_ar - v_skin.price_ar
    WHERE telegram_id = p_telegram_id;
  ELSE
    -- BUL скин (по умолчанию)
    IF v_user.balance_bul < v_skin.price_bul THEN
      RETURN json_build_object('success', false, 'error', 'INSUFFICIENT_BUL');
    END IF;

    -- Списать BUL
    UPDATE users
    SET balance_bul = balance_bul - v_skin.price_bul
    WHERE telegram_id = p_telegram_id;
  END IF;

  -- Добавить скин пользователю
  INSERT INTO user_skins (telegram_id, skin_id, is_equipped, purchased_at)
  VALUES (p_telegram_id, p_skin_id, false, NOW());

  RETURN json_build_object(
    'success', true,
    'skin_id', p_skin_id,
    'skin_type', v_skin.skin_type,
    'price_paid', CASE WHEN v_skin.skin_type = 'ar' THEN v_skin.price_ar ELSE v_skin.price_bul END
  );
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- ЗАДАЧА 4: Исправить equip_skin
-- ==========================================

CREATE OR REPLACE FUNCTION equip_skin(p_telegram_id BIGINT, p_skin_id INTEGER)
RETURNS JSON AS $$
DECLARE
  v_old_skin_id INTEGER;
BEGIN
  -- Проверить что скин есть у пользователя
  IF NOT EXISTS (SELECT 1 FROM user_skins WHERE telegram_id = p_telegram_id AND skin_id = p_skin_id) THEN
    RETURN json_build_object('success', false, 'error', 'SKIN_NOT_OWNED');
  END IF;

  -- Получить старый активный скин
  SELECT active_skin_id INTO v_old_skin_id
  FROM users
  WHERE telegram_id = p_telegram_id;

  -- Снять is_equipped со старого скина
  IF v_old_skin_id IS NOT NULL THEN
    UPDATE user_skins
    SET is_equipped = false
    WHERE telegram_id = p_telegram_id AND skin_id = v_old_skin_id;
  END IF;

  -- Установить новый скин как экипированный
  UPDATE user_skins
  SET is_equipped = true
  WHERE telegram_id = p_telegram_id AND skin_id = p_skin_id;

  -- Обновить active_skin_id у пользователя
  UPDATE users
  SET active_skin_id = p_skin_id
  WHERE telegram_id = p_telegram_id;

  RETURN json_build_object(
    'success', true,
    'old_skin_id', v_old_skin_id,
    'new_skin_id', p_skin_id
  );
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- ПРОВЕРКА ВСЕХ ИЗМЕНЕНИЙ
-- ==========================================

-- Проверка 1: Энергия пользователей
SELECT COUNT(*) as total_users,
       AVG(energy) as avg_energy,
       AVG(energy_max) as avg_energy_max
FROM users;

-- Проверка 2: Тестовый тап для админа
-- Должен заработать: tap_power(1) + tap_bonus_скина
SELECT * FROM process_bull_tap(190202791, 1);

-- Проверка 3: Список всех скинов с ценами
SELECT id, name, skin_type, price_bul, price_ar, tap_bonus, farm_bonus
FROM skins
ORDER BY id;

-- Проверка 4: Скины админа
SELECT us.skin_id, s.name, us.is_equipped, s.tap_bonus
FROM user_skins us
JOIN skins s ON s.id = us.skin_id
WHERE us.telegram_id = 190202791;
