-- FIX: Добавить tap_power в get_bull_game_state RPC функцию
-- Дата: 2026-01-05
-- Задача: Исправить баг отображения силы тапа в StatusBar

CREATE OR REPLACE FUNCTION get_bull_game_state(p_telegram_id TEXT)
RETURNS TABLE (
    balance_bul NUMERIC,
    balance_ar NUMERIC,
    energy INTEGER,
    energy_max INTEGER,
    level INTEGER,
    xp INTEGER,
    xp_to_next INTEGER,
    tap_power INTEGER,
    active_skin TEXT,
    last_energy_update TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Создаем пользователя если его нет
    INSERT INTO users (telegram_id, balance_bul, energy, energy_max, level, xp, xp_to_next, tap_power, active_skin, last_energy_update)
    VALUES (p_telegram_id::BIGINT, 0, 100, 100, 1, 0, 100, 1, 'default', NOW())
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
        COALESCE(u.tap_power, 1) as tap_power,
        u.active_skin,
        u.last_energy_update
    FROM users u
    WHERE u.telegram_id = p_telegram_id::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- Права доступа
GRANT EXECUTE ON FUNCTION get_bull_game_state(TEXT) TO authenticated, anon;
