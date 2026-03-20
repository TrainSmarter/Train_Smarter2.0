-- Migration: PROJ-12 Exercise Library
-- Tables: exercises, exercise_taxonomy, exercise_taxonomy_assignments
-- Helper: is_platform_admin() SECURITY DEFINER
-- RLS: Admin global write, Trainer own CRUD, all read global
-- Seed: 12 muscle groups + 6 equipment entries (scope='global')

-- =============================================================================
-- 0. Helper: is_platform_admin()
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    auth.jwt()->'app_metadata'->>'is_platform_admin' = 'true',
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- =============================================================================
-- 1. Table: exercise_taxonomy
-- =============================================================================

CREATE TABLE public.exercise_taxonomy (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        jsonb       NOT NULL,  -- { "de": "...", "en": "..." }
  type        text        NOT NULL,  -- 'muscle_group' | 'equipment'
  scope       text        NOT NULL DEFAULT 'global',
  created_by  uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  sort_order  integer     NOT NULL DEFAULT 0,
  is_deleted  boolean     NOT NULL DEFAULT false,
  deleted_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_taxonomy_type CHECK (type IN ('muscle_group', 'equipment')),
  CONSTRAINT chk_taxonomy_scope CHECK (scope IN ('global', 'trainer')),
  CONSTRAINT chk_taxonomy_scope_creator CHECK (
    (scope = 'global' AND created_by IS NULL)
    OR (scope = 'trainer' AND created_by IS NOT NULL)
  )
);

ALTER TABLE public.exercise_taxonomy ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER on_exercise_taxonomy_updated
  BEFORE UPDATE ON public.exercise_taxonomy
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Indexes
CREATE INDEX idx_exercise_taxonomy_type ON public.exercise_taxonomy(type);
CREATE INDEX idx_exercise_taxonomy_scope ON public.exercise_taxonomy(scope);
CREATE INDEX idx_exercise_taxonomy_created_by ON public.exercise_taxonomy(created_by);
CREATE INDEX idx_exercise_taxonomy_not_deleted ON public.exercise_taxonomy(is_deleted) WHERE is_deleted = false;

-- =============================================================================
-- 2. Table: exercises
-- =============================================================================

CREATE TABLE public.exercises (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          jsonb       NOT NULL,  -- { "de": "...", "en": "..." }
  description   jsonb,                 -- { "de": "...", "en": "..." } or null
  exercise_type text        NOT NULL,
  scope         text        NOT NULL DEFAULT 'global',
  created_by    uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  cloned_from   uuid        REFERENCES public.exercises(id) ON DELETE SET NULL,
  is_deleted    boolean     NOT NULL DEFAULT false,
  deleted_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_exercise_type CHECK (exercise_type IN ('strength', 'endurance', 'speed', 'flexibility')),
  CONSTRAINT chk_exercise_scope CHECK (scope IN ('global', 'trainer')),
  CONSTRAINT chk_exercise_scope_creator CHECK (
    (scope = 'global' AND created_by IS NULL)
    OR (scope = 'trainer' AND created_by IS NOT NULL)
  )
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER on_exercises_updated
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Indexes
CREATE INDEX idx_exercises_scope ON public.exercises(scope);
CREATE INDEX idx_exercises_created_by ON public.exercises(created_by);
CREATE INDEX idx_exercises_exercise_type ON public.exercises(exercise_type);
CREATE INDEX idx_exercises_not_deleted ON public.exercises(is_deleted) WHERE is_deleted = false;
CREATE INDEX idx_exercises_cloned_from ON public.exercises(cloned_from) WHERE cloned_from IS NOT NULL;

-- =============================================================================
-- 3. Table: exercise_taxonomy_assignments
-- =============================================================================

CREATE TABLE public.exercise_taxonomy_assignments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid        NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  taxonomy_id uuid        NOT NULL REFERENCES public.exercise_taxonomy(id) ON DELETE CASCADE,
  is_primary  boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_exercise_taxonomy UNIQUE (exercise_id, taxonomy_id)
);

ALTER TABLE public.exercise_taxonomy_assignments ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_exercise_taxonomy_assignments_exercise ON public.exercise_taxonomy_assignments(exercise_id);
CREATE INDEX idx_exercise_taxonomy_assignments_taxonomy ON public.exercise_taxonomy_assignments(taxonomy_id);

-- =============================================================================
-- 4. RLS Policies — exercise_taxonomy
-- =============================================================================

-- SELECT: global visible to all authenticated, trainer-scoped only to creator
CREATE POLICY "Anyone can read global taxonomy"
  ON public.exercise_taxonomy FOR SELECT
  USING (scope = 'global' AND is_deleted = false);

CREATE POLICY "Trainers can read own taxonomy"
  ON public.exercise_taxonomy FOR SELECT
  USING (scope = 'trainer' AND created_by = auth.uid() AND is_deleted = false);

-- INSERT: admin for global, trainer for own
CREATE POLICY "Admin can insert global taxonomy"
  ON public.exercise_taxonomy FOR INSERT
  WITH CHECK (scope = 'global' AND public.is_platform_admin());

CREATE POLICY "Trainers can insert own taxonomy"
  ON public.exercise_taxonomy FOR INSERT
  WITH CHECK (scope = 'trainer' AND created_by = auth.uid());

-- UPDATE: admin for global, trainer for own
CREATE POLICY "Admin can update global taxonomy"
  ON public.exercise_taxonomy FOR UPDATE
  USING (scope = 'global' AND public.is_platform_admin())
  WITH CHECK (scope = 'global' AND public.is_platform_admin());

CREATE POLICY "Trainers can update own taxonomy"
  ON public.exercise_taxonomy FOR UPDATE
  USING (scope = 'trainer' AND created_by = auth.uid())
  WITH CHECK (scope = 'trainer' AND created_by = auth.uid());

-- DELETE: admin for global, trainer for own
CREATE POLICY "Admin can delete global taxonomy"
  ON public.exercise_taxonomy FOR DELETE
  USING (scope = 'global' AND public.is_platform_admin());

CREATE POLICY "Trainers can delete own taxonomy"
  ON public.exercise_taxonomy FOR DELETE
  USING (scope = 'trainer' AND created_by = auth.uid());

-- =============================================================================
-- 5. RLS Policies — exercises
-- =============================================================================

-- SELECT: global visible to all authenticated, trainer-scoped only to creator
CREATE POLICY "Anyone can read global exercises"
  ON public.exercises FOR SELECT
  USING (scope = 'global' AND is_deleted = false);

CREATE POLICY "Trainers can read own exercises"
  ON public.exercises FOR SELECT
  USING (scope = 'trainer' AND created_by = auth.uid() AND is_deleted = false);

-- INSERT: admin for global, trainer for own
CREATE POLICY "Admin can insert global exercises"
  ON public.exercises FOR INSERT
  WITH CHECK (scope = 'global' AND public.is_platform_admin());

CREATE POLICY "Trainers can insert own exercises"
  ON public.exercises FOR INSERT
  WITH CHECK (scope = 'trainer' AND created_by = auth.uid());

-- UPDATE: admin for global, trainer for own
CREATE POLICY "Admin can update global exercises"
  ON public.exercises FOR UPDATE
  USING (scope = 'global' AND public.is_platform_admin())
  WITH CHECK (scope = 'global' AND public.is_platform_admin());

CREATE POLICY "Trainers can update own exercises"
  ON public.exercises FOR UPDATE
  USING (scope = 'trainer' AND created_by = auth.uid())
  WITH CHECK (scope = 'trainer' AND created_by = auth.uid());

-- DELETE: admin for global, trainer for own
CREATE POLICY "Admin can delete global exercises"
  ON public.exercises FOR DELETE
  USING (scope = 'global' AND public.is_platform_admin());

CREATE POLICY "Trainers can delete own exercises"
  ON public.exercises FOR DELETE
  USING (scope = 'trainer' AND created_by = auth.uid());

-- =============================================================================
-- 6. RLS Policies — exercise_taxonomy_assignments
-- =============================================================================

-- SELECT: visible if the exercise is visible (via join check)
CREATE POLICY "Assignments readable via exercise visibility"
  ON public.exercise_taxonomy_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_id
        AND e.is_deleted = false
        AND (
          e.scope = 'global'
          OR (e.scope = 'trainer' AND e.created_by = auth.uid())
        )
    )
  );

-- INSERT: only if user owns the exercise
CREATE POLICY "Exercise owner can insert assignments"
  ON public.exercise_taxonomy_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_id
        AND (
          (e.scope = 'trainer' AND e.created_by = auth.uid())
          OR (e.scope = 'global' AND public.is_platform_admin())
        )
    )
  );

-- UPDATE: only if user owns the exercise
CREATE POLICY "Exercise owner can update assignments"
  ON public.exercise_taxonomy_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_id
        AND (
          (e.scope = 'trainer' AND e.created_by = auth.uid())
          OR (e.scope = 'global' AND public.is_platform_admin())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_id
        AND (
          (e.scope = 'trainer' AND e.created_by = auth.uid())
          OR (e.scope = 'global' AND public.is_platform_admin())
        )
    )
  );

-- DELETE: only if user owns the exercise
CREATE POLICY "Exercise owner can delete assignments"
  ON public.exercise_taxonomy_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_id
        AND (
          (e.scope = 'trainer' AND e.created_by = auth.uid())
          OR (e.scope = 'global' AND public.is_platform_admin())
        )
    )
  );

-- =============================================================================
-- 7. Seed: 12 Muscle Groups (global, scope='global', created_by=NULL)
-- =============================================================================

INSERT INTO public.exercise_taxonomy (name, type, scope, created_by, sort_order) VALUES
  ('{"de": "Brust", "en": "Chest"}'::jsonb, 'muscle_group', 'global', NULL, 1),
  ('{"de": "Rücken", "en": "Back"}'::jsonb, 'muscle_group', 'global', NULL, 2),
  ('{"de": "Schultern", "en": "Shoulders"}'::jsonb, 'muscle_group', 'global', NULL, 3),
  ('{"de": "Bizeps", "en": "Biceps"}'::jsonb, 'muscle_group', 'global', NULL, 4),
  ('{"de": "Trizeps", "en": "Triceps"}'::jsonb, 'muscle_group', 'global', NULL, 5),
  ('{"de": "Unterarme", "en": "Forearms"}'::jsonb, 'muscle_group', 'global', NULL, 6),
  ('{"de": "Quadrizeps", "en": "Quadriceps"}'::jsonb, 'muscle_group', 'global', NULL, 7),
  ('{"de": "Hamstrings", "en": "Hamstrings"}'::jsonb, 'muscle_group', 'global', NULL, 8),
  ('{"de": "Waden", "en": "Calves"}'::jsonb, 'muscle_group', 'global', NULL, 9),
  ('{"de": "Gluteus", "en": "Glutes"}'::jsonb, 'muscle_group', 'global', NULL, 10),
  ('{"de": "Core", "en": "Core"}'::jsonb, 'muscle_group', 'global', NULL, 11),
  ('{"de": "Nacken", "en": "Neck"}'::jsonb, 'muscle_group', 'global', NULL, 12);

-- =============================================================================
-- 8. Seed: 6 Equipment entries (global, scope='global', created_by=NULL)
-- =============================================================================

INSERT INTO public.exercise_taxonomy (name, type, scope, created_by, sort_order) VALUES
  ('{"de": "Langhantel", "en": "Barbell"}'::jsonb, 'equipment', 'global', NULL, 1),
  ('{"de": "Kurzhantel", "en": "Dumbbell"}'::jsonb, 'equipment', 'global', NULL, 2),
  ('{"de": "Kettlebell", "en": "Kettlebell"}'::jsonb, 'equipment', 'global', NULL, 3),
  ('{"de": "Körpergewicht", "en": "Bodyweight"}'::jsonb, 'equipment', 'global', NULL, 4),
  ('{"de": "Maschine", "en": "Machine"}'::jsonb, 'equipment', 'global', NULL, 5),
  ('{"de": "Kabelzug", "en": "Cable"}'::jsonb, 'equipment', 'global', NULL, 6);
