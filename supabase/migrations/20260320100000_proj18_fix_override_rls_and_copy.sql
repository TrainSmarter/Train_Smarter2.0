-- =============================================================================
-- PROJ-18 Fix: Trainer can read connected athlete category overrides
-- + Fix copy_trainer_defaults status check ('accepted' → 'active')
-- =============================================================================

-- 1. Allow trainers to read overrides of their connected athletes
-- Without this, getActiveCategories(athleteId) returns empty overrides for trainers
CREATE POLICY "Trainers can read connected athlete overrides"
  ON public.feedback_category_overrides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_athlete_connections
      WHERE trainer_id = auth.uid()
        AND athlete_id = feedback_category_overrides.user_id
        AND status = 'active'
    )
  );

-- 2. Fix copy_trainer_defaults_to_athlete: status should be 'active' not 'accepted'
-- The connection_status enum values are: pending, active, rejected, disconnected
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
BEGIN
  -- Verify caller is the trainer who owns these defaults
  v_caller := auth.uid();
  IF v_caller IS NULL OR v_caller != p_trainer_id THEN
    RAISE EXCEPTION 'Not authorized: caller must be the trainer who owns these defaults';
  END IF;

  -- Verify trainer-athlete connection exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.trainer_athlete_connections
    WHERE trainer_id = v_caller
      AND athlete_id = p_athlete_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not authorized: no active connection between trainer and athlete';
  END IF;

  -- Copy all trainer defaults into athlete overrides
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

GRANT EXECUTE ON FUNCTION public.copy_trainer_defaults_to_athlete(uuid, uuid)
  TO authenticated;
