-- ============================================================================
-- AR ARENA - FARM RPC FUNCTIONS
-- ============================================================================
-- Создание RPC функций для системы крипто-фермы
-- Дата: 14.12.2025
-- ============================================================================

-- ============================================================================
-- 1. ДОБАВИТЬ КОЛОНКИ В ТАБЛИЦУ USERS
-- ============================================================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_passive_claim TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS current_farm_location TEXT DEFAULT 'dorm',
ADD COLUMN IF NOT EXISTS farm_collected_weekly NUMERIC DEFAULT 0;

-- ============================================================================
-- 2. ФУНКЦИЯ: get_farm_state
-- Получить состояние фермы пользователя
-- ============================================================================
CREATE OR REPLACE FUNCTION get_farm_state(p_telegram_id BIGINT)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'user_level', u.level,
    'balance_bul', u.balance_bul,
    'last_passive_claim', u.last_passive_claim,
    'current_location', json_build_object(
      'slug', COALESCE(u.current_farm_location, 'dorm'),
      'name', l.name,
      'image', l.image
    ),
    'income_per_hour', (
      SELECT COALESCE(SUM(
        e.base_income * POWER(e.income_multiplier, ue.level - 1)
      ), 0)
      FROM user_equipment ue
      JOIN equipment e ON e.slug = ue.equipment_slug
      WHERE ue.user_id = u.telegram_id
    ),
    'equipment', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'slug', e.slug,
          'name', e.name,
          'icon', e.icon,
          'owned', ue.level IS NOT NULL,
          'current_level', COALESCE(ue.level, 0),
          'max_level', e.max_level,
          'current_income', CASE
            WHEN ue.level IS NOT NULL
            THEN e.base_income * POWER(e.income_multiplier, ue.level - 1)
            ELSE 0
          END,
          'base_price', e.base_price,
          'upgrade_price', CASE
            WHEN ue.level IS NOT NULL AND ue.level < e.max_level
            THEN e.base_price * POWER(e.price_multiplier, ue.level)
            ELSE NULL
          END,
          'location_slug', e.location_slug
        )
        ORDER BY e.sort_order
      ), '[]'::json)
      FROM equipment e
      LEFT JOIN user_equipment ue ON ue.equipment_slug = e.slug AND ue.user_id = u.telegram_id
    ),
    'locations', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'slug', loc.slug,
          'name', loc.name,
          'image', loc.image,
          'price', loc.price,
          'purchased', COALESCE(ul.purchased, loc.slug = 'dorm'),
          'can_purchase', u.level >= loc.required_level
        )
        ORDER BY loc.sort_order
      ), '[]'::json)
      FROM locations loc
      LEFT JOIN user_locations ul ON ul.location_slug = loc.slug AND ul.user_id = u.telegram_id
    )
  ) INTO v_result
  FROM users u
  LEFT JOIN locations l ON l.slug = COALESCE(u.current_farm_location, 'dorm')
  WHERE u.telegram_id = p_telegram_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. ФУНКЦИЯ: claim_farm_income
-- Собрать пассивный доход
-- ============================================================================
CREATE OR REPLACE FUNCTION claim_farm_income(p_telegram_id BIGINT)
RETURNS JSON AS $$
DECLARE
  v_income_per_hour NUMERIC;
  v_elapsed_seconds NUMERIC;
  v_capped_seconds NUMERIC;
  v_claimed_amount NUMERIC;
  v_new_balance NUMERIC;
  v_last_claim TIMESTAMPTZ;
BEGIN
  -- Получить last_passive_claim
  SELECT last_passive_claim INTO v_last_claim
  FROM users
  WHERE telegram_id = p_telegram_id;

  -- Рассчитать доход в час
  SELECT COALESCE(SUM(
    e.base_income * POWER(e.income_multiplier, ue.level - 1)
  ), 0) INTO v_income_per_hour
  FROM user_equipment ue
  JOIN equipment e ON e.slug = ue.equipment_slug
  WHERE ue.user_id = p_telegram_id;

  -- Рассчитать elapsed_seconds
  v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_last_claim));

  -- Ограничить 4 часами (14400 секунд)
  v_capped_seconds := LEAST(v_elapsed_seconds, 14400);

  -- Рассчитать сумму
  v_claimed_amount := FLOOR((v_income_per_hour / 3600) * v_capped_seconds);

  -- Обновить баланс и last_passive_claim
  UPDATE users
  SET
    balance_bul = balance_bul + v_claimed_amount,
    farm_collected_weekly = farm_collected_weekly + v_claimed_amount,
    last_passive_claim = NOW()
  WHERE telegram_id = p_telegram_id
  RETURNING balance_bul INTO v_new_balance;

  RETURN json_build_object(
    'success', true,
    'claimed_amount', v_claimed_amount,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. ФУНКЦИЯ: purchase_location
-- Купить локацию
-- ============================================================================
CREATE OR REPLACE FUNCTION purchase_location(p_telegram_id BIGINT, p_location_slug TEXT)
RETURNS JSON AS $$
DECLARE
  v_price NUMERIC;
  v_balance NUMERIC;
  v_required_level INTEGER;
  v_user_level INTEGER;
  v_purchased BOOLEAN;
  v_new_balance NUMERIC;
BEGIN
  -- Получить данные локации
  SELECT price, required_level INTO v_price, v_required_level
  FROM locations
  WHERE slug = p_location_slug;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Location not found');
  END IF;

  -- Получить данные пользователя
  SELECT balance_bul, level INTO v_balance, v_user_level
  FROM users
  WHERE telegram_id = p_telegram_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Проверить, не куплена ли уже
  SELECT purchased INTO v_purchased
  FROM user_locations
  WHERE user_id = p_telegram_id AND location_slug = p_location_slug;

  IF v_purchased THEN
    RETURN json_build_object('success', false, 'error', 'Already purchased');
  END IF;

  -- Проверить уровень
  IF v_user_level < v_required_level THEN
    RETURN json_build_object('success', false, 'error', 'Level too low');
  END IF;

  -- Проверить баланс
  IF v_balance < v_price THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Списать BUL
  UPDATE users
  SET balance_bul = balance_bul - v_price
  WHERE telegram_id = p_telegram_id
  RETURNING balance_bul INTO v_new_balance;

  -- Добавить локацию
  INSERT INTO user_locations (user_id, location_slug, purchased, purchased_at)
  VALUES (p_telegram_id, p_location_slug, true, NOW())
  ON CONFLICT (user_id, location_slug) DO UPDATE SET purchased = true;

  RETURN json_build_object(
    'success', true,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. ФУНКЦИЯ: switch_location
-- Сменить текущую локацию
-- ============================================================================
CREATE OR REPLACE FUNCTION switch_location(p_telegram_id BIGINT, p_location_slug TEXT)
RETURNS JSON AS $$
DECLARE
  v_purchased BOOLEAN;
BEGIN
  -- Проверить, куплена ли локация (или это 'dorm')
  IF p_location_slug = 'dorm' THEN
    v_purchased := true;
  ELSE
    SELECT purchased INTO v_purchased
    FROM user_locations
    WHERE user_id = p_telegram_id AND location_slug = p_location_slug;
  END IF;

  IF NOT v_purchased THEN
    RETURN json_build_object('success', false, 'error', 'Location not purchased');
  END IF;

  -- Обновить current_farm_location
  UPDATE users
  SET current_farm_location = p_location_slug
  WHERE telegram_id = p_telegram_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. ФУНКЦИЯ: purchase_equipment
-- Купить оборудование
-- ============================================================================
CREATE OR REPLACE FUNCTION purchase_equipment(p_telegram_id BIGINT, p_equipment_slug TEXT)
RETURNS JSON AS $$
DECLARE
  v_base_price NUMERIC;
  v_location_slug TEXT;
  v_balance NUMERIC;
  v_owned BOOLEAN;
  v_location_purchased BOOLEAN;
  v_new_balance NUMERIC;
BEGIN
  -- Получить данные оборудования
  SELECT base_price, location_slug INTO v_base_price, v_location_slug
  FROM equipment
  WHERE slug = p_equipment_slug;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Equipment not found');
  END IF;

  -- Получить баланс пользователя
  SELECT balance_bul INTO v_balance
  FROM users
  WHERE telegram_id = p_telegram_id;

  -- Проверить, не куплено ли уже
  SELECT EXISTS(
    SELECT 1 FROM user_equipment
    WHERE user_id = p_telegram_id AND equipment_slug = p_equipment_slug
  ) INTO v_owned;

  IF v_owned THEN
    RETURN json_build_object('success', false, 'error', 'Already owned');
  END IF;

  -- Проверить, куплена ли нужная локация
  IF v_location_slug = 'dorm' THEN
    v_location_purchased := true;
  ELSE
    SELECT purchased INTO v_location_purchased
    FROM user_locations
    WHERE user_id = p_telegram_id AND location_slug = v_location_slug;
  END IF;

  IF NOT v_location_purchased THEN
    RETURN json_build_object('success', false, 'error', 'Location not purchased');
  END IF;

  -- Проверить баланс
  IF v_balance < v_base_price THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Списать BUL
  UPDATE users
  SET balance_bul = balance_bul - v_base_price
  WHERE telegram_id = p_telegram_id
  RETURNING balance_bul INTO v_new_balance;

  -- Добавить оборудование
  INSERT INTO user_equipment (user_id, equipment_slug, level, purchased_at)
  VALUES (p_telegram_id, p_equipment_slug, 1, NOW());

  RETURN json_build_object(
    'success', true,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. ФУНКЦИЯ: upgrade_equipment
-- Улучшить оборудование
-- ============================================================================
CREATE OR REPLACE FUNCTION upgrade_equipment(p_telegram_id BIGINT, p_equipment_slug TEXT)
RETURNS JSON AS $$
DECLARE
  v_current_level INTEGER;
  v_max_level INTEGER;
  v_base_price NUMERIC;
  v_base_income NUMERIC;
  v_price_multiplier NUMERIC;
  v_income_multiplier NUMERIC;
  v_upgrade_price NUMERIC;
  v_new_income NUMERIC;
  v_balance NUMERIC;
  v_new_balance NUMERIC;
  v_new_level INTEGER;
BEGIN
  -- Получить текущий уровень
  SELECT level INTO v_current_level
  FROM user_equipment
  WHERE user_id = p_telegram_id AND equipment_slug = p_equipment_slug;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Equipment not owned');
  END IF;

  -- Получить данные оборудования
  SELECT max_level, base_price, base_income, price_multiplier, income_multiplier
  INTO v_max_level, v_base_price, v_base_income, v_price_multiplier, v_income_multiplier
  FROM equipment
  WHERE slug = p_equipment_slug;

  -- Проверить max_level
  IF v_current_level >= v_max_level THEN
    RETURN json_build_object('success', false, 'error', 'Max level reached');
  END IF;

  -- Рассчитать цену апгрейда
  v_upgrade_price := FLOOR(v_base_price * POWER(v_price_multiplier, v_current_level));

  -- Получить баланс
  SELECT balance_bul INTO v_balance
  FROM users
  WHERE telegram_id = p_telegram_id;

  IF v_balance < v_upgrade_price THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Списать BUL
  UPDATE users
  SET balance_bul = balance_bul - v_upgrade_price
  WHERE telegram_id = p_telegram_id
  RETURNING balance_bul INTO v_new_balance;

  -- Повысить уровень
  v_new_level := v_current_level + 1;

  UPDATE user_equipment
  SET level = v_new_level
  WHERE user_id = p_telegram_id AND equipment_slug = p_equipment_slug;

  -- Рассчитать новый доход
  v_new_income := v_base_income * POWER(v_income_multiplier, v_new_level - 1);

  RETURN json_build_object(
    'success', true,
    'new_level', v_new_level,
    'new_income', v_new_income,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ГОТОВО! RPC функции созданы.
-- ============================================================================
-- Доступные функции:
--   ✅ get_farm_state(telegram_id) — получить состояние фермы
--   ✅ claim_farm_income(telegram_id) — собрать доход
--   ✅ purchase_location(telegram_id, location_slug) — купить локацию
--   ✅ switch_location(telegram_id, location_slug) — сменить локацию
--   ✅ purchase_equipment(telegram_id, equipment_slug) — купить оборудование
--   ✅ upgrade_equipment(telegram_id, equipment_slug) — улучшить оборудование
-- ============================================================================
