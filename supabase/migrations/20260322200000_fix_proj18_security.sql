-- =============================================================================
-- PROJ-18 Security Fix: copy_trainer_defaults_to_athlete authorization
-- =============================================================================
--
-- BUG-01 (CRITICAL): The copy_trainer_defaults_to_athlete function previously
-- required auth.uid() = p_trainer_id, but the function is called from the
-- athlete's context during acceptInvitation (the athlete accepts, and defaults
-- are copied). This means the auth check always failed silently.
--
-- FIX: Allow the caller to be EITHER:
--   a) The trainer themselves (p_trainer_id = auth.uid()), OR
--   b) The athlete (p_athlete_id = auth.uid()) who has an active connection
--      to the trainer, OR
--   c) A platform admin
--
-- The function remains SECURITY DEFINER to bypass RLS for the cross-user insert.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.copy_trainer_defaults_to_athlete(
  p_trainer_id  uuid,
  p_athlete_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_is_admin boolean;
BEGIN
  -- 1. Authenticate: caller must be logged in
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Authorize: caller must be the trainer, the athlete, or a platform admin
  v_is_admin := public.is_platform_admin();

  IF v_caller != p_trainer_id AND v_caller != p_athlete_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Not authorized: caller must be the trainer, the connected athlete, or an admin';
  END IF;

  -- 3. Verify trainer-athlete connection exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.trainer_athlete_connections
    WHERE trainer_id = p_trainer_id
      AND athlete_id = p_athlete_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not authorized: no active connection between trainer and athlete';
  END IF;

  -- 4. Copy all trainer defaults into athlete overrides
  -- ON CONFLICT: update existing overrides with trainer defaults
  INSERT INTO public.feedback_category_overrides (user_id, category_id, is_active, is_required)
  SELECT
    p_athlete_id,
    d.category_id,
    d.is_active,
    d.is_required
  FROM public.trainer_category_defaults d
  WHERE d.trainer_id = p_trainer_id
  ON CONFLICT (user_id, category_id)
  DO UPDATE SET
    is_active = EXCLUDED.is_active,
    is_required = EXCLUDED.is_required,
    updated_at = now();
END;
$$;

-- Re-grant execute permission (CREATE OR REPLACE preserves grants, but be explicit)
GRANT EXECUTE ON FUNCTION public.copy_trainer_defaults_to_athlete(uuid, uuid)
  TO authenticated;
