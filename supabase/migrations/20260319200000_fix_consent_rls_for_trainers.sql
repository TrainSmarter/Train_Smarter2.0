-- Migration: Fix consent check visibility for trainers (BUG)
--
-- Root Cause: The user_consents table has RLS policy "Users can read own consents"
-- which restricts SELECT to auth.uid() = user_id. When a trainer loads an athlete's
-- detail page, hasBodyWellnessConsent() queries user_consents for the athlete's row,
-- but auth.uid() is the trainer — so RLS blocks the read and returns NULL.
-- This causes a false-negative: consent appears revoked even when granted.
--
-- Fix: Create a SECURITY DEFINER function that bypasses RLS but verifies the caller
-- is either the athlete themselves or a connected trainer. This keeps the user_consents
-- table locked down while allowing legitimate cross-user consent checks.

CREATE OR REPLACE FUNCTION public.check_athlete_consent(
  p_athlete_id uuid,
  p_consent_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_is_authorized boolean;
  v_granted boolean;
BEGIN
  v_caller := auth.uid();

  -- Allow if caller is the athlete themselves
  IF v_caller = p_athlete_id THEN
    v_is_authorized := true;
  ELSE
    -- Allow if caller is a trainer connected to this athlete
    SELECT EXISTS(
      SELECT 1 FROM public.trainer_athlete_connections
      WHERE trainer_id = v_caller
        AND athlete_id = p_athlete_id
        AND status = 'active'
    ) INTO v_is_authorized;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN false;
  END IF;

  -- Get the latest consent record for this athlete and consent type
  SELECT granted INTO v_granted
  FROM public.user_consents
  WHERE user_id = p_athlete_id
    AND consent_type = p_consent_type
  ORDER BY granted_at DESC
  LIMIT 1;

  -- If no consent record exists, return false (not granted)
  RETURN COALESCE(v_granted, false);
END;
$$;

-- Also create a batch version for the monitoring overview (avoids N+1 RPC calls)
CREATE OR REPLACE FUNCTION public.check_athletes_consent(
  p_athlete_ids uuid[],
  p_consent_type text
)
RETURNS TABLE(athlete_id uuid, has_consent boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
BEGIN
  v_caller := auth.uid();

  -- Return consent status only for athletes the caller is connected to (or self)
  RETURN QUERY
  SELECT
    a_id AS athlete_id,
    COALESCE(
      (
        SELECT uc.granted
        FROM public.user_consents uc
        WHERE uc.user_id = a_id
          AND uc.consent_type = p_consent_type
        ORDER BY uc.granted_at DESC
        LIMIT 1
      ),
      false
    ) AS has_consent
  FROM unnest(p_athlete_ids) AS a_id
  WHERE a_id = v_caller
     OR EXISTS(
          SELECT 1 FROM public.trainer_athlete_connections tac
          WHERE tac.trainer_id = v_caller
            AND tac.athlete_id = a_id
            AND tac.status = 'active'
        );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_athlete_consent(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_athletes_consent(uuid[], text) TO authenticated;
