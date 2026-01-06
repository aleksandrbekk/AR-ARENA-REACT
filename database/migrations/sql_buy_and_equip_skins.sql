-- =====================================================
-- ФУНКЦИЯ 1: buy_skin — покупка скина
-- =====================================================

DROP FUNCTION IF EXISTS buy_skin(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION buy_skin(
    p_telegram_id TEXT,
    p_skin_id INTEGER
)
RETURNS JSON AS $$
DECLARE
    v_user_id BIGINT;
    v_user_level INTEGER;
    v_user_bul NUMERIC;
    v_skin RECORD;
    v_already_owned BOOLEAN;
BEGIN
    -- 1. Получаем данные пользователя
    SELECT id, level, balance_bul
    INTO v_user_id, v_user_level, v_user_bul
    FROM users
    WHERE telegram_id = p_telegram_id::BIGINT;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'USER_NOT_FOUND'
        );
    END IF;

    -- 2. Получаем данные скина
    SELECT *
    INTO v_skin
    FROM skins
    WHERE id = p_skin_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'SKIN_NOT_FOUND'
        );
    END IF;

    -- 3. Проверяем, не куплен ли уже
    SELECT EXISTS(
        SELECT 1 FROM user_skins
        WHERE user_id = v_user_id AND skin_id = p_skin_id
    ) INTO v_already_owned;

    IF v_already_owned THEN
        RETURN json_build_object(
            'success', false,
            'error', 'ALREADY_OWNED'
        );
    END IF;

    -- 4. Проверяем уровень
    IF v_user_level < v_skin.level_req THEN
        RETURN json_build_object(
            'success', false,
            'error', 'LEVEL_TOO_LOW',
            'required_level', v_skin.level_req,
            'user_level', v_user_level
        );
    END IF;

    -- 5. Проверяем баланс BUL
    IF v_user_bul < v_skin.price_bul THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INSUFFICIENT_BUL',
            'required', v_skin.price_bul,
            'available', v_user_bul
        );
    END IF;

    -- 6. Списываем BUL
    UPDATE users
    SET balance_bul = balance_bul - v_skin.price_bul
    WHERE id = v_user_id;

    -- 7. Добавляем скин в user_skins
    INSERT INTO user_skins (user_id, skin_id, is_equipped, purchased_at)
    VALUES (v_user_id, p_skin_id, false, NOW());

    -- 8. Записываем транзакцию
    INSERT INTO transactions (user_id, type, amount, description)
    VALUES (
        v_user_id,
        'skin_purchase',
        -v_skin.price_bul,
        'Purchased skin: ' || v_skin.name
    );

    -- 9. Возвращаем успех
    RETURN json_build_object(
        'success', true,
        'skin_id', p_skin_id,
        'new_balance_bul', v_user_bul - v_skin.price_bul
    );

END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- ФУНКЦИЯ 2: equip_skin — экипировка скина
-- =====================================================

DROP FUNCTION IF EXISTS equip_skin(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION equip_skin(
    p_telegram_id TEXT,
    p_skin_id INTEGER
)
RETURNS JSON AS $$
DECLARE
    v_user_id BIGINT;
    v_is_owned BOOLEAN;
BEGIN
    -- 1. Получаем user_id
    SELECT id
    INTO v_user_id
    FROM users
    WHERE telegram_id = p_telegram_id::BIGINT;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'USER_NOT_FOUND'
        );
    END IF;

    -- 2. Проверяем владение скином
    SELECT EXISTS(
        SELECT 1 FROM user_skins
        WHERE user_id = v_user_id AND skin_id = p_skin_id
    ) INTO v_is_owned;

    IF NOT v_is_owned THEN
        RETURN json_build_object(
            'success', false,
            'error', 'SKIN_NOT_OWNED'
        );
    END IF;

    -- 3. Снимаем все скины (is_equipped = false)
    UPDATE user_skins
    SET is_equipped = false
    WHERE user_id = v_user_id;

    -- 4. Экипируем выбранный скин
    UPDATE user_skins
    SET is_equipped = true
    WHERE user_id = v_user_id AND skin_id = p_skin_id;

    -- 5. Обновляем active_skin_id в users
    UPDATE users
    SET active_skin_id = p_skin_id
    WHERE id = v_user_id;

    -- 6. Возвращаем успех
    RETURN json_build_object(
        'success', true,
        'equipped_skin_id', p_skin_id
    );

END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- ТЕСТЫ
-- =====================================================

-- Тест 1: Покупка скина
-- SELECT buy_skin('190202791', 2);

-- Тест 2: Экипировка скина
-- SELECT equip_skin('190202791', 2);

-- Проверка купленных скинов пользователя
-- SELECT * FROM user_skins WHERE user_id IN (SELECT id FROM users WHERE telegram_id = '190202791');

-- Проверка баланса после покупки
-- SELECT balance_bul FROM users WHERE telegram_id = '190202791';

-- Проверка транзакций
-- SELECT * FROM transactions WHERE user_id IN (SELECT id FROM users WHERE telegram_id = '190202791') ORDER BY created_at DESC LIMIT 5;
