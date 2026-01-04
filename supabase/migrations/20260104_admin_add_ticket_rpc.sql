-- ==========================================
-- ADMIN ADD TICKET RPC
-- ==========================================
-- Создано: 2026-01-04
-- Назначение: Функция для ручного добавления билета администратором

CREATE OR REPLACE FUNCTION admin_add_ticket(
  p_giveaway_id UUID,
  p_telegram_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id BIGINT;
  v_giveaway RECORD;
  v_ticket_number TEXT;
  v_ticket_id UUID;
BEGIN
  -- 1. Получаем пользователя
  SELECT id INTO v_user_id
  FROM users
  WHERE telegram_id = p_telegram_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- 2. Проверяем розыгрыш
  SELECT * INTO v_giveaway
  FROM giveaways
  WHERE id = p_giveaway_id;

  IF v_giveaway IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Giveaway not found');
  END IF;

  IF v_giveaway.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Giveaway is not active');
  END IF;

  -- 3. Генерируем уникальный номер билета (простой вариант, можно усложнить)
  -- Формат: G-{giveaway_suffix}-{random_hex}
  v_ticket_number := 'T-' || substring(p_giveaway_id::text, 1, 4) || '-' || encode(gen_random_bytes(3), 'hex');

  -- 4. Добавляем билет
  INSERT INTO giveaway_tickets (
    giveaway_id,
    user_id,
    ticket_number,
    source_type, -- manual
    is_free,     -- true для ручных
    created_at
  )
  VALUES (
    p_giveaway_id,
    v_user_id,
    v_ticket_number,
    'manual_admin',
    true,
    NOW()
  )
  RETURNING id INTO v_ticket_id;

  -- 5. Записываем в лог транзакций (как событие, сумма 0)
  INSERT INTO transactions (
    user_id,
    type,
    amount,
    currency,
    description,
    metadata
  )
  VALUES (
    v_user_id,
    'admin_ticket_grant',
    0,
    'AR',
    format('Admin granted ticket for "%s"', v_giveaway.title),
    jsonb_build_object(
      'giveaway_id', p_giveaway_id,
      'ticket_number', v_ticket_number,
      'granted_by', 'admin'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'ticket_number', v_ticket_number,
    'giveaway_title', v_giveaway.title
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_add_ticket TO authenticated;
