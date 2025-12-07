-- Создаём временную RPC функцию для исправления названий скинов
CREATE OR REPLACE FUNCTION fix_skin_names()
RETURNS TABLE(id INT, old_name TEXT, new_name TEXT) AS $$
BEGIN
  -- Временная таблица для сохранения старых значений
  CREATE TEMP TABLE IF NOT EXISTS skin_changes (
    skin_id INT,
    old_name TEXT,
    new_name TEXT
  );

  -- Сохраняем текущие названия перед изменением
  INSERT INTO skin_changes
  SELECT
    s.id,
    s.name as old_name,
    CASE
      WHEN s.name = 'Cryptan' THEN 'UFC Чемпион'
      WHEN s.name = 'UFC Чемпион' THEN 'Cryptan'
      WHEN s.name = 'Loki' THEN 'ВДВшник'
      WHEN s.name = 'ВДВшник' THEN 'Loki'
      ELSE s.name
    END as new_name
  FROM skins s
  WHERE s.name IN ('Cryptan', 'UFC Чемпион', 'Loki', 'ВДВшник');

  -- Выполняем обновление
  UPDATE skins
  SET name = CASE
    WHEN name = 'Cryptan' THEN 'UFC Чемпион'
    WHEN name = 'UFC Чемпион' THEN 'Cryptan'
    WHEN name = 'Loki' THEN 'ВДВшник'
    WHEN name = 'ВДВшник' THEN 'Loki'
    ELSE name
  END
  WHERE name IN ('Cryptan', 'UFC Чемпион', 'Loki', 'ВДВшник');

  -- Возвращаем результаты изменений
  RETURN QUERY SELECT * FROM skin_changes;

  DROP TABLE skin_changes;
END;
$$ LANGUAGE plpgsql;
