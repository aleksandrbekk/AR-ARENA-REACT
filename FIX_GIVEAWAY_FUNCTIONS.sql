-- FIX: Type casting for user_id/telegram_id

-- STEP 1: Fix generate_giveaway_result
CREATE OR REPLACE FUNCTION generate_giveaway_result(p_giveaway_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_giveaway RECORD;
  v_participants TEXT[];
  v_total_tickets INTEGER;
  v_total_participants INTEGER;
  v_selected_20 TEXT[];
  v_finalists_5 TEXT[];
  v_eliminated_15 TEXT[];
  v_winners TEXT[];
  v_result JSONB;
  v_seed TEXT;
BEGIN
  SELECT * INTO v_giveaway FROM giveaways WHERE id = p_giveaway_id;

  IF v_giveaway IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Giveaway not found');
  END IF;

  IF v_giveaway.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already completed');
  END IF;

  -- user_id in giveaway_tickets is actually telegram_id (bigint)
  SELECT ARRAY_AGG(DISTINCT user_id::TEXT) INTO v_participants
  FROM giveaway_tickets
  WHERE giveaway_id = p_giveaway_id;

  v_total_participants := COALESCE(array_length(v_participants, 1), 0);

  SELECT COUNT(*) INTO v_total_tickets
  FROM giveaway_tickets
  WHERE giveaway_id = p_giveaway_id;

  IF v_total_participants < 5 THEN
    UPDATE giveaways SET status = 'cancelled' WHERE id = p_giveaway_id;
    RETURN jsonb_build_object('success', false, 'error', 'Not enough participants', 'count', v_total_participants);
  END IF;

  v_seed := encode(gen_random_bytes(16), 'hex');

  SELECT ARRAY_AGG(user_id::TEXT ORDER BY random()) INTO v_selected_20
  FROM (SELECT DISTINCT user_id FROM giveaway_tickets WHERE giveaway_id = p_giveaway_id) t
  LIMIT 20;

  v_finalists_5 := (SELECT ARRAY_AGG(x ORDER BY random()) FROM unnest(v_selected_20) x LIMIT 5);
  v_eliminated_15 := ARRAY(SELECT unnest(v_selected_20) EXCEPT SELECT unnest(v_finalists_5));
  v_winners := (SELECT ARRAY_AGG(x ORDER BY random()) FROM unnest(v_finalists_5) x);

  v_result := jsonb_build_object(
    'success', true,
    'generated_at', now(),
    'seed', v_seed,
    'total_participants', v_total_participants,
    'total_tickets', v_total_tickets,
    'stages', jsonb_build_object(
      'qualification', jsonb_build_object('selected_20', v_selected_20),
      'elimination', jsonb_build_object('finalists_5', v_finalists_5, 'eliminated_15', v_eliminated_15),
      'final', jsonb_build_object('winners', v_winners)
    )
  );

  UPDATE giveaways
  SET status = 'completed',
      draw_results = v_result,
      winners = v_winners
  WHERE id = p_giveaway_id;

  RETURN v_result;
END;
$$;

-- STEP 2: Fix distribute_giveaway_prizes with proper type casting
CREATE OR REPLACE FUNCTION distribute_giveaway_prizes(p_giveaway_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_giveaway RECORD;
  v_winner_user_id TEXT;
  v_winner_user RECORD;
  v_prize_amount NUMERIC;
  v_prize_percentage NUMERIC;
  v_total_prize NUMERIC;
  v_jackpot NUMERIC;
  v_currency TEXT;
  v_place INTEGER;
  v_prizes_paid JSONB := '[]'::JSONB;
  v_total_paid NUMERIC := 0;
BEGIN
  SELECT * INTO v_giveaway FROM giveaways WHERE id = p_giveaway_id;

  IF v_giveaway IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Giveaway not found');
  END IF;

  IF v_giveaway.status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Giveaway not completed yet');
  END IF;

  IF v_giveaway.prizes_distributed = true THEN
    RETURN jsonb_build_object('success', false, 'error', 'Prizes already distributed');
  END IF;

  IF v_giveaway.winners IS NULL OR array_length(v_giveaway.winners, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No winners found');
  END IF;

  v_jackpot := COALESCE(v_giveaway.jackpot_current_amount, 0);
  v_currency := COALESCE(v_giveaway.currency, 'ar');

  FOR v_place IN 1..array_length(v_giveaway.winners, 1) LOOP
    v_winner_user_id := v_giveaway.winners[v_place];

    -- FIX: Cast TEXT to BIGINT for telegram_id comparison
    SELECT * INTO v_winner_user FROM users
    WHERE telegram_id = v_winner_user_id::BIGINT;

    IF v_winner_user IS NULL THEN
      CONTINUE;
    END IF;

    v_prize_amount := 0;
    v_prize_percentage := 0;

    IF v_giveaway.prizes IS NOT NULL THEN
      SELECT
        COALESCE((elem->>'amount')::NUMERIC, 0),
        COALESCE((elem->>'percentage')::NUMERIC, 0)
      INTO v_prize_amount, v_prize_percentage
      FROM jsonb_array_elements(v_giveaway.prizes) AS elem
      WHERE (elem->>'place')::INTEGER = v_place;
    END IF;

    v_total_prize := v_prize_amount + (v_jackpot * v_prize_percentage / 100);

    IF v_total_prize <= 0 THEN
      CONTINUE;
    END IF;

    IF v_currency = 'ar' THEN
      UPDATE users
      SET balance_ar = COALESCE(balance_ar, 0) + v_total_prize
      WHERE id = v_winner_user.id;
    ELSE
      UPDATE users
      SET balance_bul = COALESCE(balance_bul, 0) + v_total_prize
      WHERE id = v_winner_user.id;
    END IF;

    INSERT INTO transactions (user_id, type, amount, description)
    VALUES (
      v_winner_user.id,
      'giveaway_win',
      v_total_prize,
      'Giveaway win: place ' || v_place || ' in "' || v_giveaway.title || '"'
    );

    v_prizes_paid := v_prizes_paid || jsonb_build_object(
      'place', v_place,
      'telegram_id', v_winner_user.telegram_id,
      'username', v_winner_user.username,
      'first_name', v_winner_user.first_name,
      'prize_fixed', v_prize_amount,
      'prize_percentage', v_prize_percentage,
      'prize_from_jackpot', (v_jackpot * v_prize_percentage / 100),
      'total_prize', v_total_prize,
      'currency', v_currency
    );

    v_total_paid := v_total_paid + v_total_prize;
  END LOOP;

  UPDATE giveaways
  SET prizes_distributed = true
  WHERE id = p_giveaway_id;

  RETURN jsonb_build_object(
    'success', true,
    'giveaway_id', p_giveaway_id,
    'giveaway_title', v_giveaway.title,
    'jackpot', v_jackpot,
    'currency', v_currency,
    'total_paid', v_total_paid,
    'prizes_paid', v_prizes_paid,
    'distributed_at', now()
  );
END;
$$;

-- DONE!
