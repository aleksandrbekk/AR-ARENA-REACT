-- AR Bank (Vault) Tables and Functions
-- Migration: 20260102_vault_tables.sql

-- ============================================
-- ТАБЛИЦА СОСТОЯНИЯ ИГРОКА
-- ============================================
CREATE TABLE IF NOT EXISTS vault_state (
  user_id BIGINT PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE,
  last_claim_date DATE,                    -- Дата последнего получения отмычки
  last_open_date DATE,                     -- Дата последнего открытия сундука
  streak INT DEFAULT 0,                    -- Серия дней подряд
  lockpick_available BOOLEAN DEFAULT FALSE, -- Есть ли неиспользованная отмычка
  total_opened INT DEFAULT 0,              -- Всего открыто сундуков
  total_earned INT DEFAULT 0,              -- Всего заработано AR
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ИСТОРИЯ ОТКРЫТИЙ
-- ============================================
CREATE TABLE IF NOT EXISTS vault_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
  reward_amount INT NOT NULL,              -- Награда (базовая)
  reward_rarity TEXT NOT NULL,             -- common/uncommon/rare/legendary/epic
  streak_at_open INT DEFAULT 0,            -- Streak на момент открытия
  streak_multiplier NUMERIC(3,2) DEFAULT 1.0, -- Множитель streak
  final_amount INT NOT NULL,               -- Финальная награда (с множителем)
  chest_index INT DEFAULT 0,               -- Какой сундук открыли (0-4)
  is_golden BOOLEAN DEFAULT FALSE,         -- Был ли это golden chest
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрого поиска истории пользователя
CREATE INDEX IF NOT EXISTS idx_vault_history_user_id ON vault_history(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_history_created_at ON vault_history(created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE vault_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_history ENABLE ROW LEVEL SECURITY;

-- Политики для vault_state
DROP POLICY IF EXISTS "Users can read own vault state" ON vault_state;
CREATE POLICY "Users can read own vault state"
  ON vault_state FOR SELECT
  USING (true); -- Открытый доступ на чтение (фильтрация по user_id в RPC)

DROP POLICY IF EXISTS "Service can manage vault state" ON vault_state;
CREATE POLICY "Service can manage vault state"
  ON vault_state FOR ALL
  USING (true)
  WITH CHECK (true);

-- Политики для vault_history
DROP POLICY IF EXISTS "Users can read own vault history" ON vault_history;
CREATE POLICY "Users can read own vault history"
  ON vault_history FOR SELECT
  USING (true); -- Открытый доступ на чтение (фильтрация по user_id в RPC)

DROP POLICY IF EXISTS "Service can insert vault history" ON vault_history;
CREATE POLICY "Service can insert vault history"
  ON vault_history FOR INSERT
  WITH CHECK (true);

-- ============================================
-- ФУНКЦИЯ: Получить состояние Vault
-- ============================================
CREATE OR REPLACE FUNCTION get_vault_state(p_user_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_state vault_state%ROWTYPE;
  v_history JSON;
  v_can_claim BOOLEAN;
  v_can_open BOOLEAN;
  v_time_to_next TEXT;
BEGIN
  -- Получаем состояние пользователя
  SELECT * INTO v_state FROM vault_state WHERE user_id = p_user_id;
  
  -- Если записи нет - создаём
  IF v_state IS NULL THEN
    INSERT INTO vault_state (user_id) VALUES (p_user_id)
    RETURNING * INTO v_state;
  END IF;
  
  -- Проверяем можно ли получить отмычку (новый день)
  v_can_claim := v_state.last_claim_date IS NULL 
                 OR v_state.last_claim_date < CURRENT_DATE;
  
  -- Проверяем можно ли открыть сундук
  v_can_open := v_state.lockpick_available 
                AND (v_state.last_open_date IS NULL OR v_state.last_open_date < CURRENT_DATE);
  
  -- Получаем последние 10 открытий
  SELECT json_agg(h ORDER BY h.created_at DESC)
  INTO v_history
  FROM (
    SELECT 
      id,
      reward_amount,
      reward_rarity,
      streak_at_open,
      streak_multiplier,
      final_amount,
      is_golden,
      created_at
    FROM vault_history
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 10
  ) h;
  
  -- Рассчитываем время до следующей попытки
  IF NOT v_can_claim AND NOT v_can_open THEN
    v_time_to_next := (CURRENT_DATE + INTERVAL '1 day' - NOW())::TEXT;
  ELSE
    v_time_to_next := NULL;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'state', json_build_object(
      'streak', v_state.streak,
      'lockpick_available', v_state.lockpick_available,
      'last_claim_date', v_state.last_claim_date,
      'last_open_date', v_state.last_open_date,
      'total_opened', v_state.total_opened,
      'total_earned', v_state.total_earned,
      'can_claim', v_can_claim,
      'can_open', v_can_open
    ),
    'history', COALESCE(v_history, '[]'::json),
    'time_to_next', v_time_to_next
  );
END;
$$;

-- ============================================
-- ФУНКЦИЯ: Получить отмычку
-- ============================================
CREATE OR REPLACE FUNCTION claim_vault_lockpick(p_user_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_state vault_state%ROWTYPE;
  v_new_streak INT;
BEGIN
  -- Получаем текущее состояние
  SELECT * INTO v_state FROM vault_state WHERE user_id = p_user_id;
  
  -- Если записи нет - создаём
  IF v_state IS NULL THEN
    INSERT INTO vault_state (user_id) VALUES (p_user_id)
    RETURNING * INTO v_state;
  END IF;
  
  -- Проверяем можно ли получить отмычку сегодня
  IF v_state.last_claim_date = CURRENT_DATE THEN
    RETURN json_build_object(
      'success', false,
      'error', 'already_claimed_today',
      'message', 'Отмычка уже получена сегодня'
    );
  END IF;
  
  -- Проверяем есть ли неоткрытая отмычка
  IF v_state.lockpick_available THEN
    RETURN json_build_object(
      'success', false,
      'error', 'lockpick_unused',
      'message', 'У вас уже есть неиспользованная отмычка'
    );
  END IF;
  
  -- Рассчитываем streak
  IF v_state.last_claim_date = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Продолжаем серию
    v_new_streak := v_state.streak + 1;
  ELSE
    -- Серия прервана, начинаем заново
    v_new_streak := 1;
  END IF;
  
  -- Обновляем состояние
  UPDATE vault_state 
  SET 
    last_claim_date = CURRENT_DATE,
    lockpick_available = TRUE,
    streak = v_new_streak,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'streak', v_new_streak,
    'lockpick_available', true,
    'message', 'Отмычка получена!'
  );
END;
$$;

-- ============================================
-- ФУНКЦИЯ: Открыть сундук
-- ============================================
CREATE OR REPLACE FUNCTION open_vault_chest(
  p_user_id BIGINT,
  p_chest_index INT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_state vault_state%ROWTYPE;
  v_random FLOAT;
  v_reward_amount INT;
  v_reward_rarity TEXT;
  v_streak_multiplier NUMERIC(3,2);
  v_final_amount INT;
  v_is_golden BOOLEAN;
  v_current_balance INT;
BEGIN
  -- Получаем текущее состояние
  SELECT * INTO v_state FROM vault_state WHERE user_id = p_user_id;
  
  IF v_state IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_state',
      'message', 'Нет данных о состоянии'
    );
  END IF;
  
  -- Проверяем есть ли отмычка
  IF NOT v_state.lockpick_available THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_lockpick',
      'message', 'Нет отмычки'
    );
  END IF;
  
  -- Проверяем не открывали ли уже сегодня
  IF v_state.last_open_date = CURRENT_DATE THEN
    RETURN json_build_object(
      'success', false,
      'error', 'already_opened_today',
      'message', 'Сундук уже открыт сегодня'
    );
  END IF;
  
  -- Рассчитываем streak множитель
  CASE
    WHEN v_state.streak >= 7 THEN v_streak_multiplier := 2.0;
    WHEN v_state.streak >= 5 THEN v_streak_multiplier := 1.5;
    WHEN v_state.streak >= 3 THEN v_streak_multiplier := 1.25;
    ELSE v_streak_multiplier := 1.0;
  END CASE;
  
  -- Определяем golden chest (10% шанс)
  v_is_golden := random() < 0.1;
  
  -- Генерируем награду
  v_random := random() * 100;
  
  IF v_is_golden THEN
    -- Golden chest: минимум 50 AR, улучшенные шансы
    CASE
      WHEN v_random <= 50 THEN v_reward_amount := 50; v_reward_rarity := 'rare';
      WHEN v_random <= 85 THEN v_reward_amount := 100; v_reward_rarity := 'legendary';
      ELSE v_reward_amount := 500; v_reward_rarity := 'epic';
    END CASE;
  ELSE
    -- Обычный сундук
    CASE
      WHEN v_random <= 40 THEN v_reward_amount := 10; v_reward_rarity := 'common';
      WHEN v_random <= 70 THEN v_reward_amount := 25; v_reward_rarity := 'uncommon';
      WHEN v_random <= 90 THEN v_reward_amount := 50; v_reward_rarity := 'rare';
      WHEN v_random <= 98 THEN v_reward_amount := 100; v_reward_rarity := 'legendary';
      ELSE v_reward_amount := 500; v_reward_rarity := 'epic';
    END CASE;
  END IF;
  
  -- Применяем множитель
  v_final_amount := CEIL(v_reward_amount * v_streak_multiplier);
  
  -- Записываем в историю
  INSERT INTO vault_history (
    user_id,
    reward_amount,
    reward_rarity,
    streak_at_open,
    streak_multiplier,
    final_amount,
    chest_index,
    is_golden
  ) VALUES (
    p_user_id,
    v_reward_amount,
    v_reward_rarity,
    v_state.streak,
    v_streak_multiplier,
    v_final_amount,
    p_chest_index,
    v_is_golden
  );
  
  -- Обновляем состояние vault
  UPDATE vault_state 
  SET 
    last_open_date = CURRENT_DATE,
    lockpick_available = FALSE,
    total_opened = total_opened + 1,
    total_earned = total_earned + v_final_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Начисляем баланс пользователю
  SELECT ar_balance INTO v_current_balance FROM users WHERE telegram_id = p_user_id;
  
  UPDATE users 
  SET ar_balance = COALESCE(ar_balance, 0) + v_final_amount
  WHERE telegram_id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'reward', json_build_object(
      'base_amount', v_reward_amount,
      'rarity', v_reward_rarity,
      'streak', v_state.streak,
      'multiplier', v_streak_multiplier,
      'final_amount', v_final_amount,
      'is_golden', v_is_golden
    ),
    'new_balance', COALESCE(v_current_balance, 0) + v_final_amount
  );
END;
$$;

-- ============================================
-- GRANTS
-- ============================================
GRANT EXECUTE ON FUNCTION get_vault_state(BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_vault_lockpick(BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION open_vault_chest(BIGINT, INT) TO anon, authenticated;
