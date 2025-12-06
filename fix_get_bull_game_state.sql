-- FIX: Добавить balance_ar в get_bull_game_state RPC функцию
-- Дата: 2025-12-03

CREATE OR REPLACE FUNCTION get_bull_game_state(p_telegram_id TEXT)
RETURNS TABLE (
    balance_bul NUMERIC,
    balance_ar NUMERIC,
    energy INTEGER,
    energy_max INTEGER,
    level INTEGER,
    xp INTEGER,
    xp_to_next INTEGER,
    active_skin TEXT,
    last_energy_update TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Создаем пользователя если его нет
    INSERT INTO users (telegram_id, balance_bul, energy, energy_max, level, xp, xp_to_next, active_skin, last_energy_update)
    VALUES (p_telegram_id::BIGINT, 0, 100, 100, 1, 0, 100, 'default', NOW())
    ON CONFLICT (telegram_id) DO NOTHING;

    -- Возвращаем состояние игры
    RETURN QUERY
    SELECT
        u.balance_bul,
        COALESCE(u.balance_ar, 0) as balance_ar,
        u.energy,
        u.energy_max,
        u.level,
        u.xp,
        u.xp_to_next,
        u.active_skin,
        u.last_energy_update
    FROM users u
    WHERE u.telegram_id = p_telegram_id::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- Права доступа
GRANT EXECUTE ON FUNCTION get_bull_game_state(TEXT) TO authenticated, anon;
