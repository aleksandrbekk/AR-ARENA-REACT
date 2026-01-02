// Скрипт для создания SQL функции buy_lottery_tickets в Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://syxjkircmiwpnpagznay.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NDQxMSwiZXhwIjoyMDczMzQwNDExfQ.7ueEYBhFrxKU3_RJi_iJEDj6EQqWBy3gAXiM4YIALqs';

const supabase = createClient(supabaseUrl, supabaseKey);

const sqlFunction = `
CREATE OR REPLACE FUNCTION buy_lottery_tickets(
    p_user_id UUID,
    p_amount INTEGER,
    p_price INTEGER
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    new_balance INTEGER,
    new_tickets INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance INTEGER;
    v_current_tickets INTEGER;
    v_telegram_id BIGINT;
    v_new_balance INTEGER;
    v_new_tickets INTEGER;
BEGIN
    SELECT balance_ar, COALESCE(tickets, 0), telegram_id
    INTO v_current_balance, v_current_tickets, v_telegram_id
    FROM users
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Пользователь не найден'::TEXT, 0, 0;
        RETURN;
    END IF;

    IF v_current_balance < p_price THEN
        RETURN QUERY SELECT FALSE, 'Недостаточно средств'::TEXT, v_current_balance, v_current_tickets;
        RETURN;
    END IF;

    v_new_balance := v_current_balance - p_price;
    v_new_tickets := v_current_tickets + p_amount;

    UPDATE users
    SET balance_ar = v_new_balance,
        tickets = v_new_tickets,
        updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO transactions (user_id, amount, type, description, created_at)
    VALUES (
        v_telegram_id,
        -p_price,
        'ticket_purchase',
        'Покупка ' || p_amount || ' билет' ||
        CASE
            WHEN p_amount = 1 THEN 'а'
            WHEN p_amount < 5 THEN 'ов'
            ELSE 'ов'
        END,
        NOW()
    );

    RETURN QUERY SELECT TRUE, 'Успешно'::TEXT, v_new_balance, v_new_tickets;
END;
$$;

GRANT EXECUTE ON FUNCTION buy_lottery_tickets(UUID, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION buy_lottery_tickets(UUID, INTEGER, INTEGER) TO authenticated;
`;

async function createFunction() {
    console.log('🚀 Создание SQL функции buy_lottery_tickets...');

    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: sqlFunction });

        if (error) {
            console.error('❌ Ошибка:', error);
            return;
        }

        console.log('✅ Функция создана успешно!');
        console.log('Результат:', data);
    } catch (err) {
        console.error('❌ Критическая ошибка:', err.message);
    }
}

createFunction();
