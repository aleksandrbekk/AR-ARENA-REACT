-- pg_cron Setup для автоматического запуска розыгрышей
-- Выполни этот SQL в Supabase SQL Editor

-- 1. Включаем расширение для планировщика (если не включено)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Создаем функцию-оркестратор, которая ищет просроченные розыгрыши
CREATE OR REPLACE FUNCTION process_expired_giveaways()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
BEGIN
  -- Ищем активные розыгрыши, время которых вышло
  FOR r IN 
    SELECT id 
    FROM giveaways 
    WHERE status = 'active' 
      AND end_date <= now()
  LOOP
    -- Для каждого такого розыгрыша запускаем генерацию результатов
    PERFORM generate_giveaway_result(r.id);
  END LOOP;
END;
$$;

-- 3. Настраиваем Cron Job (запуск каждую минуту)
-- Сначала удаляем старый джоб с таким именем, если был, чтобы не дублировать
SELECT cron.unschedule('check-giveaways');

-- Создаем расписание: каждую минуту (* * * * *) запускать нашу функцию
SELECT cron.schedule(
  'check-giveaways',
  '* * * * *', 
  'SELECT process_expired_giveaways()'
);
