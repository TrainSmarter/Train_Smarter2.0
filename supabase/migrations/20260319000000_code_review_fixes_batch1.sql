-- Code Review Fixes Batch 1
-- K1: Add profiles.role column + sync trigger + backfill
-- K2: Avatar storage write/delete RLS policies
-- K4: handle_new_user() sets email + role
-- W3: Fix streak CTE in v_athlete_monitoring_summary

-- =============================================================================
-- K1: Add `role` column to profiles
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text;

-- Index on role for filtered queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- =============================================================================
-- K1: Backfill existing profiles based on trainer_profiles / athlete_profiles
-- =============================================================================

-- Trainers first (trainer_profiles exists → TRAINER)
UPDATE public.profiles p
SET role = 'TRAINER'
FROM public.trainer_profiles tp
WHERE p.id = tp.id
  AND p.role IS NULL;

-- Athletes second (athlete_profiles exists → ATHLETE)
UPDATE public.profiles p
SET role = 'ATHLETE'
FROM public.athlete_profiles ap
WHERE p.id = ap.id
  AND p.role IS NULL;

-- Fallback: infer from auth.users raw_app_meta_data
UPDATE public.profiles p
SET role = UPPER(au.raw_app_meta_data ->> 'roles')
FROM auth.users au
WHERE p.id = au.id
  AND p.role IS NULL
  AND au.raw_app_meta_data ->> 'roles' IS NOT NULL;

-- =============================================================================
-- K1: Trigger to sync role from auth.users app_metadata on changes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_user_role_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_role text;
BEGIN
  -- Extract the first role from raw_app_meta_data->'roles' array
  -- e.g. raw_app_meta_data = {"roles": ["TRAINER"]}
  IF NEW.raw_app_meta_data->'roles' IS NOT NULL
     AND jsonb_typeof(NEW.raw_app_meta_data->'roles') = 'array' THEN
    new_role := NEW.raw_app_meta_data->'roles'->>0;
  ELSE
    -- Fallback: try plain string (legacy format "roles": "TRAINER")
    new_role := NEW.raw_app_meta_data->>'roles';
  END IF;

  IF new_role IS NOT NULL THEN
    UPDATE public.profiles SET role = UPPER(new_role) WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on INSERT (new user signup) and UPDATE of raw_app_meta_data
DROP TRIGGER IF EXISTS on_auth_user_role_sync ON auth.users;
CREATE TRIGGER on_auth_user_role_sync
  AFTER INSERT OR UPDATE OF raw_app_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_role_sync();

-- =============================================================================
-- K4: Update handle_new_user() to also set email and role
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

-- K4: Backfill email for profiles that are missing it
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id
  AND p.email IS NULL;

-- =============================================================================
-- K2: Avatar Storage Write/Delete RLS Policies
-- Users can only upload/update/delete in their own folder (auth.uid()::text)
-- =============================================================================

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- W3: Fix streak CTE in v_athlete_monitoring_summary
-- The old streak CTE used a correlated subquery with LIMIT 1 which broke
-- for multiple athletes. Replace with DISTINCT ON approach.
-- =============================================================================

CREATE OR REPLACE VIEW public.v_athlete_monitoring_summary AS
WITH last_checkin AS (
  SELECT
    athlete_id,
    MAX(date) AS last_checkin_date
  FROM public.feedback_checkins
  GROUP BY athlete_id
),
weight_category AS (
  SELECT id FROM public.feedback_categories
  WHERE slug = 'weight' AND scope = 'global'
  LIMIT 1
),
latest_weight AS (
  SELECT DISTINCT ON (cv.athlete_id)
    cv.athlete_id,
    cv.numeric_value AS latest_weight
  FROM public.feedback_checkin_values cv
  CROSS JOIN weight_category wc
  WHERE cv.category_id = wc.id
    AND cv.numeric_value IS NOT NULL
  ORDER BY cv.athlete_id, cv.created_at DESC
),
weight_7d_ago AS (
  SELECT DISTINCT ON (cv.athlete_id)
    cv.athlete_id,
    cv.numeric_value AS weight_7d
  FROM public.feedback_checkin_values cv
  CROSS JOIN weight_category wc
  JOIN public.feedback_checkins c ON c.id = cv.checkin_id
  WHERE cv.category_id = wc.id
    AND cv.numeric_value IS NOT NULL
    AND c.date <= (CURRENT_DATE - INTERVAL '6 days')
  ORDER BY cv.athlete_id, c.date DESC
),
-- Fixed streak CTE: compute per-athlete streak using island detection
-- and pick the island that includes today (or the most recent consecutive run)
streak_islands AS (
  SELECT
    athlete_id,
    date,
    date - (ROW_NUMBER() OVER (PARTITION BY athlete_id ORDER BY date DESC))::integer AS grp
  FROM public.feedback_checkins
  WHERE date >= CURRENT_DATE - INTERVAL '90 days'
    AND date <= CURRENT_DATE
),
streak_counts AS (
  SELECT
    athlete_id,
    grp,
    COUNT(*)::integer AS streak_days,
    MAX(date) AS max_date
  FROM streak_islands
  GROUP BY athlete_id, grp
),
streak AS (
  SELECT DISTINCT ON (athlete_id)
    athlete_id,
    streak_days
  FROM streak_counts
  WHERE max_date = CURRENT_DATE
  ORDER BY athlete_id, streak_days DESC
),
compliance AS (
  SELECT
    athlete_id,
    COUNT(*)::numeric / 30.0 * 100 AS compliance_rate
  FROM public.feedback_checkins
  WHERE date > CURRENT_DATE - INTERVAL '30 days'
  GROUP BY athlete_id
),
avg_scales AS (
  SELECT
    cv.athlete_id,
    ROUND(AVG(cv.numeric_value)::numeric, 1) AS avg_scale
  FROM public.feedback_checkin_values cv
  JOIN public.feedback_categories fc ON fc.id = cv.category_id
  JOIN public.feedback_checkins c ON c.id = cv.checkin_id
  WHERE fc.type = 'scale'
    AND cv.numeric_value IS NOT NULL
    AND c.date > CURRENT_DATE - INTERVAL '7 days'
  GROUP BY cv.athlete_id
)
SELECT
  p.id AS athlete_id,
  p.first_name,
  p.last_name,
  p.email,
  p.avatar_url,
  lc.last_checkin_date,
  lw.latest_weight,
  CASE
    WHEN lw.latest_weight IS NOT NULL AND w7.weight_7d IS NOT NULL
    THEN ROUND((lw.latest_weight - w7.weight_7d)::numeric, 1)
    ELSE NULL
  END AS weight_trend,
  COALESCE(s.streak_days, 0) AS streak,
  COALESCE(ROUND(comp.compliance_rate), 0) AS compliance_rate,
  COALESCE(avgs.avg_scale, 0) AS avg_scale_value
FROM public.profiles p
LEFT JOIN last_checkin lc ON lc.athlete_id = p.id
LEFT JOIN latest_weight lw ON lw.athlete_id = p.id
LEFT JOIN weight_7d_ago w7 ON w7.athlete_id = p.id
LEFT JOIN streak s ON s.athlete_id = p.id
LEFT JOIN compliance comp ON comp.athlete_id = p.id
LEFT JOIN avg_scales avgs ON avgs.athlete_id = p.id;
