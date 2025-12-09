-- Create RPC function for adding AR balance
CREATE OR REPLACE FUNCTION add_ar_balance(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  UPDATE users
  SET ar_balance = COALESCE(ar_balance, 0) + p_amount
  WHERE id = p_user_id
  RETURNING ar_balance INTO new_balance;

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
