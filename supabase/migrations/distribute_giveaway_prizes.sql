-- ====================================================================
-- AR ARENA: Distribute Giveaway Prizes
-- Дата: 2025-12-27
-- ====================================================================
-- ОПИСАНИЕ:
-- 1. Функция distribute_giveaway_prizes - начисляет призы победителям
-- 2. Функция run_giveaway_draw - комбинирует генерацию + выплату
-- 3. Функция check_and_run_expired_giveaways - для автозапуска
-- ====================================================================

BEGIN;

-- ====================================================================
-- STEP 1: Добавляем флаг для защиты от двойной выплаты
-- ====================================================================
ALTER TABLE giveaways
ADD COLUMN IF NOT EXISTS prizes_distributed BOOLEAN DEFAULT false;

-- ====================================================================
-- STEP 2: Функция выплаты призов победителям
-- ====================================================================
CREATE OR REPLACE FUNCTION distribute_giveaway_prizes(p_giveaway_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_giveaway RECORD;
  v_winner_telegram_id TEXT;
  v_winner_user RECORD;
  v_prize_config JSONB;
  v_prize_amount NUMERIC;
  v_prize_percentage NUMERIC;
  v_total_prize NUMERIC;
  v_jackpot NUMERIC;
  v_currency TEXT;
  v_place INTEGER;
  v_prizes_paid JSONB := '[]'::JSONB;
  v_total_paid NUMERIC := 0;
BEGIN
  -- 1. Получаем розыгрыш
  SELECT * INTO v_giveaway FROM giveaways WHERE id = p_giveaway_id;

  IF v_giveaway IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Giveaway not found');
  END IF;

  -- 2. Проверяем что розыгрыш завершён
  IF v_giveaway.status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Giveaway not completed yet');
  END IF;

  -- 3. Защита от двойной выплаты
  IF v_giveaway.prizes_distributed = true THEN
    RETURN jsonb_build_object('success', false, 'error', 'Prizes already distributed');
  END IF;

  -- 4. Проверяем наличие победителей
  IF v_giveaway.winners IS NULL OR array_length(v_giveaway.winners, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No winners found');
  END IF;

  -- 5. Получаем данные для расчёта
  v_jackpot := COALESCE(v_giveaway.jackpot_current_amount, 0);
  v_currency := COALESCE(v_giveaway.currency, 'ar');

  -- 6. Выплачиваем каждому победителю
  FOR v_place IN 1..array_length(v_giveaway.winners, 1) LOOP
    v_winner_telegram_id := v_giveaway.winners[v_place];

    -- Получаем пользователя по telegram_id
    SELECT * INTO v_winner_user FROM users
    WHERE telegram_id = v_winner_telegram_id;

    IF v_winner_user IS NULL THEN
      -- Пропускаем если пользователь не найден (маловероятно)
      CONTINUE;
    END IF;

    -- Ищем конфигурацию приза для этого места
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

    -- Рассчитываем итоговый приз
    v_total_prize := v_prize_amount + (v_jackpot * v_prize_percentage / 100);

    -- Если приз = 0, пропускаем
    IF v_total_prize <= 0 THEN
      CONTINUE;
    END IF;

    -- Начисляем приз на баланс
    IF v_currency = 'ar' THEN
      UPDATE users
      SET balance_ar = COALESCE(balance_ar, 0) + v_total_prize
      WHERE id = v_winner_user.id;
    ELSE
      UPDATE users
      SET balance_bul = COALESCE(balance_bul, 0) + v_total_prize
      WHERE id = v_winner_user.id;
    END IF;

    -- Записываем транзакцию
    INSERT INTO transactions (user_id, type, amount, description)
    VALUES (
      v_winner_user.id,
      'giveaway_win',
      v_total_prize,
      'Giveaway win: place ' || v_place || ' in "' || v_giveaway.title || '"'
    );

    -- Добавляем в отчёт
    v_prizes_paid := v_prizes_paid || jsonb_build_object(
      'place', v_place,
      'telegram_id', v_winner_telegram_id,
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

  -- 7. Отмечаем что призы выплачены
  UPDATE giveaways
  SET prizes_distributed = true
  WHERE id = p_giveaway_id;

  -- 8. Возвращаем отчёт
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

-- ====================================================================
-- STEP 3: Комбинированная функция - генерация + выплата
-- ====================================================================
CREATE OR REPLACE FUNCTION run_giveaway_draw(p_giveaway_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_generate_result JSONB;
  v_distribute_result JSONB;
BEGIN
  -- 1. Генерируем результаты розыгрыша
  v_generate_result := generate_giveaway_result(p_giveaway_id);

  -- Если генерация не удалась, возвращаем ошибку
  IF NOT (v_generate_result->>'success')::boolean THEN
    RETURN v_generate_result;
  END IF;

  -- 2. Выплачиваем призы
  v_distribute_result := distribute_giveaway_prizes(p_giveaway_id);

  -- 3. Возвращаем комбинированный результат
  RETURN jsonb_build_object(
    'success', true,
    'draw', v_generate_result,
    'prizes', v_distribute_result
  );
END;
$$;

-- ====================================================================
-- STEP 4: Функция для автозапуска просроченных розыгрышей
-- ====================================================================
CREATE OR REPLACE FUNCTION check_and_run_expired_giveaways()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_giveaway RECORD;
  v_result JSONB;
  v_results JSONB := '[]'::JSONB;
  v_processed INTEGER := 0;
BEGIN
  -- Находим все активные розыгрыши с истёкшим end_date
  FOR v_giveaway IN
    SELECT id, title, end_date
    FROM giveaways
    WHERE status = 'active'
      AND end_date <= NOW()
      AND prizes_distributed = false
    ORDER BY end_date ASC
  LOOP
    -- Запускаем розыгрыш
    v_result := run_giveaway_draw(v_giveaway.id);

    v_results := v_results || jsonb_build_object(
      'giveaway_id', v_giveaway.id,
      'title', v_giveaway.title,
      'result', v_result
    );

    v_processed := v_processed + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed_count', v_processed,
    'results', v_results,
    'checked_at', now()
  );
END;
$$;

COMMIT;

-- ====================================================================
-- КАК ИСПОЛЬЗОВАТЬ:
-- ====================================================================
--
-- 1. Ручной запуск розыгрыша из админки:
--    SELECT run_giveaway_draw('uuid-розыгрыша');
--
-- 2. Только выплата призов (если уже завершён):
--    SELECT distribute_giveaway_prizes('uuid-розыгрыша');
--
-- 3. Автоматическая проверка просроченных (вызывать из cron/Edge Function):
--    SELECT check_and_run_expired_giveaways();
--
-- ====================================================================
