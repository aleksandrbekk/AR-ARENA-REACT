-- FIX: buy_giveaway_ticket_v2 robust version with DOUBLE CASTING
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
  -- 1. Identify User (UUID)
  SELECT id, balance_ar INTO v_user_id, v_balance_ar
  FROM users WHERE telegram_id = p_telegram_id::bigint;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  -- 2. Identify Giveaway
  SELECT price, jackpot_percentage
  INTO v_ticket_price, v_percent
  FROM giveaways WHERE id = p_giveaway_id AND status = 'active';

  IF v_ticket_price IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Giveaway not found or not active');
  END IF;

  -- 3. Calc Cost
  v_total_cost := v_ticket_price * p_count;

  -- 4. Check Balance
  IF v_balance_ar < v_total_cost THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient funds');
  END IF;

  -- 5. Check New Participant (Double Casting Fix)
  SELECT NOT EXISTS (
    SELECT 1 FROM giveaway_tickets
    WHERE giveaway_id = p_giveaway_id 
    AND (
      -- SAFE CAST: Cast both sides to text to handle whether user_id is UUID or TEXT
      user_id::text = v_user_id::text 
      OR 
      telegram_id = p_telegram_id::bigint
    )
  ) INTO v_is_new_participant;

  -- 6. Deduct Balance
  UPDATE users
  SET balance_ar = balance_ar - v_total_cost
  WHERE id = v_user_id;

  -- 7. Update Giveaway Stats
  v_jackpot_part := v_total_cost * (COALESCE(v_percent, 50)::numeric / 100);

  UPDATE giveaways
  SET
    jackpot_current_amount = COALESCE(jackpot_current_amount, 0) + v_jackpot_part,
    total_tickets_sold = COALESCE(total_tickets_sold, 0) + p_count,
    total_participants = COALESCE(total_participants, 0) + (CASE WHEN v_is_new_participant THEN 1 ELSE 0 END)
  WHERE id = p_giveaway_id;

  -- 8. Generate Tickets
  SELECT COALESCE(MAX(ticket_number), 0)
  INTO v_max_ticket_num
  FROM giveaway_tickets
  WHERE giveaway_id = p_giveaway_id;

  FOR v_i IN 1..p_count LOOP
    -- INSERT
    INSERT INTO giveaway_tickets (giveaway_id, user_id, telegram_id, ticket_number)
    VALUES (
      p_giveaway_id, 
      v_user_id, -- Keep original type here, Postgres handles assignment cast usually
      p_telegram_id::bigint, 
      v_max_ticket_num + v_i
    );
  END LOOP;

  -- 9. Log Transaction
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (
    v_user_id,
    'buy_giveaway',
    -v_total_cost,
    'Buy ' || p_count || ' ticket(s) for giveaway'
  );

  RETURN json_build_object(
    'success', true,
    'new_balance', v_balance_ar - v_total_cost,
    'tickets_purchased', p_count
  );
END;
$$;
