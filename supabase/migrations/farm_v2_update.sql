-- ============================================================================
-- AR ARENA - FARM v2 UPDATE
-- ============================================================================
-- Обновление системы фермы: штуки вместо уровней, новая экономика
-- Дата: 06.01.2026
-- ============================================================================

-- ============================================================================
-- 1. ОБНОВИТЬ ЛОКАЦИИ (новые названия и цены)
-- ============================================================================

-- Удалить старые локации
DELETE FROM locations WHERE slug IN ('basement', 'garage', 'warehouse');

-- Обновить/добавить новые локации
INSERT INTO locations (slug, name, image, price, required_level, slots, sort_order) VALUES
('dorm', 'Общага', '/icons/locations/dormitory.png', 0, 1, 5, 1),
('apartment', 'Апартаменты', '/icons/locations/apartment.png', 10000, 5, 5, 2),
('office', 'Офис', '/icons/locations/office.png', 50000, 10, 5, 3),
('datacenter', 'Дата-центр', '/icons/locations/datacenter.png', 200000, 20, 5, 4)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  image = EXCLUDED.image,
  price = EXCLUDED.price,
  required_level = EXCLUDED.required_level,
  slots = EXCLUDED.slots,
  sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- 2. ОБНОВИТЬ ОБОРУДОВАНИЕ (новые цены и доходность)
-- ============================================================================

-- Удалить старое оборудование
DELETE FROM equipment WHERE slug IN ('usb_miner', 'gpu_rig', 'asic', 'server_rack');

-- Добавить новое оборудование с правильными параметрами
-- base_income теперь в AR/час, income_multiplier не используется (штуки вместо уровней)
INSERT INTO equipment (slug, name, icon, base_price, base_income, income_multiplier, price_multiplier, max_level, location_slug, sort_order) VALUES
('usb_miner', 'USB Miner', '/icons/equipment/usb_miner.png', 1000, 0.1, 1, 1, 5, 'dorm', 1),
('gpu_rig', 'GPU Rig', '/icons/equipment/gpu_rig.png', 5000, 0.5, 1, 1, 5, 'apartment', 2),
('asic', 'ASIC Miner', '/icons/equipment/asic.png', 25000, 2, 1, 1, 5, 'office', 3),
('server_rack', 'Server Rack', '/icons/equipment/server_rack.png', 100000, 5, 1, 1, 5, 'datacenter', 4)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  base_price = EXCLUDED.base_price,
  base_income = EXCLUDED.base_income,
  income_multiplier = EXCLUDED.income_multiplier,
  price_multiplier = EXCLUDED.price_multiplier,
  max_level = EXCLUDED.max_level,
  location_slug = EXCLUDED.location_slug,
  sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- 3. ИЗМЕНИТЬ user_equipment: level → quantity
-- ============================================================================

-- Переименовать колонку level в quantity (если ещё не переименована)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_equipment' AND column_name = 'level'
  ) THEN
    ALTER TABLE user_equipment RENAME COLUMN level TO quantity;
  END IF;
END $$;

-- ============================================================================
-- 4. ОБНОВИТЬ RPC: get_farm_state (учёт штук и farm_bonus)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_farm_state(p_telegram_id BIGINT)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_farm_bonus NUMERIC;
BEGIN
  -- Получить farm_bonus от активного скина
  SELECT COALESCE(s.farm_bonus, 0) INTO v_farm_bonus
  FROM users u
  LEFT JOIN skins s ON s.id = u.active_skin_id
  WHERE u.telegram_id = p_telegram_id;

  SELECT json_build_object(
    'user_level', u.level,
    'balance_bul', u.balance_bul,
    'balance_ar', u.balance_ar,
    'last_passive_claim', u.last_passive_claim,
    'farm_bonus', COALESCE(v_farm_bonus, 0),
    'current_location', json_build_object(
      'slug', COALESCE(u.current_farm_location, 'dorm'),
      'name', l.name,
      'image', l.image
    ),
    'income_per_hour', (
      SELECT COALESCE(SUM(e.base_income * ue.quantity), 0) * (1 + COALESCE(v_farm_bonus, 0) / 100.0)
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
          'owned_quantity', COALESCE(ue.quantity, 0),
          'max_quantity', e.max_level,
          'income_per_unit', e.base_income,
          'total_income', COALESCE(ue.quantity, 0) * e.base_income,
          'price', e.base_price,
          'location_slug', e.location_slug,
          'can_buy', (
            COALESCE(ue.quantity, 0) < e.max_level
            AND (
              e.location_slug = 'dorm'
              OR EXISTS (
                SELECT 1 FROM user_locations ul
                WHERE ul.user_id = u.telegram_id
                AND ul.location_slug = e.location_slug
                AND ul.purchased = true
              )
            )
          )
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
          'required_level', loc.required_level,
          'max_slots', loc.slots,
          'purchased', COALESCE(ul.purchased, loc.slug = 'dorm'),
          'is_current', COALESCE(u.current_farm_location, 'dorm') = loc.slug,
          'can_purchase', u.level >= loc.required_level AND u.balance_bul >= loc.price,
          'equipment_count', (
            SELECT COALESCE(SUM(ue2.quantity), 0)
            FROM user_equipment ue2
            JOIN equipment eq ON eq.slug = ue2.equipment_slug
            WHERE ue2.user_id = u.telegram_id AND eq.location_slug = loc.slug
          )
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
-- 5. ОБНОВИТЬ RPC: claim_farm_income (начисление в AR, учёт farm_bonus)
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
  v_farm_bonus NUMERIC;
BEGIN
  -- Получить farm_bonus от активного скина
  SELECT COALESCE(s.farm_bonus, 0) INTO v_farm_bonus
  FROM users u
  LEFT JOIN skins s ON s.id = u.active_skin_id
  WHERE u.telegram_id = p_telegram_id;

  -- Получить last_passive_claim
  SELECT last_passive_claim INTO v_last_claim
  FROM users
  WHERE telegram_id = p_telegram_id;

  -- Рассчитать доход в час (с учётом farm_bonus)
  SELECT COALESCE(SUM(e.base_income * ue.quantity), 0) * (1 + COALESCE(v_farm_bonus, 0) / 100.0)
  INTO v_income_per_hour
  FROM user_equipment ue
  JOIN equipment e ON e.slug = ue.equipment_slug
  WHERE ue.user_id = p_telegram_id;

  -- Рассчитать elapsed_seconds
  v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_last_claim));

  -- Ограничить 4 часами (14400 секунд)
  v_capped_seconds := LEAST(v_elapsed_seconds, 14400);

  -- Рассчитать сумму (теперь в AR!)
  v_claimed_amount := (v_income_per_hour / 3600) * v_capped_seconds;

  -- Обновить баланс AR и last_passive_claim
  UPDATE users
  SET
    balance_ar = balance_ar + v_claimed_amount,
    farm_collected_weekly = farm_collected_weekly + v_claimed_amount,
    last_passive_claim = NOW()
  WHERE telegram_id = p_telegram_id
  RETURNING balance_ar INTO v_new_balance;

  RETURN json_build_object(
    'success', true,
    'claimed_ar', v_claimed_amount,
    'new_balance_ar', v_new_balance,
    'income_per_hour', v_income_per_hour
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. ОБНОВИТЬ RPC: purchase_equipment (покупка штуки, не апгрейд)
-- ============================================================================

CREATE OR REPLACE FUNCTION purchase_equipment(p_telegram_id BIGINT, p_equipment_slug TEXT)
RETURNS JSON AS $$
DECLARE
  v_base_price NUMERIC;
  v_location_slug TEXT;
  v_max_quantity INTEGER;
  v_balance NUMERIC;
  v_current_quantity INTEGER;
  v_location_purchased BOOLEAN;
  v_new_balance NUMERIC;
  v_new_quantity INTEGER;
  v_income_per_unit NUMERIC;
BEGIN
  -- Получить данные оборудования
  SELECT base_price, location_slug, max_level, base_income
  INTO v_base_price, v_location_slug, v_max_quantity, v_income_per_unit
  FROM equipment
  WHERE slug = p_equipment_slug;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Equipment not found');
  END IF;

  -- Получить баланс пользователя
  SELECT balance_bul INTO v_balance
  FROM users
  WHERE telegram_id = p_telegram_id;

  -- Проверить текущее количество
  SELECT COALESCE(quantity, 0) INTO v_current_quantity
  FROM user_equipment
  WHERE user_id = p_telegram_id AND equipment_slug = p_equipment_slug;

  IF v_current_quantity IS NULL THEN
    v_current_quantity := 0;
  END IF;

  -- Проверить лимит
  IF v_current_quantity >= v_max_quantity THEN
    RETURN json_build_object('success', false, 'error', 'Max quantity reached');
  END IF;

  -- Проверить, куплена ли нужная локация
  IF v_location_slug = 'dorm' THEN
    v_location_purchased := true;
  ELSE
    SELECT purchased INTO v_location_purchased
    FROM user_locations
    WHERE user_id = p_telegram_id AND location_slug = v_location_slug;

    IF v_location_purchased IS NULL THEN
      v_location_purchased := false;
    END IF;
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

  -- Добавить/обновить оборудование
  v_new_quantity := v_current_quantity + 1;

  INSERT INTO user_equipment (user_id, equipment_slug, quantity, purchased_at)
  VALUES (p_telegram_id, p_equipment_slug, 1, NOW())
  ON CONFLICT (user_id, equipment_slug) DO UPDATE
  SET quantity = user_equipment.quantity + 1;

  RETURN json_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'new_quantity', v_new_quantity,
    'income_per_unit', v_income_per_unit,
    'total_income', v_new_quantity * v_income_per_unit
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. ОБНОВИТЬ RPC: purchase_location
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
  v_location_name TEXT;
BEGIN
  -- Получить данные локации
  SELECT price, required_level, name INTO v_price, v_required_level, v_location_name
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
    RETURN json_build_object('success', false, 'error', 'Level too low', 'required_level', v_required_level);
  END IF;

  -- Проверить баланс
  IF v_balance < v_price THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance', 'required', v_price, 'current', v_balance);
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
    'new_balance', v_new_balance,
    'location_name', v_location_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. ДОБАВИТЬ get_farm_status (алиас для совместимости с текущим кодом)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_farm_status(p_telegram_id BIGINT)
RETURNS JSON AS $$
DECLARE
  v_state JSON;
  v_accumulated NUMERIC;
  v_hours_since NUMERIC;
  v_income_per_hour NUMERIC;
BEGIN
  -- Получить полное состояние
  v_state := get_farm_state(p_telegram_id);

  -- Рассчитать накопленное
  v_income_per_hour := (v_state->>'income_per_hour')::NUMERIC;

  SELECT EXTRACT(EPOCH FROM (NOW() - last_passive_claim)) / 3600.0
  INTO v_hours_since
  FROM users
  WHERE telegram_id = p_telegram_id;

  -- Ограничить 4 часами
  v_hours_since := LEAST(v_hours_since, 4);
  v_accumulated := v_income_per_hour * v_hours_since;

  RETURN json_build_object(
    'location_name', v_state->'current_location'->>'name',
    'location_image', v_state->'current_location'->>'image',
    'income_per_hour', v_income_per_hour,
    'accumulated_ar', v_accumulated,
    'hours_since_claim', v_hours_since,
    'max_hours', 4,
    'farm_bonus', (v_state->>'farm_bonus')::NUMERIC
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ГОТОВО!
-- ============================================================================
-- Обновлённые функции:
--   ✅ get_farm_state — полное состояние фермы
--   ✅ get_farm_status — краткий статус для UI
--   ✅ claim_farm_income — сбор дохода (теперь в AR!)
--   ✅ purchase_equipment — покупка штуки оборудования
--   ✅ purchase_location — покупка локации
--   ✅ switch_location — смена локации (без изменений)
--
-- Новая экономика:
--   Общага (0 BUL) → USB Miner (1000 BUL, 0.1 AR/час) × 5 шт
--   Апартаменты (10k BUL) → GPU Rig (5000 BUL, 0.5 AR/час) × 5 шт
--   Офис (50k BUL) → ASIC (25000 BUL, 2 AR/час) × 5 шт
--   Дата-центр (200k BUL) → Server Rack (100k BUL, 5 AR/час) × 5 шт
--
-- Максимум: 38 AR/час = 912 AR/день (без farm_bonus)
-- ============================================================================
