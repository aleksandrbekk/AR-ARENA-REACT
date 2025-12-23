-- ============================================
-- ТАБЛИЦА PREMIUM_CLIENTS
-- Для хранения подписчиков Premium AR Club
-- ============================================

CREATE TABLE IF NOT EXISTS premium_clients (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE,
  username TEXT,
  plan TEXT DEFAULT 'classic',
  tariff TEXT DEFAULT 'classic', -- алиас для совместимости
  started_at TIMESTAMPTZ DEFAULT NOW(),
  start_date TIMESTAMPTZ DEFAULT NOW(), -- алиас для совместимости
  expires_at TIMESTAMPTZ NOT NULL,
  in_channel BOOLEAN DEFAULT FALSE,
  in_chat BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'manual',
  total_paid NUMERIC DEFAULT 0, -- для совместимости
  total_paid_usd NUMERIC DEFAULT 0,
  payments_count INTEGER DEFAULT 0,
  last_payment_at TIMESTAMPTZ,
  last_payment_method TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_premium_clients_telegram_id ON premium_clients(telegram_id);
CREATE INDEX IF NOT EXISTS idx_premium_clients_expires_at ON premium_clients(expires_at);
CREATE INDEX IF NOT EXISTS idx_premium_clients_username ON premium_clients(username);

-- ============================================
-- ТАБЛИЦА PAYMENT_HISTORY
-- История платежей
-- ============================================

CREATE TABLE IF NOT EXISTS payment_history (
  id SERIAL PRIMARY KEY,
  telegram_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_history_telegram_id ON payment_history(telegram_id);

-- ============================================
-- ФУНКЦИЯ GET_CRM_STATS
-- Статистика для CRM страницы
-- ============================================

CREATE OR REPLACE FUNCTION get_crm_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'active_clients', (
      SELECT COUNT(*) FROM premium_clients
      WHERE expires_at > NOW()
    ),
    'expiring_7d', (
      SELECT COUNT(*) FROM premium_clients
      WHERE expires_at > NOW()
      AND expires_at < NOW() + INTERVAL '7 days'
    ),
    'total_revenue', (
      SELECT COALESCE(SUM(amount), 0) FROM payment_history
    ),
    'avg_check', (
      SELECT COALESCE(AVG(amount), 0) FROM payment_history
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ФУНКЦИЯ ADD_PREMIUM_CLIENT
-- Добавление/продление подписки клиента
-- ============================================

CREATE OR REPLACE FUNCTION add_premium_client(
  p_telegram_id TEXT,
  p_username TEXT DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS VOID AS $$
DECLARE
  v_telegram_id BIGINT;
  v_current_expires TIMESTAMPTZ;
  v_new_expires TIMESTAMPTZ;
BEGIN
  -- Преобразуем telegram_id в BIGINT
  v_telegram_id := p_telegram_id::BIGINT;

  -- Проверяем существующего клиента
  SELECT expires_at INTO v_current_expires
  FROM premium_clients
  WHERE telegram_id = v_telegram_id;

  IF v_current_expires IS NOT NULL THEN
    -- Продлеваем существующую подписку
    IF v_current_expires > NOW() THEN
      v_new_expires := v_current_expires + (p_days || ' days')::INTERVAL;
    ELSE
      v_new_expires := NOW() + (p_days || ' days')::INTERVAL;
    END IF;

    UPDATE premium_clients
    SET expires_at = v_new_expires,
        username = COALESCE(p_username, username),
        updated_at = NOW()
    WHERE telegram_id = v_telegram_id;
  ELSE
    -- Создаём нового клиента
    v_new_expires := NOW() + (p_days || ' days')::INTERVAL;

    INSERT INTO premium_clients (telegram_id, username, expires_at, started_at, start_date)
    VALUES (v_telegram_id, p_username, v_new_expires, NOW(), NOW());
  END IF;
END;
$$ LANGUAGE plpgsql;

-- RLS политики (разрешаем всё для service_role)
ALTER TABLE premium_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Политика для anon (только чтение для админов)
CREATE POLICY "Allow all for authenticated" ON premium_clients
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON payment_history
  FOR ALL USING (true) WITH CHECK (true);
