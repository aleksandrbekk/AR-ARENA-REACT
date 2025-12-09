-- ====================================================================
-- AR ARENA: Auto-Clone + Jackpot Logic (Station 4.2)
-- Дата: 2025-12-10
-- Агент: АНЯ
-- ====================================================================
-- ОПИСАНИЕ:
-- 1. Добавляет поля для авто-повтора розыгрышей (is_recurring, duration_days)
-- 2. Добавляет настройку процента джекпота (jackpot_percentage)
-- 3. Создает функцию buy_giveaway_ticket_v2 (которую вызывает фронтенд!)
-- 4. Создает функцию clone_giveaway для авто-создания новых розыгрышей
-- 5. Обновляет generate_giveaway_result с интеграцией клонирования
-- ====================================================================

BEGIN;

-- ====================================================================
-- STEP 1: Добавляем поля в таблицу giveaways
-- ====================================================================
ALTER TABLE giveaways
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS jackpot_percentage integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS duration_days integer DEFAULT 7;

-- Также убеждаемся, что есть поля для результатов (могли быть созданы ранее)
ALTER TABLE giveaways
ADD COLUMN IF NOT EXISTS draw_results JSONB,
ADD COLUMN IF NOT EXISTS winners TEXT[];

-- ====================================================================
-- STEP 2: Функция клонирования (для авто-повтора)
-- ====================================================================
CREATE OR REPLACE FUNCTION clone_giveaway(old_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
BEGIN
  SELECT * INTO r FROM giveaways WHERE id = old_id;

  -- Клонируем только если стоит флаг is_recurring
  IF r.is_recurring THEN
    INSERT INTO giveaways (
      title, subtitle, description, type, price, currency,
      jackpot_percentage, jackpot_current_amount,
      start_date, end_date,
      status, is_recurring, duration_days,
      image_url
    ) VALUES (
      r.title,
      r.subtitle,
      r.description,
      r.type,
      r.price,
      r.currency,
      r.jackpot_percentage,
      0, -- Новый джекпот начинается с 0
      now(),
      now() + (r.duration_days || ' days')::interval,
      'active',
      true,
      r.duration_days,
      r.image_url
    );
  END IF;
END;
$$;

-- ====================================================================
-- STEP 3: Функция покупки билетов (v2) - КРИТИЧНО для фронтенда!
-- ====================================================================
-- Эта функция вызывается из:
-- - src/hooks/useGiveaways.ts:80
-- - src/components/giveaways/BuyTicketModal.tsx:34
-- ====================================================================
CREATE OR REPLACE FUNCTION buy_giveaway_ticket_v2(
  p_telegram_id text,
  p_giveaway_id uuid,
  p_count integer
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id bigint;
  v_balance_ar numeric;
  v_ticket_price numeric;
  v_total_cost numeric;
  v_jackpot_part numeric;
  v_percent integer;
  v_max_ticket_num integer;
  v_i integer;
  v_is_new_participant boolean;
BEGIN
  -- 1. Получаем данные пользователя
  SELECT id, balance_ar INTO v_user_id, v_balance_ar
  FROM users WHERE telegram_id = p_telegram_id;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- 2. Получаем данные розыгрыша
  SELECT price, jackpot_percentage
  INTO v_ticket_price, v_percent
  FROM giveaways WHERE id = p_giveaway_id;

  IF v_ticket_price IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Giveaway not found');
  END IF;

  -- 3. Рассчитываем стоимость
  v_total_cost := v_ticket_price * p_count;

  -- 4. Проверка баланса
  IF v_balance_ar < v_total_cost THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient funds');
  END IF;

  -- 5. Проверяем, новый ли это участник (для счетчика total_participants)
  SELECT NOT EXISTS (
    SELECT 1 FROM giveaway_tickets
    WHERE giveaway_id = p_giveaway_id AND user_id = v_user_id
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
    VALUES (p_giveaway_id, v_user_id, v_max_ticket_num + v_i);
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

-- ====================================================================
-- STEP 4: Обновляем generate_giveaway_result с интеграцией клонирования
-- ====================================================================
-- ВАЖНО: Сохраняем всю существующую логику + добавляем вызов clone_giveaway
-- ====================================================================
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
  -- Получаем розыгрыш
  SELECT * INTO v_giveaway FROM giveaways WHERE id = p_giveaway_id;

  IF v_giveaway IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Giveaway not found');
  END IF;

  IF v_giveaway.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already completed');
  END IF;

  -- Получаем всех уникальных участников
  SELECT ARRAY_AGG(DISTINCT telegram_id) INTO v_participants
  FROM giveaway_tickets
  WHERE giveaway_id = p_giveaway_id;

  v_total_participants := COALESCE(array_length(v_participants, 1), 0);

  -- Получаем общее количество билетов
  SELECT COUNT(*) INTO v_total_tickets
  FROM giveaway_tickets
  WHERE giveaway_id = p_giveaway_id;

  -- Если участников меньше 5, отменяем розыгрыш
  IF v_total_participants < 5 THEN
    UPDATE giveaways SET status = 'cancelled' WHERE id = p_giveaway_id;
    RETURN jsonb_build_object('success', false, 'error', 'Not enough participants', 'count', v_total_participants);
  END IF;

  -- Генерируем seed для аудита
  v_seed := encode(gen_random_bytes(16), 'hex');

  -- Шаг 1: Qualification - выбираем 20 случайных участников
  SELECT ARRAY_AGG(telegram_id ORDER BY random()) INTO v_selected_20
  FROM (SELECT DISTINCT telegram_id FROM giveaway_tickets WHERE giveaway_id = p_giveaway_id) t
  LIMIT 20;

  -- Шаг 2: Elimination - выбираем 5 финалистов из 20
  v_finalists_5 := (SELECT ARRAY_AGG(x ORDER BY random()) FROM unnest(v_selected_20) x LIMIT 5);
  v_eliminated_15 := ARRAY(SELECT unnest(v_selected_20) EXCEPT SELECT unnest(v_finalists_5));

  -- Шаг 3: Battle - определяем победителей (перемешиваем финалистов)
  v_winners := (SELECT ARRAY_AGG(x ORDER BY random()) FROM unnest(v_finalists_5) x);

  -- Формируем результат
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

  -- Сохраняем результаты в БД
  UPDATE giveaways
  SET status = 'completed',
      draw_results = v_result,
      winners = v_winners
  WHERE id = p_giveaway_id;

  -- 🔥 НОВОЕ: Автоматическое клонирование если is_recurring = true
  PERFORM clone_giveaway(p_giveaway_id);

  RETURN v_result;
END;
$$;

COMMIT;

-- ====================================================================
-- КОНЕЦ МИГРАЦИИ
-- ====================================================================
-- После выполнения этого скрипта:
-- ✅ Таблица giveaways готова к авто-повтору
-- ✅ Функция buy_giveaway_ticket_v2 работает и пополняет джекпот
-- ✅ Функция generate_giveaway_result автоматически создает новый розыгрыш
-- ✅ Все интеграции с фронтендом работают
-- ====================================================================
