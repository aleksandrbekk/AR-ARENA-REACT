const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgres://postgres:xYrsyp-6jyhgy-gubjyc@db.syxjkircmiwpnpagznay.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

const sql = `
-- Функция для ручной выдачи билета
CREATE OR REPLACE FUNCTION admin_add_ticket(
  p_giveaway_id UUID,
  p_telegram_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id BIGINT;
  v_giveaway RECORD;
  v_ticket_number TEXT;
  v_ticket_id UUID;
BEGIN
  -- 1. Получаем пользователя
  SELECT id INTO v_user_id FROM users WHERE telegram_id = p_telegram_id;
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'User not found'); END IF;

  -- 2. Получаем розыгрыш
  SELECT * INTO v_giveaway FROM giveaways WHERE id = p_giveaway_id;
  IF v_giveaway IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Giveaway not found'); END IF;

  IF v_giveaway.status != 'active' THEN RETURN jsonb_build_object('success', false, 'error', 'Giveaway is not active'); END IF;

  -- 3. Генерируем номер
  v_ticket_number := 'T-' || substring(p_giveaway_id::text, 1, 4) || '-' || encode(gen_random_bytes(3), 'hex');

  -- 4. Добавляем билет
  INSERT INTO giveaway_tickets (giveaway_id, user_id, ticket_number, source_type, is_free, created_at)
  VALUES (p_giveaway_id, v_user_id, v_ticket_number, 'manual_admin', true, NOW())
  RETURNING id INTO v_ticket_id;

  -- 5. Лог транзакции
  INSERT INTO transactions (user_id, type, amount, currency, description, metadata)
  VALUES (v_user_id, 'admin_ticket_grant', 0, 'AR', format('Admin granted ticket: %s', v_giveaway.title), jsonb_build_object('ticket', v_ticket_number, 'granted_by', 'admin'));

  RETURN jsonb_build_object('success', true, 'ticket_number', v_ticket_number);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_add_ticket TO authenticated;
`;

async function run() {
    try {
        await client.connect();
        console.log('Connected to database...');
        await client.query(sql);
        console.log('Migration applied successfully!');
    } catch (err) {
        console.error('Error applying migration:', err);
    } finally {
        await client.end();
    }
}

run();
