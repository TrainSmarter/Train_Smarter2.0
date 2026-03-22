-- Migration: Security fixes from code review
-- Finding #1: SECURITY DEFINER functions missing SET search_path
-- Finding #2: profiles FOR ALL policy allows DELETE
-- Finding #6: trainer_profiles / athlete_profiles FOR ALL policies
-- Finding #7: has_role() missing SECURITY DEFINER

-- =============================================================================
-- Finding #1: Re-declare SECURITY DEFINER functions with SET search_path
-- =============================================================================

-- 1a. handle_new_user() — latest definition from code_review_fixes_batch1
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Extract role from app_metadata
  IF NEW.raw_app_meta_data->'roles' IS NOT NULL
     AND jsonb_typeof(NEW.raw_app_meta_data->'roles') = 'array' THEN
    user_role := UPPER(NEW.raw_app_meta_data->'roles'->>0);
  ELSE
    user_role := UPPER(NEW.raw_app_meta_data->>'roles');
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name, email, locale, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    NEW.email,
    CASE
      WHEN NEW.raw_user_meta_data ->> 'locale' IN ('de', 'en')
        THEN NEW.raw_user_meta_data ->> 'locale'
      ELSE 'de'
    END,
    user_role
  );
  RETURN NEW;
END;
$$;

-- 1b. handle_user_email_change()
CREATE OR REPLACE FUNCTION public.handle_user_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- 1c. is_team_member()
CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND user_id = auth.uid()
  );
$$;

-- 1d. handle_last_trainer_leaves()
CREATE OR REPLACE FUNCTION public.handle_last_trainer_leaves()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_count integer;
BEGIN
  -- Count remaining members after the deletion
  SELECT COUNT(*) INTO remaining_count
  FROM public.team_members
  WHERE team_id = OLD.team_id;

  -- If no trainers remain, archive the team and remove athlete assignments
  IF remaining_count = 0 THEN
    -- Archive the team
    UPDATE public.teams
    SET archived_at = now()
    WHERE id = OLD.team_id AND archived_at IS NULL;

    -- Remove all athlete assignments
    DELETE FROM public.team_athletes
    WHERE team_id = OLD.team_id;
  END IF;

  RETURN OLD;
END;
$$;

-- 1e. handle_consent_revocation()
CREATE OR REPLACE FUNCTION public.handle_consent_revocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act on revocation (granted = false)
  IF NEW.granted = false THEN
    IF NEW.consent_type = 'body_wellness_data' THEN
      UPDATE public.trainer_athlete_connections
      SET can_see_body_data = false
      WHERE athlete_id = NEW.user_id
        AND status = 'active';
    END IF;

    IF NEW.consent_type = 'nutrition_data' THEN
      UPDATE public.trainer_athlete_connections
      SET can_see_nutrition = false
      WHERE athlete_id = NEW.user_id
        AND status = 'active';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 1f. is_connected_athlete()
CREATE OR REPLACE FUNCTION public.is_connected_athlete(p_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trainer_athlete_connections
    WHERE trainer_id = auth.uid()
      AND athlete_id = p_athlete_id
      AND status = 'active'
  );
$$;

-- 1g. handle_checkin_value_athlete_id()
CREATE OR REPLACE FUNCTION public.handle_checkin_value_athlete_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT athlete_id INTO NEW.athlete_id
  FROM public.feedback_checkins
  WHERE id = NEW.checkin_id;

  IF NEW.athlete_id IS NULL THEN
    RAISE EXCEPTION 'Checkin not found: %', NEW.checkin_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 1h. validate_trainer_category()
CREATE OR REPLACE FUNCTION public.validate_trainer_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only validate trainer-scope categories
  IF NEW.scope = 'trainer' THEN
    -- target_athlete_id is required for trainer-scope
    IF NEW.target_athlete_id IS NULL THEN
      RAISE EXCEPTION 'Trainer-scope categories require a target_athlete_id';
    END IF;

    -- Verify the creator is connected to the target athlete
    IF NOT EXISTS (
      SELECT 1 FROM public.trainer_athlete_connections
      WHERE trainer_id = NEW.created_by
        AND athlete_id = NEW.target_athlete_id
        AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Trainer is not connected to target athlete';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- Finding #7: has_role() missing SECURITY DEFINER + SET search_path
-- Needs access to auth.jwt() which lives in auth schema
-- =============================================================================

CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
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
-- Finding #2: profiles FOR ALL policy allows DELETE — restrict to FOR UPDATE
-- =============================================================================

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =============================================================================
-- Finding #6: trainer_profiles and athlete_profiles FOR ALL policies
-- Replace with separate FOR SELECT + FOR UPDATE
-- =============================================================================

-- trainer_profiles: drop FOR ALL, create separate policies
DROP POLICY IF EXISTS "Users can update own trainer profile" ON public.trainer_profiles;

CREATE POLICY "Users can manage own trainer profile - select"
  ON public.trainer_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can manage own trainer profile - update"
  ON public.trainer_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage own trainer profile - insert"
  ON public.trainer_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- athlete_profiles: drop FOR ALL, create separate policies
DROP POLICY IF EXISTS "Users can update own athlete profile" ON public.athlete_profiles;

CREATE POLICY "Users can manage own athlete profile - select"
  ON public.athlete_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can manage own athlete profile - update"
  ON public.athlete_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage own athlete profile - insert"
  ON public.athlete_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
