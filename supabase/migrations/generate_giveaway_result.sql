-- SQL функция для генерации результатов розыгрыша
-- Выполни этот код в SQL Editor в Supabase

-- Сначала добавим недостающие колонки если их нет:
ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS draw_results JSONB;
ALTER TABLE giveaways ADD COLUMN IF NOT EXISTS winners TEXT[];

-- Затем создадим функцию:
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
  
  RETURN v_result;
END;
$$;
