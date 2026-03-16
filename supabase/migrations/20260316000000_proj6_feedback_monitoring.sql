-- Migration: PROJ-6 Feedback & Monitoring
-- Tables: feedback_categories, feedback_category_overrides, feedback_checkins, feedback_checkin_values
-- Views: v_athlete_monitoring_summary, v_athlete_checkin_history
-- Helpers: is_connected_athlete()
-- Seed: 11 global standard categories
-- Convention: All timestamps use timestamptz (never timestamp without tz)

-- =============================================================================
-- 1. ALTER trainer_athlete_connections: add feedback_backfill_days
-- =============================================================================

-- can_see_analysis already exists from PROJ-5 migration
ALTER TABLE public.trainer_athlete_connections
  ADD COLUMN IF NOT EXISTS feedback_backfill_days smallint NOT NULL DEFAULT 3
  CONSTRAINT chk_feedback_backfill_days CHECK (feedback_backfill_days BETWEEN 1 AND 14);

-- =============================================================================
-- 2. Helper function: is_connected_athlete()
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_connected_athlete(p_athlete_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trainer_athlete_connections
    WHERE trainer_id = auth.uid()
      AND athlete_id = p_athlete_id
      AND status = 'active'
  );
$$;

-- =============================================================================
-- 3. feedback_categories table
-- =============================================================================

CREATE TABLE public.feedback_categories (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              jsonb       NOT NULL,  -- {"de": "...", "en": "..."}
  slug              text,                  -- UNIQUE for global categories only
  type              text        NOT NULL CHECK (type IN ('number', 'scale', 'text')),
  unit              text,
  min_value         numeric,
  max_value         numeric,
  scale_labels      jsonb,                 -- {"1": {"de": "...", "en": "..."}, ...}
  is_required       boolean     NOT NULL DEFAULT false,
  sort_order        smallint    NOT NULL DEFAULT 0,
  icon              text,
  scope             text        NOT NULL CHECK (scope IN ('global', 'trainer', 'athlete')),
  created_by        uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_athlete_id uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  archived_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_categories ENABLE ROW LEVEL SECURITY;

-- Unique slug for global categories only
CREATE UNIQUE INDEX idx_feedback_categories_slug_global
  ON public.feedback_categories(slug)
  WHERE scope = 'global' AND slug IS NOT NULL;

CREATE TRIGGER on_feedback_categories_updated
  BEFORE UPDATE ON public.feedback_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 4. feedback_category_overrides table
-- =============================================================================

CREATE TABLE public.feedback_category_overrides (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid        NOT NULL REFERENCES public.feedback_categories(id) ON DELETE CASCADE,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_category_override UNIQUE (user_id, category_id)
);

ALTER TABLE public.feedback_category_overrides ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER on_feedback_category_overrides_updated
  BEFORE UPDATE ON public.feedback_category_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 5. feedback_checkins table (header — one per athlete per day)
-- =============================================================================

CREATE TABLE public.feedback_checkins (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date        date        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_checkin_per_day UNIQUE (athlete_id, date)
);

ALTER TABLE public.feedback_checkins ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER on_feedback_checkins_updated
  BEFORE UPDATE ON public.feedback_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 6. feedback_checkin_values table (EAV — one value per category per checkin)
-- =============================================================================

CREATE TABLE public.feedback_checkin_values (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id    uuid        NOT NULL REFERENCES public.feedback_checkins(id) ON DELETE CASCADE,
  category_id   uuid        NOT NULL REFERENCES public.feedback_categories(id) ON DELETE RESTRICT,
  athlete_id    uuid        NOT NULL,  -- denormalized, auto-set by trigger
  numeric_value numeric,
  text_value    text,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_value_per_category UNIQUE (checkin_id, category_id)
);

ALTER TABLE public.feedback_checkin_values ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 7. Triggers: auto-copy athlete_id from checkin to values
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_checkin_value_athlete_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE TRIGGER on_checkin_value_set_athlete_id
  BEFORE INSERT ON public.feedback_checkin_values
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_checkin_value_athlete_id();

-- =============================================================================
-- 8. Trigger: validate trainer-scope category creation
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_trainer_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE TRIGGER on_feedback_category_validate
  BEFORE INSERT OR UPDATE ON public.feedback_categories
  FOR EACH ROW
  WHEN (NEW.scope = 'trainer')
  EXECUTE FUNCTION public.validate_trainer_category();

-- =============================================================================
-- 9. Indexes
-- =============================================================================

-- feedback_categories indexes
CREATE INDEX idx_feedback_categories_scope_archived
  ON public.feedback_categories(scope, archived_at)
  WHERE archived_at IS NULL;

CREATE INDEX idx_feedback_categories_created_by_scope
  ON public.feedback_categories(created_by, scope)
  WHERE created_by IS NOT NULL;

CREATE INDEX idx_feedback_categories_target_athlete
  ON public.feedback_categories(target_athlete_id)
  WHERE target_athlete_id IS NOT NULL;

-- feedback_checkins indexes
CREATE INDEX idx_feedback_checkins_athlete_date
  ON public.feedback_checkins(athlete_id, date DESC);

-- feedback_checkin_values indexes
CREATE INDEX idx_feedback_checkin_values_checkin
  ON public.feedback_checkin_values(checkin_id);

CREATE INDEX idx_feedback_checkin_values_category_numeric
  ON public.feedback_checkin_values(category_id, numeric_value)
  WHERE numeric_value IS NOT NULL;

CREATE INDEX idx_feedback_checkin_values_athlete_category_created
  ON public.feedback_checkin_values(athlete_id, category_id, created_at DESC)
  INCLUDE (numeric_value);

-- =============================================================================
-- 10. RLS Policies — feedback_categories
-- =============================================================================

-- SELECT: all authenticated users can read global categories
CREATE POLICY "Authenticated users can read global categories"
  ON public.feedback_categories FOR SELECT
  USING (
    scope = 'global' AND archived_at IS NULL
  );

-- SELECT: trainers can read their own trainer-scope categories
CREATE POLICY "Trainers can read own categories"
  ON public.feedback_categories FOR SELECT
  USING (
    scope = 'trainer' AND created_by = auth.uid()
  );

-- SELECT: athletes can read categories assigned to them by their trainer
CREATE POLICY "Athletes can read trainer-assigned categories"
  ON public.feedback_categories FOR SELECT
  USING (
    scope = 'trainer' AND target_athlete_id = auth.uid()
  );

-- SELECT: users can read their own athlete-scope categories
CREATE POLICY "Users can read own athlete categories"
  ON public.feedback_categories FOR SELECT
  USING (
    scope = 'athlete' AND created_by = auth.uid()
  );

-- SELECT: trainers can read athlete-scope categories of their connected athletes
CREATE POLICY "Trainers can read connected athlete categories"
  ON public.feedback_categories FOR SELECT
  USING (
    scope = 'athlete'
    AND public.is_connected_athlete(created_by)
  );

-- INSERT: trainers can create trainer-scope categories
CREATE POLICY "Trainers can create categories"
  ON public.feedback_categories FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND scope IN ('trainer', 'athlete')
  );

-- UPDATE: users can update their own categories (not global)
CREATE POLICY "Users can update own categories"
  ON public.feedback_categories FOR UPDATE
  USING (created_by = auth.uid() AND scope != 'global')
  WITH CHECK (created_by = auth.uid() AND scope != 'global');

-- DELETE: users can delete their own categories (soft-delete via archived_at preferred)
CREATE POLICY "Users can delete own categories"
  ON public.feedback_categories FOR DELETE
  USING (created_by = auth.uid() AND scope != 'global');

-- =============================================================================
-- 11. RLS Policies — feedback_category_overrides
-- =============================================================================

CREATE POLICY "Users can read own overrides"
  ON public.feedback_category_overrides FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own overrides"
  ON public.feedback_category_overrides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own overrides"
  ON public.feedback_category_overrides FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own overrides"
  ON public.feedback_category_overrides FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 12. RLS Policies — feedback_checkins
-- =============================================================================

-- Athletes: full CRUD on own checkins
CREATE POLICY "Athletes can read own checkins"
  ON public.feedback_checkins FOR SELECT
  USING (auth.uid() = athlete_id);

CREATE POLICY "Athletes can insert own checkins"
  ON public.feedback_checkins FOR INSERT
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Athletes can update own checkins"
  ON public.feedback_checkins FOR UPDATE
  USING (auth.uid() = athlete_id)
  WITH CHECK (auth.uid() = athlete_id);

-- Trainers: read-only access to connected athletes
CREATE POLICY "Trainers can read connected athlete checkins"
  ON public.feedback_checkins FOR SELECT
  USING (public.is_connected_athlete(athlete_id));

-- =============================================================================
-- 13. RLS Policies — feedback_checkin_values
-- =============================================================================

-- Athletes: full CRUD on own values
CREATE POLICY "Athletes can read own checkin values"
  ON public.feedback_checkin_values FOR SELECT
  USING (auth.uid() = athlete_id);

CREATE POLICY "Athletes can insert own checkin values"
  ON public.feedback_checkin_values FOR INSERT
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Athletes can update own checkin values"
  ON public.feedback_checkin_values FOR UPDATE
  USING (auth.uid() = athlete_id)
  WITH CHECK (auth.uid() = athlete_id);

-- Trainers: read-only access to connected athletes' values
CREATE POLICY "Trainers can read connected athlete checkin values"
  ON public.feedback_checkin_values FOR SELECT
  USING (public.is_connected_athlete(athlete_id));

-- =============================================================================
-- 14. Database View: v_athlete_checkin_history
-- =============================================================================

CREATE OR REPLACE VIEW public.v_athlete_checkin_history AS
SELECT
  c.id AS checkin_id,
  c.athlete_id,
  c.date,
  c.created_at,
  c.updated_at,
  COALESCE(
    jsonb_object_agg(
      cv.category_id::text,
      jsonb_build_object(
        'numeric_value', cv.numeric_value,
        'text_value', cv.text_value
      )
    ) FILTER (WHERE cv.id IS NOT NULL),
    '{}'::jsonb
  ) AS values
FROM public.feedback_checkins c
LEFT JOIN public.feedback_checkin_values cv ON cv.checkin_id = c.id
GROUP BY c.id, c.athlete_id, c.date, c.created_at, c.updated_at;

-- =============================================================================
-- 15. Database View: v_athlete_monitoring_summary
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
streak AS (
  SELECT
    athlete_id,
    COUNT(*)::integer AS streak_days
  FROM (
    SELECT
      athlete_id,
      date,
      date - (ROW_NUMBER() OVER (PARTITION BY athlete_id ORDER BY date DESC))::integer AS grp
    FROM public.feedback_checkins
    WHERE date >= CURRENT_DATE - INTERVAL '90 days'
  ) sub
  WHERE grp = (
    SELECT date - 1::integer
    FROM public.feedback_checkins fc
    WHERE fc.athlete_id = sub.athlete_id
      AND fc.date = CURRENT_DATE
    LIMIT 1
  )
     OR date = CURRENT_DATE
  GROUP BY athlete_id, grp
  ORDER BY athlete_id
  LIMIT 1
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

-- =============================================================================
-- 16. Seed data: 11 global standard categories
-- =============================================================================

INSERT INTO public.feedback_categories (name, slug, type, unit, min_value, max_value, scale_labels, is_required, sort_order, icon, scope, created_by, target_athlete_id)
VALUES
  -- 1. Gewicht
  (
    '{"de": "Gewicht", "en": "Weight"}'::jsonb,
    'weight', 'number', 'kg', 20, 300, NULL,
    true, 1, 'scale', 'global', NULL, NULL
  ),
  -- 2. Schritte
  (
    '{"de": "Schritte", "en": "Steps"}'::jsonb,
    'steps', 'number', NULL, 0, 100000, NULL,
    false, 2, 'footprints', 'global', NULL, NULL
  ),
  -- 3. Kalorien
  (
    '{"de": "Kalorien", "en": "Calories"}'::jsonb,
    'calories', 'number', 'kcal', 0, 10000, NULL,
    false, 3, 'flame', 'global', NULL, NULL
  ),
  -- 4. Kohlenhydrate
  (
    '{"de": "Kohlenhydrate", "en": "Carbohydrates"}'::jsonb,
    'carbs', 'number', 'g', 0, 1000, NULL,
    false, 4, 'wheat', 'global', NULL, NULL
  ),
  -- 5. Eiweiß
  (
    '{"de": "Eiwei\u00df", "en": "Protein"}'::jsonb,
    'protein', 'number', 'g', 0, 500, NULL,
    false, 5, 'beef', 'global', NULL, NULL
  ),
  -- 6. Fett
  (
    '{"de": "Fett", "en": "Fat"}'::jsonb,
    'fat', 'number', 'g', 0, 500, NULL,
    false, 6, 'droplet', 'global', NULL, NULL
  ),
  -- 7. Hunger
  (
    '{"de": "Hunger", "en": "Hunger"}'::jsonb,
    'hunger', 'scale', NULL, 1, 5,
    '{"1": {"de": "Keiner", "en": "None"}, "2": {"de": "Gelegentlich", "en": "Occasional"}, "3": {"de": "Durchgehend leicht", "en": "Constant light"}, "4": {"de": "Durchgehend stark", "en": "Constant strong"}, "5": {"de": "Nicht aushaltbar", "en": "Unbearable"}}'::jsonb,
    false, 7, 'utensils', 'global', NULL, NULL
  ),
  -- 8. Menstruation
  (
    '{"de": "Menstruation", "en": "Menstruation"}'::jsonb,
    'menstruation', 'scale', NULL, 1, 5,
    '{"1": {"de": "Sehr leicht", "en": "Very light"}, "2": {"de": "Leicht", "en": "Light"}, "3": {"de": "Mittel", "en": "Medium"}, "4": {"de": "Stark", "en": "Heavy"}, "5": {"de": "Sehr stark", "en": "Very heavy"}}'::jsonb,
    false, 8, 'heart', 'global', NULL, NULL
  ),
  -- 9. Krankheit
  (
    '{"de": "Krankheit", "en": "Illness"}'::jsonb,
    'illness', 'scale', NULL, 1, 2,
    '{"1": {"de": "Leicht krank", "en": "Slightly sick"}, "2": {"de": "Krank", "en": "Sick"}}'::jsonb,
    false, 9, 'thermometer', 'global', NULL, NULL
  ),
  -- 10. Muskelkater
  (
    '{"de": "Muskelkater", "en": "Muscle soreness"}'::jsonb,
    'soreness', 'scale', NULL, 1, 2,
    '{"1": {"de": "Leicht", "en": "Light"}, "2": {"de": "Stark", "en": "Strong"}}'::jsonb,
    false, 10, 'zap', 'global', NULL, NULL
  ),
  -- 11. Notiz
  (
    '{"de": "Notiz", "en": "Note"}'::jsonb,
    'note', 'text', NULL, NULL, 300, NULL,
    false, 11, 'message-square', 'global', NULL, NULL
  );
