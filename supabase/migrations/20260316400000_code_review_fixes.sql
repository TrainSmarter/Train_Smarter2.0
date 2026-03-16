-- Code Review Fixes Migration
-- Addresses: avatar RLS, missing index, has_role() safety, storage path safety

-- =============================================================================
-- 1. Avatar Storage RLS Policies
--    Previously: public bucket with NO write/delete policies → any authenticated
--    user could upload/delete any avatar. Now: path-based ownership check.
-- =============================================================================

-- Fix: replace restrictive "Users can read own avatar" with public read
-- (bucket is public, so anyone should be able to read avatars)
-- Avatar write/update/delete policies already exist with path-based ownership.
DROP POLICY IF EXISTS "Users can read own avatar" ON storage.objects;
CREATE POLICY "Anyone can read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- =============================================================================
-- 2. Missing Index on feedback_checkin_values.athlete_id
--    RLS policies and trainer queries filter by athlete_id without an index.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_feedback_checkin_values_athlete_id
  ON public.feedback_checkin_values(athlete_id);

-- =============================================================================
-- 3. Safer has_role() — returns false instead of erroring when app_metadata
--    is missing or roles is not set.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN auth.jwt()->'app_metadata'->'roles' IS NULL THEN false
    WHEN jsonb_typeof(auth.jwt()->'app_metadata'->'roles') != 'array' THEN false
    ELSE required_role = ANY(
      ARRAY(SELECT jsonb_array_elements_text(
        auth.jwt()->'app_metadata'->'roles'
      ))
    )
  END;
$$;

-- =============================================================================
-- 4. Safer storage path parsing for team-logos
--    Replace direct ::uuid cast with a safe wrapper function that returns false
--    on invalid paths instead of throwing a cast error.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.safe_is_team_member_from_path(file_path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  folder_name text;
  team_uuid uuid;
BEGIN
  folder_name := (storage.foldername(file_path))[1];
  IF folder_name IS NULL THEN
    RETURN false;
  END IF;

  BEGIN
    team_uuid := folder_name::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;

  RETURN public.is_team_member(team_uuid);
END;
$$;

-- Update team-logos storage policies to use the safe wrapper
DROP POLICY IF EXISTS "Team members can upload logos" ON storage.objects;
CREATE POLICY "Team members can upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'team-logos'
    AND public.safe_is_team_member_from_path(name)
  );

DROP POLICY IF EXISTS "Team members can update logos" ON storage.objects;
CREATE POLICY "Team members can update logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'team-logos'
    AND public.safe_is_team_member_from_path(name)
  );

DROP POLICY IF EXISTS "Team members can delete logos" ON storage.objects;
CREATE POLICY "Team members can delete logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'team-logos'
    AND public.safe_is_team_member_from_path(name)
  );
