-- FIX: buy_giveaway_ticket_v2 type casting

CREATE OR REPLACE FUNCTION buy_giveaway_ticket_v2(
  p_telegram_id text,
  p_giveaway_id uuid,
  p_count integer
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_balance_ar numeric;
  v_ticket_price numeric;
  v_total_cost numeric;
  v_jackpot_part numeric;
  v_percent integer;
  v_max_ticket_num integer;
  v_i integer;
  v_is_new_participant boolean;
BEGIN
  -- 1. Получаем данные пользователя (FIX: cast text to bigint)
  SELECT id, balance_ar INTO v_user_id, v_balance_ar
  FROM users WHERE telegram_id = p_telegram_id::bigint;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  -- 2. Получаем данные розыгрыша
  SELECT price, jackpot_percentage
  INTO v_ticket_price, v_percent
  FROM giveaways WHERE id = p_giveaway_id AND status = 'active';

  IF v_ticket_price IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Giveaway not found or not active');
  END IF;

  -- 3. Рассчитываем стоимость
  v_total_cost := v_ticket_price * p_count;

  -- 4. Проверка баланса
  IF v_balance_ar < v_total_cost THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient funds');
  END IF;

  -- 5. Проверяем, новый ли это участник
  SELECT NOT EXISTS (
    SELECT 1 FROM giveaway_tickets
    WHERE giveaway_id = p_giveaway_id AND user_id = p_telegram_id::bigint
  ) INTO v_is_new_participant;

  -- 6. Списание баланса
  UPDATE users
  SET balance_ar = balance_ar - v_total_cost
  WHERE id = v_user_id;

  -- 7. Расчет и пополнение джекпота
  v_jackpot_part := v_total_cost * (COALESCE(v_percent, 50)::numeric / 100);

  UPDATE giveaways
  SET
    jackpot_current_amount = COALESCE(jackpot_current_amount, 0) + v_jackpot_part,
    total_tickets_sold = COALESCE(total_tickets_sold, 0) + p_count,
    total_participants = COALESCE(total_participants, 0) + (CASE WHEN v_is_new_participant THEN 1 ELSE 0 END)
  WHERE id = p_giveaway_id;

  -- 8. Генерация билетов
  SELECT COALESCE(MAX(ticket_number), 0)
  INTO v_max_ticket_num
  FROM giveaway_tickets
  WHERE giveaway_id = p_giveaway_id;

  FOR v_i IN 1..p_count LOOP
    INSERT INTO giveaway_tickets (giveaway_id, user_id, ticket_number)
    VALUES (p_giveaway_id, p_telegram_id::bigint, v_max_ticket_num + v_i);
  END LOOP;

  -- 9. Запись транзакции
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (
    v_user_id,
    'buy_giveaway',
    -v_total_cost,
    'Buy ' || p_count || ' ticket(s) for giveaway'
  );

  -- 10. Возврат результата
  RETURN json_build_object(
    'success', true,
    'new_balance', v_balance_ar - v_total_cost,
    'tickets_purchased', p_count,
    'jackpot_contribution', v_jackpot_part
  );
END;
$$;
