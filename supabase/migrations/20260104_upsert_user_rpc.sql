-- RPC функция для upsert пользователя Mini App
-- Обходит RLS, так как выполняется с SECURITY DEFINER

CREATE OR REPLACE FUNCTION upsert_app_user(
  p_telegram_id BIGINT,
  p_username TEXT DEFAULT NULL,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL,
  p_language_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Upsert пользователя
  INSERT INTO users (
    telegram_id,
    username,
    first_name,
    last_name,
    photo_url,
    language_code,
    last_seen_at
  )
  VALUES (
    p_telegram_id,
    p_username,
    p_first_name,
    p_last_name,
    p_photo_url,
    p_language_code,
    NOW()
  )
  ON CONFLICT (telegram_id)
  DO UPDATE SET
    username = COALESCE(EXCLUDED.username, users.username),
    first_name = COALESCE(EXCLUDED.first_name, users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, users.last_name),
    photo_url = COALESCE(EXCLUDED.photo_url, users.photo_url),
    language_code = COALESCE(EXCLUDED.language_code, users.language_code),
    last_seen_at = NOW();

  -- Возвращаем результат
  SELECT jsonb_build_object(
    'success', true,
    'telegram_id', p_telegram_id
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Даём права anon на вызов функции
GRANT EXECUTE ON FUNCTION upsert_app_user TO anon;
GRANT EXECUTE ON FUNCTION upsert_app_user TO authenticated;
