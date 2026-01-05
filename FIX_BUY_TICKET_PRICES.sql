-- FIX: Read ticket price from new 'prices' field instead of deprecated 'price'
-- Admin saves to prices: {ar: 1000}, but function was reading from price

CREATE OR REPLACE FUNCTION buy_giveaway_ticket_v2(
  p_telegram_id text,
  p_giveaway_id text,
  p_count integer
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_balance_ar numeric;
  v_balance_bul numeric;
  v_ticket_price numeric;
  v_currency text;
  v_total_cost numeric;
  v_jackpot_part numeric;
  v_percent integer;
  v_max_ticket_num integer;
  v_i integer;
  v_is_new_participant boolean;
BEGIN
  -- 1. Identify User
  SELECT id, balance_ar, balance_bul INTO v_user_id, v_balance_ar, v_balance_bul
  FROM users WHERE telegram_id = p_telegram_id::bigint;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  -- 2. Identify Giveaway - READ FROM NEW 'prices' FIELD
  -- Priority: prices.ar -> prices.bul -> deprecated price field
  SELECT
    COALESCE(
      (prices->>'ar')::numeric,
      (prices->>'bul')::numeric,
      price,
      0
    ),
    CASE
      WHEN prices->>'ar' IS NOT NULL THEN 'ar'
      WHEN prices->>'bul' IS NOT NULL THEN 'bul'
      ELSE COALESCE(currency, 'ar')
    END,
    jackpot_percentage
  INTO v_ticket_price, v_currency, v_percent
  FROM giveaways WHERE id::text = p_giveaway_id::text AND status = 'active';

  IF v_ticket_price IS NULL OR v_ticket_price = 0 THEN
    RETURN json_build_object('success', false, 'message', 'Giveaway not found, not active, or has no price');
  END IF;

  -- 3. Calc Cost
  v_total_cost := v_ticket_price * p_count;

  -- 4. Check Balance based on currency
  IF v_currency = 'ar' THEN
    IF v_balance_ar < v_total_cost THEN
      RETURN json_build_object('success', false, 'message', 'Insufficient AR funds');
    END IF;
  ELSE
    IF v_balance_bul < v_total_cost THEN
      RETURN json_build_object('success', false, 'message', 'Insufficient BUL funds');
    END IF;
  END IF;

  -- 5. Check New Participant
  SELECT NOT EXISTS (
    SELECT 1 FROM giveaway_tickets
    WHERE giveaway_id = p_giveaway_id::text
    AND user_id = p_telegram_id::bigint
  ) INTO v_is_new_participant;

  -- 6. Deduct Balance based on currency
  IF v_currency = 'ar' THEN
    UPDATE users
    SET balance_ar = balance_ar - v_total_cost
    WHERE id = v_user_id;
  ELSE
    UPDATE users
    SET balance_bul = balance_bul - v_total_cost
    WHERE id = v_user_id;
  END IF;

  -- 7. Update Giveaway Stats
  v_jackpot_part := v_total_cost * (COALESCE(v_percent, 50)::numeric / 100);

  UPDATE giveaways
  SET
    jackpot_current_amount = COALESCE(jackpot_current_amount, 0) + v_jackpot_part,
    total_tickets_sold = COALESCE(total_tickets_sold, 0) + p_count,
    total_participants = COALESCE(total_participants, 0) + (CASE WHEN v_is_new_participant THEN 1 ELSE 0 END)
  WHERE id::text = p_giveaway_id::text;

  -- 8. Generate Tickets
  SELECT COALESCE(MAX(ticket_number), 0)
  INTO v_max_ticket_num
  FROM giveaway_tickets
  WHERE giveaway_id = p_giveaway_id::text;

  FOR v_i IN 1..p_count LOOP
    INSERT INTO giveaway_tickets (giveaway_id, user_id, ticket_number)
    VALUES (
      p_giveaway_id::text,
      p_telegram_id::bigint,
      v_max_ticket_num + v_i
    );
  END LOOP;

  -- 9. Log Transaction
  INSERT INTO transactions (user_id, type, amount, currency, description)
  VALUES (
    v_user_id,
    'buy_giveaway',
    -v_total_cost,
    v_currency,
    'Buy ' || p_count || ' ticket(s) for giveaway'
  );

  RETURN json_build_object(
    'success', true,
    'new_balance', CASE WHEN v_currency = 'ar' THEN v_balance_ar - v_total_cost ELSE v_balance_bul - v_total_cost END,
    'currency', v_currency,
    'tickets_purchased', p_count,
    'price_per_ticket', v_ticket_price
  );
END;
$$;
