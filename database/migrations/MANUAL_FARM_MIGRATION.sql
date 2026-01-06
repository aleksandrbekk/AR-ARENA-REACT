-- ============================================================================
-- AR ARENA - FARM RPC FUNCTIONS (MANUAL MIGRATION)
-- ============================================================================
-- ИНСТРУКЦИЯ:
-- 1. Открой https://supabase.com/dashboard/project/syxjkircmiwpnpagznay/sql/new
-- 2. Скопируй этот файл целиком
-- 3. Вставь в SQL Editor
-- 4. Нажми RUN
-- ============================================================================

-- Шаг 1: Добавить колонки в users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_passive_claim TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS current_farm_location TEXT DEFAULT 'dorm',
ADD COLUMN IF NOT EXISTS farm_collected_weekly NUMERIC DEFAULT 0;

-- Шаг 2: Функция switch_location (сменить локацию)
CREATE OR REPLACE FUNCTION switch_location(p_telegram_id BIGINT, p_location_slug TEXT)
RETURNS JSON AS $$
DECLARE
  v_purchased BOOLEAN;
BEGIN
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

  UPDATE users
  SET current_farm_location = p_location_slug
  WHERE telegram_id = p_telegram_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Шаг 3: Функция purchase_location (купить локацию)
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
  SELECT price, required_level INTO v_price, v_required_level
  FROM locations WHERE slug = p_location_slug;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Location not found');
  END IF;

  SELECT balance_bul, level INTO v_balance, v_user_level
  FROM users WHERE telegram_id = p_telegram_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  SELECT purchased INTO v_purchased
  FROM user_locations
  WHERE user_id = p_telegram_id AND location_slug = p_location_slug;

  IF v_purchased THEN
    RETURN json_build_object('success', false, 'error', 'Already purchased');
  END IF;

  IF v_user_level < v_required_level THEN
    RETURN json_build_object('success', false, 'error', 'Level too low');
  END IF;

  IF v_balance < v_price THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  UPDATE users
  SET balance_bul = balance_bul - v_price
  WHERE telegram_id = p_telegram_id
  RETURNING balance_bul INTO v_new_balance;

  INSERT INTO user_locations (user_id, location_slug, purchased, purchased_at)
  VALUES (p_telegram_id, p_location_slug, true, NOW())
  ON CONFLICT (user_id, location_slug) DO UPDATE SET purchased = true;

  RETURN json_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ГОТОВО!
-- ============================================================================
-- Если всё прошло успешно, увидишь "Success. No rows returned"
-- ============================================================================
