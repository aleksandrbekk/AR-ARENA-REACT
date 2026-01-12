-- Fix and Debug switch_location function
-- Handles NULL purchased state strictly
-- Returns detailed error messages

CREATE OR REPLACE FUNCTION switch_location(p_telegram_id BIGINT, p_location_slug TEXT)
RETURNS JSON AS $$
DECLARE
  v_purchased BOOLEAN;
  v_current_slug TEXT;
  v_exists BOOLEAN;
BEGIN
  -- 1. Check if location definition exists
  SELECT EXISTS(SELECT 1 FROM locations WHERE slug = p_location_slug) INTO v_exists;
  
  IF NOT v_exists THEN
     RETURN json_build_object(
       'success', false, 
       'error', 'System Error: Location definition not found', 
       'debug_slug', p_location_slug
     );
  END IF;

  -- 2. Check ownership
  IF p_location_slug = 'dorm' THEN
    v_purchased := true;
  ELSE
    SELECT purchased INTO v_purchased
    FROM user_locations
    WHERE user_id = p_telegram_id AND location_slug = p_location_slug;
    
    -- Treat missing row or NULL as NOT purchased
    IF v_purchased IS NULL THEN 
       v_purchased := false;
    END IF;
  END IF;

  IF v_purchased IS NOT TRUE THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Локация не куплена (или ошибка данных)', 
      'slug', p_location_slug
    );
  END IF;

  -- 3. Update user
  UPDATE users
  SET current_farm_location = p_location_slug
  WHERE telegram_id = p_telegram_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
