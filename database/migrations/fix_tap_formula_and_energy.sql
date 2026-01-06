-- ====================================
-- ИСПРАВЛЕНИЯ: ФОРМУЛА ТАПА И ЭНЕРГИЯ
-- ====================================

-- ЗАДАЧА 1: Исправить формулу тапа в process_bull_tap
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

  -- Получить tap_bonus из активного скина
  IF v_user.active_skin_id IS NOT NULL THEN
    SELECT COALESCE(s.tap_bonus, 0) INTO v_skin_bonus
    FROM skins s
    WHERE s.id = v_user.active_skin_id;
  END IF;

  -- Рассчитать стоимость энергии
  v_energy_cost := p_taps;

  -- Проверить энергию
  IF v_user.energy < v_energy_cost THEN
    RAISE EXCEPTION 'Not enough energy';
  END IF;

  -- Награда = tap_power + бонус скина
  v_bul_earned := p_taps * (COALESCE(v_user.tap_power, 1) + COALESCE(v_skin_bonus, 0));

  -- Обновить пользователя
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

-- ЗАДАЧА 2: Исправить энергию админа
UPDATE users
SET energy = 1000, energy_max = 1000
WHERE telegram_id = 190202791;

-- Проверка 1: Посмотреть данные админа
SELECT telegram_id, energy, energy_max, tap_power, active_skin_id, balance_bul
FROM users
WHERE telegram_id = 190202791;

-- Проверка 2: Тестовый тап (должен заработать tap_power + tap_bonus скина)
-- Если active_skin_id = 1 (Юзер с tap_bonus = 1), то за 1 тап будет: 1 + 1 = 2 BUL
SELECT * FROM process_bull_tap(190202791, 1);
