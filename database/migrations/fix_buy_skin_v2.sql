CREATE OR REPLACE FUNCTION buy_skin(
    p_telegram_id TEXT,
    p_skin_id INTEGER
)
RETURNS JSON AS $$
DECLARE
    v_user_id BIGINT;
    v_user_level INTEGER;
    v_user_bul NUMERIC;
    v_user_ar NUMERIC;
    v_skin RECORD;
    v_already_owned BOOLEAN;
    v_price NUMERIC;
    v_currency TEXT;
BEGIN
    -- 1. Получаем данные пользователя
    SELECT id, level, balance_bul, balance_ar
    INTO v_user_id, v_user_level, v_user_bul, v_user_ar
    FROM users
    WHERE telegram_id = p_telegram_id::BIGINT;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;

    -- 2. Получаем данные скина
    SELECT * INTO v_skin FROM skins WHERE id = p_skin_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'SKIN_NOT_FOUND');
    END IF;

    -- 3. Проверяем владение
    IF EXISTS (SELECT 1 FROM user_skins WHERE user_id = v_user_id AND skin_id = p_skin_id) THEN
        RETURN json_build_object('success', false, 'error', 'ALREADY_OWNED');
    END IF;

    -- 4. Проверяем уровень
    IF v_user_level < v_skin.level_req THEN
        RETURN json_build_object('success', false, 'error', 'LEVEL_TOO_LOW');
    END IF;

    -- 5. Определяем валюту и цену
    IF v_skin.skin_type = 'ar' THEN
        v_price := v_skin.price_ar;
        v_currency := 'AR';
        IF v_user_ar < v_price THEN
            RETURN json_build_object('success', false, 'error', 'INSUFFICIENT_AR');
        END IF;
    ELSE
        v_price := v_skin.price_bul;
        v_currency := 'BUL';
        IF v_user_bul < v_price THEN
            RETURN json_build_object('success', false, 'error', 'INSUFFICIENT_BUL');
        END IF;
    END IF;

    -- 6. Списываем средства
    IF v_currency = 'AR' THEN
        UPDATE users SET balance_ar = balance_ar - v_price WHERE id = v_user_id;
    ELSE
        UPDATE users SET balance_bul = balance_bul - v_price WHERE id = v_user_id;
    END IF;

    -- 7. Выдаем скин
    INSERT INTO user_skins (user_id, skin_id, is_equipped, purchased_at)
    VALUES (v_user_id, p_skin_id, false, NOW());

    -- 8. Лог транзакции
    INSERT INTO transactions (user_id, type, amount, description)
    VALUES (v_user_id, 'skin_purchase', -v_price, 'Bought skin ' || v_skin.name || ' for ' || v_currency);

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
