-- Исправление restore_bull_energy: 1 энергия за 180 секунд (3 минуты)

CREATE OR REPLACE FUNCTION restore_bull_energy(p_telegram_id TEXT)
RETURNS TABLE (
    success BOOLEAN,
    energy INTEGER,
    energy_max INTEGER,
    energy_restored INTEGER
) AS $$
DECLARE
    v_user_id BIGINT;
    v_current_energy INTEGER;
    v_energy_max INTEGER;
    v_last_update TIMESTAMP WITH TIME ZONE;
    v_seconds_passed INTEGER;
    v_energy_to_restore INTEGER;
    v_new_energy INTEGER;
BEGIN
    -- Получаем данные пользователя
    SELECT u.energy, u.energy_max, u.last_energy_update
    INTO v_current_energy, v_energy_max, v_last_update
    FROM users u
    WHERE u.telegram_id = p_telegram_id::BIGINT;

    -- Если пользователь не найден
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 0, 0;
        RETURN;
    END IF;

    -- Если энергия уже максимальная
    IF v_current_energy >= v_energy_max THEN
        RETURN QUERY SELECT TRUE, v_current_energy, v_energy_max, 0;
        RETURN;
    END IF;

    -- Вычисляем сколько секунд прошло
    v_seconds_passed := EXTRACT(EPOCH FROM (NOW() - v_last_update))::INTEGER;

    -- 1 энергия за 180 секунд (3 минуты)
    v_energy_to_restore := v_seconds_passed / 180;

    -- Если прошло меньше 3 минут, энергия не восстанавливается
    IF v_energy_to_restore = 0 THEN
        RETURN QUERY SELECT TRUE, v_current_energy, v_energy_max, 0;
        RETURN;
    END IF;

    -- Вычисляем новую энергию (не больше максимума)
    v_new_energy := LEAST(v_current_energy + v_energy_to_restore, v_energy_max);

    -- Обновляем энергию
    UPDATE users
    SET
        energy = v_new_energy,
        last_energy_update = NOW()
    WHERE telegram_id = p_telegram_id::BIGINT;

    -- Возвращаем результат
    RETURN QUERY SELECT TRUE, v_new_energy, v_energy_max, v_energy_to_restore;
END;
$$ LANGUAGE plpgsql;
