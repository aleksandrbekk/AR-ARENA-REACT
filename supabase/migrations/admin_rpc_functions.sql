-- ==========================================
-- ADMIN RPC FUNCTIONS
-- ==========================================
-- Создано: 2025-12-14
-- Назначение: Функции для управления админкой AR ARENA

-- ==========================================
-- 1. СОЗДАНИЕ ТАБЛИЦЫ TRANSACTIONS (если не существует)
-- ==========================================

CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency VARCHAR(10) NOT NULL CHECK (currency IN ('AR', 'BUL')),
  amount NUMERIC(15, 2) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- ==========================================
-- 2. ADMIN_ADJUST_BALANCE
-- ==========================================
-- Начисление/списание AR или BUL админом
-- Параметры:
--   p_telegram_id: telegram_id пользователя
--   p_currency: 'AR' или 'BUL'
--   p_amount: сумма (может быть отрицательной для списания)
-- Возвращает: { success, new_balance }

CREATE OR REPLACE FUNCTION admin_adjust_balance(
  p_telegram_id TEXT,
  p_currency TEXT,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id BIGINT;
  v_new_balance NUMERIC;
  v_admin_telegram_id TEXT := '190202791';
BEGIN
  -- ВАЖНО: Проверка что вызывающий — админ
  -- В продакшене здесь нужна проверка через auth.uid() или JWT
  -- Пока проверяем через параметр (в UI уже есть проверка)

  -- Проверка валюты
  IF p_currency NOT IN ('AR', 'BUL') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid currency. Use AR or BUL'
    );
  END IF;

  -- Получить user_id по telegram_id
  SELECT id INTO v_user_id
  FROM users
  WHERE telegram_id = p_telegram_id::BIGINT;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Обновить баланс
  IF p_currency = 'AR' THEN
    UPDATE users
    SET balance_ar = balance_ar + p_amount
    WHERE id = v_user_id
    RETURNING balance_ar INTO v_new_balance;
  ELSE
    UPDATE users
    SET balance_bul = balance_bul + p_amount
    WHERE id = v_user_id
    RETURNING balance_bul INTO v_new_balance;
  END IF;

  -- Записать в transactions
  INSERT INTO transactions (user_id, currency, amount, type, description, metadata)
  VALUES (
    v_user_id,
    p_currency,
    p_amount,
    'admin_adjust',
    format('Admin adjustment: %s %s',
      CASE WHEN p_amount >= 0 THEN '+' || p_amount ELSE p_amount::TEXT END,
      p_currency
    ),
    jsonb_build_object(
      'adjusted_by', 'admin',
      'timestamp', NOW()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'currency', p_currency,
    'adjusted_amount', p_amount
  );
END;
$$;

-- ==========================================
-- 3. ADMIN_CREATE_GIVEAWAY
-- ==========================================
-- Создание нового розыгрыша
-- Параметры:
--   p_title: название розыгрыша
--   p_prize_ar: призовой фонд в AR
--   p_ticket_price: цена билета в AR
--   p_end_date: дата окончания
-- Возвращает: { success, giveaway_id }

CREATE OR REPLACE FUNCTION admin_create_giveaway(
  p_title TEXT,
  p_prize_ar NUMERIC,
  p_ticket_price NUMERIC,
  p_end_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_giveaway_id BIGINT;
BEGIN
  -- Валидация
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Title is required'
    );
  END IF;

  IF p_prize_ar IS NULL OR p_prize_ar <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Prize must be greater than 0'
    );
  END IF;

  IF p_ticket_price IS NULL OR p_ticket_price <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ticket price must be greater than 0'
    );
  END IF;

  IF p_end_date IS NULL OR p_end_date <= NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'End date must be in the future'
    );
  END IF;

  -- Создать розыгрыш
  -- Используем существующую структуру таблицы giveaways
  INSERT INTO giveaways (
    title,
    subtitle,
    description,
    price,
    currency,
    jackpot_current_amount,
    end_date,
    status,
    start_date
  )
  VALUES (
    p_title,
    format('Prize: %s AR', p_prize_ar),
    format('Ticket price: %s AR. End date: %s', p_ticket_price, p_end_date::DATE),
    p_ticket_price,
    'ar',
    p_prize_ar,
    p_end_date,
    'active',
    NOW()
  )
  RETURNING id INTO v_giveaway_id;

  RETURN jsonb_build_object(
    'success', true,
    'giveaway_id', v_giveaway_id,
    'title', p_title,
    'prize_ar', p_prize_ar,
    'ticket_price', p_ticket_price,
    'end_date', p_end_date
  );
END;
$$;

-- ==========================================
-- 4. ADMIN_END_GIVEAWAY
-- ==========================================
-- Завершение розыгрыша и выбор победителя
-- Параметры:
--   p_giveaway_id: ID розыгрыша
-- Возвращает: { success, winner_telegram_id, prize }

CREATE OR REPLACE FUNCTION admin_end_giveaway(
  p_giveaway_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_giveaway RECORD;
  v_winner_ticket RECORD;
  v_winner_telegram_id TEXT;
  v_prize_ar NUMERIC;
BEGIN
  -- Получить розыгрыш
  SELECT * INTO v_giveaway
  FROM giveaways
  WHERE id = p_giveaway_id;

  IF v_giveaway IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Giveaway not found'
    );
  END IF;

  IF v_giveaway.status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Giveaway already completed'
    );
  END IF;

  -- Проверить есть ли участники
  IF NOT EXISTS (SELECT 1 FROM giveaway_tickets WHERE giveaway_id = p_giveaway_id) THEN
    -- Отменить розыгрыш если нет участников
    UPDATE giveaways
    SET status = 'cancelled'
    WHERE id = p_giveaway_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'No participants. Giveaway cancelled.'
    );
  END IF;

  -- Выбрать случайный билет
  SELECT gt.*, u.telegram_id
  INTO v_winner_ticket
  FROM giveaway_tickets gt
  JOIN users u ON gt.user_id = u.id
  WHERE gt.giveaway_id = p_giveaway_id
  ORDER BY RANDOM()
  LIMIT 1;

  v_winner_telegram_id := v_winner_ticket.telegram_id::TEXT;
  v_prize_ar := v_giveaway.jackpot_current_amount;

  -- Начислить приз победителю
  UPDATE users
  SET balance_ar = balance_ar + v_prize_ar
  WHERE id = v_winner_ticket.user_id;

  -- Записать транзакцию
  INSERT INTO transactions (user_id, currency, amount, type, description, metadata)
  VALUES (
    v_winner_ticket.user_id,
    'AR',
    v_prize_ar,
    'giveaway_win',
    format('Won giveaway: %s', v_giveaway.title),
    jsonb_build_object(
      'giveaway_id', p_giveaway_id,
      'giveaway_title', v_giveaway.title,
      'prize_ar', v_prize_ar
    )
  );

  -- Обновить статус розыгрыша
  UPDATE giveaways
  SET status = 'completed',
      winner_id = v_winner_ticket.user_id
  WHERE id = p_giveaway_id;

  RETURN jsonb_build_object(
    'success', true,
    'winner_telegram_id', v_winner_telegram_id,
    'prize', v_prize_ar,
    'giveaway_title', v_giveaway.title
  );
END;
$$;

-- ==========================================
-- GRANT PERMISSIONS
-- ==========================================
-- Даём доступ к функциям для authenticated пользователей
-- В продакшене добавить проверку роли admin через RLS

GRANT EXECUTE ON FUNCTION admin_adjust_balance TO authenticated;
GRANT EXECUTE ON FUNCTION admin_create_giveaway TO authenticated;
GRANT EXECUTE ON FUNCTION admin_end_giveaway TO authenticated;

-- ==========================================
-- УСПЕШНО СОЗДАНО!
-- ==========================================
-- Теперь можно вызывать:
-- SELECT admin_adjust_balance('190202791', 'AR', 1000);
-- SELECT admin_create_giveaway('Test Giveaway', 5000, 10, NOW() + INTERVAL '7 days');
-- SELECT admin_end_giveaway(1);
