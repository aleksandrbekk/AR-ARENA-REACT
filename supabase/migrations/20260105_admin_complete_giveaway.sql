-- ====================================================================
-- AR ARENA: Admin Complete Giveaway
-- Date: 2026-01-05
-- ====================================================================

CREATE OR REPLACE FUNCTION admin_complete_giveaway(
  p_giveaway_id UUID,
  p_results JSONB,
  p_winners TEXT[] -- Array of telegram_ids in order of place (1st, 2nd, 3rd...)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_giveaway RECORD;
  v_distribute_result JSONB;
BEGIN
  -- 1. Check Giveaway
  SELECT * INTO v_giveaway FROM giveaways WHERE id = p_giveaway_id;
  
  IF v_giveaway IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Giveaway not found');
  END IF;
  
  IF v_giveaway.status = 'completed' AND v_giveaway.prizes_distributed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Giveaway already fully completed');
  END IF;

  -- 2. Update Giveaway with Results
  UPDATE giveaways
  SET 
    status = 'completed',
    draw_results = p_results,
    winners = p_winners, -- Important: This array is used by distribute_giveaway_prizes
    updated_at = NOW()
  WHERE id = p_giveaway_id;

  -- 3. Trigger Prize Distribution (existing function)
  -- This function reads the 'winners' column we just updated
  v_distribute_result := distribute_giveaway_prizes(p_giveaway_id);

  RETURN jsonb_build_object(
    'success', true,
    'giveaway_id', p_giveaway_id,
    'distribution', v_distribute_result
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
