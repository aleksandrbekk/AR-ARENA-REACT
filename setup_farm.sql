-- ====================================
-- НАСТРОЙКА БД ДЛЯ ФЕРМЫ
-- ====================================
-- Задача: Добавить функционал фермы BUL токенов
-- 1. Колонка last_farm_claim в users
-- 2. RPC функция claim_farm
-- ====================================

-- ШАГ 1: Добавить колонку last_farm_claim
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_farm_claim TIMESTAMP DEFAULT NOW();

-- ШАГ 2: Создать RPC функцию claim_farm
CREATE OR REPLACE FUNCTION claim_farm(p_telegram_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
  v_last_claim TIMESTAMP;
  v_farm_bonus INTEGER;
  v_hours FLOAT;
  v_earned INTEGER;
  v_rate INTEGER := 100;
BEGIN
  -- Получить last_farm_claim и farm_bonus активного скина
  SELECT u.last_farm_claim, COALESCE(s.farm_bonus, 0)
  INTO v_last_claim, v_farm_bonus
  FROM users u
  LEFT JOIN skins s ON u.active_skin_id = s.id
  WHERE u.telegram_id = p_telegram_id;

  -- Посчитать часы (максимум 8)
  v_hours := LEAST(EXTRACT(EPOCH FROM (NOW() - v_last_claim)) / 3600, 8);

  -- Посчитать заработок
  v_earned := FLOOR(v_rate * (1 + v_farm_bonus / 100.0) * v_hours);

  -- Начислить и обновить время
  UPDATE users
  SET balance_bul = balance_bul + v_earned,
      last_farm_claim = NOW()
  WHERE telegram_id = p_telegram_id;

  RETURN v_earned;
END;
$$ LANGUAGE plpgsql;

-- ШАГ 3: Проверка - вызвать функцию для тестового пользователя
SELECT claim_farm(190202791::BIGINT) as earned_amount;

-- ШАГ 4: Проверка колонки
SELECT telegram_id, last_farm_claim, balance_bul
FROM users
WHERE telegram_id = 190202791
LIMIT 1;
