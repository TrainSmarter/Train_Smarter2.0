-- Migration: PROJ-20 Hierarchical Exercise Taxonomy System
-- Tables: category_dimensions, category_nodes, exercise_category_assignments
-- Utility Functions: compute_category_path, get_category_subtree, get_category_ancestors
-- Trigger: auto-compute path on INSERT/UPDATE
-- RLS: Admin global write, Trainer own node CRUD, all read global
-- Seed: 9 dimensions + movement_pattern tree (~60 nodes) + migration of existing data

-- =============================================================================
-- 1. Table: category_dimensions
-- =============================================================================

CREATE TABLE public.category_dimensions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text        NOT NULL UNIQUE,
  name          jsonb       NOT NULL,  -- { "de": "...", "en": "..." }
  description   jsonb,                 -- { "de": "...", "en": "..." } or null
  exercise_type text,                  -- NULL = all types
  scope         text        NOT NULL DEFAULT 'global',
  sort_order    integer     NOT NULL DEFAULT 0,
  is_deleted    boolean     NOT NULL DEFAULT false,
  deleted_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_dimension_exercise_type CHECK (
    exercise_type IS NULL
    OR exercise_type IN ('strength', 'endurance', 'speed', 'flexibility')
  ),
  CONSTRAINT chk_dimension_scope CHECK (scope IN ('global'))
);

ALTER TABLE public.category_dimensions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER on_category_dimensions_updated
  BEFORE UPDATE ON public.category_dimensions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Indexes
CREATE INDEX idx_category_dimensions_slug ON public.category_dimensions(slug);
CREATE INDEX idx_category_dimensions_not_deleted ON public.category_dimensions(is_deleted) WHERE is_deleted = false;
CREATE INDEX idx_category_dimensions_exercise_type ON public.category_dimensions(exercise_type);

-- =============================================================================
-- 2. Table: category_nodes
-- =============================================================================

CREATE TABLE public.category_nodes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_id    uuid        NOT NULL REFERENCES public.category_dimensions(id) ON DELETE CASCADE,
  parent_id       uuid        REFERENCES public.category_nodes(id) ON DELETE CASCADE,
  slug            text        NOT NULL,
  name            jsonb       NOT NULL,  -- { "de": "...", "en": "..." }
  description     jsonb,                 -- { "de": "...", "en": "..." } or null
  path            text        NOT NULL DEFAULT '',
  depth           integer     NOT NULL DEFAULT 0,
  icon            text,
  trainer_visible boolean     NOT NULL DEFAULT true,
  ai_hint         text,
  metadata        jsonb       DEFAULT '{}',
  scope           text        NOT NULL DEFAULT 'global',
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  sort_order      integer     NOT NULL DEFAULT 0,
  is_deleted      boolean     NOT NULL DEFAULT false,
  deleted_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_node_slug_per_parent UNIQUE (dimension_id, parent_id, slug),
  CONSTRAINT chk_node_depth CHECK (depth >= 0 AND depth <= 10),
  CONSTRAINT chk_node_scope CHECK (scope IN ('global', 'trainer')),
  CONSTRAINT chk_node_scope_creator CHECK (
    (scope = 'global' AND created_by IS NULL)
    OR (scope = 'trainer' AND created_by IS NOT NULL)
  )
);

ALTER TABLE public.category_nodes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER on_category_nodes_updated
  BEFORE UPDATE ON public.category_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Indexes
CREATE INDEX idx_category_nodes_dimension ON public.category_nodes(dimension_id);
CREATE INDEX idx_category_nodes_parent ON public.category_nodes(parent_id);
CREATE INDEX idx_category_nodes_path ON public.category_nodes(path text_pattern_ops);
CREATE INDEX idx_category_nodes_depth ON public.category_nodes(depth);
CREATE INDEX idx_category_nodes_scope ON public.category_nodes(scope);
CREATE INDEX idx_category_nodes_created_by ON public.category_nodes(created_by);
CREATE INDEX idx_category_nodes_not_deleted ON public.category_nodes(is_deleted) WHERE is_deleted = false;
CREATE INDEX idx_category_nodes_dimension_not_deleted ON public.category_nodes(dimension_id, is_deleted) WHERE is_deleted = false;

-- =============================================================================
-- 3. Table: exercise_category_assignments
-- =============================================================================

CREATE TABLE public.exercise_category_assignments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid        NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  node_id     uuid        NOT NULL REFERENCES public.category_nodes(id) ON DELETE CASCADE,
  assigned_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_exercise_category UNIQUE (exercise_id, node_id)
);

ALTER TABLE public.exercise_category_assignments ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_exercise_category_assignments_exercise ON public.exercise_category_assignments(exercise_id);
CREATE INDEX idx_exercise_category_assignments_node ON public.exercise_category_assignments(node_id);

-- =============================================================================
-- 4. Utility Function: compute_category_path
-- =============================================================================

CREATE OR REPLACE FUNCTION public.compute_category_path(p_node_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path text;
BEGIN
  WITH RECURSIVE ancestors AS (
    SELECT id, parent_id, slug, 1 AS lvl
    FROM public.category_nodes
    WHERE id = p_node_id
    UNION ALL
    SELECT cn.id, cn.parent_id, cn.slug, a.lvl + 1
    FROM public.category_nodes cn
    JOIN ancestors a ON cn.id = a.parent_id
  )
  SELECT string_agg(slug, '.' ORDER BY lvl DESC)
  INTO v_path
  FROM ancestors;

  RETURN COALESCE(v_path, '');
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_category_path(uuid) TO authenticated;

-- =============================================================================
-- 5. Utility Function: get_category_subtree
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_category_subtree(p_node_id uuid)
RETURNS SETOF public.category_nodes
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path text;
BEGIN
  SELECT path INTO v_path
  FROM public.category_nodes
  WHERE id = p_node_id;

  IF v_path IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.category_nodes
  WHERE path LIKE v_path || '.%'
    AND is_deleted = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_category_subtree(uuid) TO authenticated;

-- =============================================================================
-- 6. Utility Function: get_category_ancestors
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_category_ancestors(p_node_id uuid)
RETURNS SETOF public.category_nodes
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE ancestors AS (
    SELECT cn.*
    FROM public.category_nodes cn
    WHERE cn.id = (
      SELECT parent_id FROM public.category_nodes WHERE id = p_node_id
    )
    UNION ALL
    SELECT cn.*
    FROM public.category_nodes cn
    JOIN ancestors a ON cn.id = a.parent_id
  )
  SELECT * FROM ancestors;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_category_ancestors(uuid) TO authenticated;

-- =============================================================================
-- 7. Trigger: auto-compute path + depth on INSERT/UPDATE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_category_node_path_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_path text;
  v_parent_depth integer;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.path := NEW.slug;
    NEW.depth := 0;
  ELSE
    SELECT path, depth
    INTO v_parent_path, v_parent_depth
    FROM public.category_nodes
    WHERE id = NEW.parent_id;

    IF v_parent_path IS NULL THEN
      RAISE EXCEPTION 'Parent node % not found', NEW.parent_id;
    END IF;

    NEW.path := v_parent_path || '.' || NEW.slug;
    NEW.depth := v_parent_depth + 1;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_category_node_path
  BEFORE INSERT OR UPDATE OF parent_id, slug ON public.category_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_category_node_path_fn();

-- =============================================================================
-- 8. RLS Policies — category_dimensions
-- =============================================================================

-- SELECT: all authenticated users can read non-deleted dimensions
CREATE POLICY "Authenticated can read dimensions"
  ON public.category_dimensions FOR SELECT
  TO authenticated
  USING (is_deleted = false);

-- INSERT: only platform admins
CREATE POLICY "Admin can insert dimensions"
  ON public.category_dimensions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_admin());

-- UPDATE: only platform admins
CREATE POLICY "Admin can update dimensions"
  ON public.category_dimensions FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- DELETE: only platform admins
CREATE POLICY "Admin can delete dimensions"
  ON public.category_dimensions FOR DELETE
  TO authenticated
  USING (public.is_platform_admin());

-- =============================================================================
-- 9. RLS Policies — category_nodes
-- =============================================================================

-- SELECT: global nodes visible to all authenticated, trainer-scoped only to creator
CREATE POLICY "Anyone can read global nodes"
  ON public.category_nodes FOR SELECT
  TO authenticated
  USING (scope = 'global' AND is_deleted = false);

CREATE POLICY "Trainers can read own nodes"
  ON public.category_nodes FOR SELECT
  TO authenticated
  USING (scope = 'trainer' AND created_by = auth.uid() AND is_deleted = false);

-- INSERT: admin for global, trainer for own
CREATE POLICY "Admin can insert global nodes"
  ON public.category_nodes FOR INSERT
  TO authenticated
  WITH CHECK (scope = 'global' AND public.is_platform_admin());

CREATE POLICY "Trainers can insert own nodes"
  ON public.category_nodes FOR INSERT
  TO authenticated
  WITH CHECK (scope = 'trainer' AND created_by = auth.uid());

-- UPDATE: admin for global, trainer for own
CREATE POLICY "Admin can update global nodes"
  ON public.category_nodes FOR UPDATE
  TO authenticated
  USING (scope = 'global' AND public.is_platform_admin())
  WITH CHECK (scope = 'global' AND public.is_platform_admin());

CREATE POLICY "Trainers can update own nodes"
  ON public.category_nodes FOR UPDATE
  TO authenticated
  USING (scope = 'trainer' AND created_by = auth.uid())
  WITH CHECK (scope = 'trainer' AND created_by = auth.uid());

-- DELETE: admin for global, trainer for own
CREATE POLICY "Admin can delete global nodes"
  ON public.category_nodes FOR DELETE
  TO authenticated
  USING (scope = 'global' AND public.is_platform_admin());

CREATE POLICY "Trainers can delete own nodes"
  ON public.category_nodes FOR DELETE
  TO authenticated
  USING (scope = 'trainer' AND created_by = auth.uid());

-- =============================================================================
-- 10. RLS Policies — exercise_category_assignments
-- =============================================================================

-- SELECT: visible if the exercise is visible
CREATE POLICY "Category assignments readable via exercise visibility"
  ON public.exercise_category_assignments FOR SELECT
  TO authenticated
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

-- INSERT: only if user owns the exercise or is admin
CREATE POLICY "Exercise owner can insert category assignments"
  ON public.exercise_category_assignments FOR INSERT
  TO authenticated
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

-- DELETE: only if user owns the exercise or is admin
CREATE POLICY "Exercise owner can delete category assignments"
  ON public.exercise_category_assignments FOR DELETE
  TO authenticated
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
-- 11. Seed: 9 Category Dimensions
-- =============================================================================

-- Cross-cutting dimensions (exercise_type = NULL)
INSERT INTO public.category_dimensions (slug, name, description, exercise_type, sort_order) VALUES
  ('muscle_group',
   '{"de": "Muskelgruppe", "en": "Muscle Group"}'::jsonb,
   '{"de": "Primäre und sekundäre Zielmuskulatur", "en": "Primary and secondary target muscles"}'::jsonb,
   NULL, 1),
  ('equipment',
   '{"de": "Equipment", "en": "Equipment"}'::jsonb,
   '{"de": "Benötigte Trainingsgeräte", "en": "Required training equipment"}'::jsonb,
   NULL, 2),
  ('joint',
   '{"de": "Gelenk", "en": "Joint"}'::jsonb,
   '{"de": "Beteiligte Gelenke der Übung", "en": "Joints involved in the exercise"}'::jsonb,
   NULL, 3),
  ('laterality',
   '{"de": "Lateralität", "en": "Laterality"}'::jsonb,
   '{"de": "Seitigkeit der Übungsausführung", "en": "Laterality of exercise execution"}'::jsonb,
   NULL, 4),
  ('movement_plane',
   '{"de": "Bewegungsebene", "en": "Movement Plane"}'::jsonb,
   '{"de": "Anatomische Bewegungsebene", "en": "Anatomical plane of movement"}'::jsonb,
   NULL, 5);

-- Exercise-type specific dimensions
INSERT INTO public.category_dimensions (slug, name, description, exercise_type, sort_order) VALUES
  ('movement_pattern',
   '{"de": "Bewegungsmuster", "en": "Movement Pattern"}'::jsonb,
   '{"de": "Klassifikation des Kraftübungs-Bewegungsmusters", "en": "Strength exercise movement pattern classification"}'::jsonb,
   'strength', 6),
  ('endurance_type',
   '{"de": "Ausdauerart", "en": "Endurance Type"}'::jsonb,
   '{"de": "Art der Ausdauerbelastung", "en": "Type of endurance load"}'::jsonb,
   'endurance', 7),
  ('speed_type',
   '{"de": "Schnelligkeitsart", "en": "Speed Type"}'::jsonb,
   '{"de": "Art der Schnelligkeitsanforderung", "en": "Type of speed requirement"}'::jsonb,
   'speed', 8),
  ('flexibility_type',
   '{"de": "Beweglichkeitsart", "en": "Flexibility Type"}'::jsonb,
   '{"de": "Art der Beweglichkeitsübung", "en": "Type of flexibility exercise"}'::jsonb,
   'flexibility', 9);

-- =============================================================================
-- 12. Seed: Joint dimension nodes
-- =============================================================================

DO $$
DECLARE
  v_dim_id uuid;
BEGIN
  SELECT id INTO v_dim_id FROM public.category_dimensions WHERE slug = 'joint';

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, sort_order) VALUES
    (v_dim_id, NULL, 'shoulder',  '{"de": "Schulter", "en": "Shoulder"}'::jsonb, 1),
    (v_dim_id, NULL, 'hip',       '{"de": "Hüfte", "en": "Hip"}'::jsonb, 2),
    (v_dim_id, NULL, 'knee',      '{"de": "Knie", "en": "Knee"}'::jsonb, 3),
    (v_dim_id, NULL, 'ankle',     '{"de": "Sprunggelenk", "en": "Ankle"}'::jsonb, 4),
    (v_dim_id, NULL, 'elbow',     '{"de": "Ellenbogen", "en": "Elbow"}'::jsonb, 5),
    (v_dim_id, NULL, 'wrist',     '{"de": "Handgelenk", "en": "Wrist"}'::jsonb, 6),
    (v_dim_id, NULL, 'spine',     '{"de": "Wirbelsäule", "en": "Spine"}'::jsonb, 7);
END;
$$;

-- =============================================================================
-- 13. Seed: Laterality dimension nodes
-- =============================================================================

DO $$
DECLARE
  v_dim_id uuid;
BEGIN
  SELECT id INTO v_dim_id FROM public.category_dimensions WHERE slug = 'laterality';

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, sort_order) VALUES
    (v_dim_id, NULL, 'bilateral',    '{"de": "Bilateral", "en": "Bilateral"}'::jsonb, 1),
    (v_dim_id, NULL, 'unilateral',   '{"de": "Unilateral", "en": "Unilateral"}'::jsonb, 2),
    (v_dim_id, NULL, 'alternating',  '{"de": "Alternierend", "en": "Alternating"}'::jsonb, 3);
END;
$$;

-- =============================================================================
-- 14. Seed: Movement Plane dimension nodes
-- =============================================================================

DO $$
DECLARE
  v_dim_id uuid;
BEGIN
  SELECT id INTO v_dim_id FROM public.category_dimensions WHERE slug = 'movement_plane';

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, sort_order) VALUES
    (v_dim_id, NULL, 'sagittal',     '{"de": "Sagittal", "en": "Sagittal"}'::jsonb, 1),
    (v_dim_id, NULL, 'frontal',      '{"de": "Frontal", "en": "Frontal"}'::jsonb, 2),
    (v_dim_id, NULL, 'transverse',   '{"de": "Transversal", "en": "Transverse"}'::jsonb, 3);
END;
$$;

-- =============================================================================
-- 15. Seed: Endurance Type dimension nodes (placeholders)
-- =============================================================================

DO $$
DECLARE
  v_dim_id uuid;
BEGIN
  SELECT id INTO v_dim_id FROM public.category_dimensions WHERE slug = 'endurance_type';

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, sort_order) VALUES
    (v_dim_id, NULL, 'aerobic',      '{"de": "Aerob", "en": "Aerobic"}'::jsonb, 1),
    (v_dim_id, NULL, 'anaerobic',    '{"de": "Anaerob", "en": "Anaerobic"}'::jsonb, 2),
    (v_dim_id, NULL, 'continuous',   '{"de": "Kontinuierlich", "en": "Continuous"}'::jsonb, 3),
    (v_dim_id, NULL, 'interval',     '{"de": "Intervall", "en": "Interval"}'::jsonb, 4);
END;
$$;

-- =============================================================================
-- 16. Seed: Speed Type dimension nodes (placeholders)
-- =============================================================================

DO $$
DECLARE
  v_dim_id uuid;
BEGIN
  SELECT id INTO v_dim_id FROM public.category_dimensions WHERE slug = 'speed_type';

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, sort_order) VALUES
    (v_dim_id, NULL, 'sprint-start', '{"de": "Antritt", "en": "Sprint Start"}'::jsonb, 1),
    (v_dim_id, NULL, 'reaction',     '{"de": "Reaktion", "en": "Reaction"}'::jsonb, 2),
    (v_dim_id, NULL, 'agility',      '{"de": "Agilität", "en": "Agility"}'::jsonb, 3);
END;
$$;

-- =============================================================================
-- 17. Seed: Flexibility Type dimension nodes (placeholders)
-- =============================================================================

DO $$
DECLARE
  v_dim_id uuid;
BEGIN
  SELECT id INTO v_dim_id FROM public.category_dimensions WHERE slug = 'flexibility_type';

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, sort_order) VALUES
    (v_dim_id, NULL, 'static',       '{"de": "Statisch", "en": "Static"}'::jsonb, 1),
    (v_dim_id, NULL, 'dynamic',      '{"de": "Dynamisch", "en": "Dynamic"}'::jsonb, 2),
    (v_dim_id, NULL, 'ballistic',    '{"de": "Ballistisch", "en": "Ballistic"}'::jsonb, 3);
END;
$$;

-- =============================================================================
-- 18. Seed: Movement Pattern (Strength) — Full Tree (~60 nodes)
-- =============================================================================

DO $$
DECLARE
  v_dim_id uuid;
  -- Level 0: Root categories
  v_main uuid; v_assist uuid; v_core uuid; v_prep uuid;
  -- Main > Upper / Lower
  v_main_upper uuid; v_main_lower uuid;
  -- Main > Upper > Push / Pull
  v_main_upper_push uuid; v_main_upper_pull uuid;
  -- Main > Lower > Squat / Deadlift / Hinge
  v_main_lower_squat uuid; v_main_lower_deadlift uuid; v_main_lower_hinge uuid;
  -- Assist > Upper / Lower
  v_assist_upper uuid; v_assist_lower uuid;
  -- Assist > Upper > Push / Pull
  v_assist_upper_push uuid; v_assist_upper_pull uuid;
  -- Assist > Lower > Anterior / Posterior / Lateral
  v_assist_lower_anterior uuid; v_assist_lower_posterior uuid; v_assist_lower_lateral uuid;
  -- Core chains
  v_core_anterior uuid; v_core_posterior uuid; v_core_lateral uuid; v_core_rotational uuid;
BEGIN
  SELECT id INTO v_dim_id FROM public.category_dimensions WHERE slug = 'movement_pattern';

  -- ── Level 0: Root ──────────────────────────────────────────────
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, NULL, 'main', '{"de": "Hauptübungen", "en": "Main"}'::jsonb, true, 1)
  RETURNING id INTO v_main;

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, NULL, 'assist', '{"de": "Assistenzübungen", "en": "Assist"}'::jsonb, true, 2)
  RETURNING id INTO v_assist;

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, NULL, 'core', '{"de": "Core", "en": "Core"}'::jsonb, true, 3)
  RETURNING id INTO v_core;

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, NULL, 'prep', '{"de": "Prehab/Mobilität", "en": "Prep"}'::jsonb, true, 4)
  RETURNING id INTO v_prep;

  -- ── Main > Upper / Lower (depth 1) ────────────────────────────
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, v_main, 'upper', '{"de": "Oberkörper", "en": "Upper"}'::jsonb, true, 1)
  RETURNING id INTO v_main_upper;

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, v_main, 'lower', '{"de": "Unterkörper", "en": "Lower"}'::jsonb, true, 2)
  RETURNING id INTO v_main_lower;

  -- ── Main > Upper > Push / Pull (depth 2) ──────────────────────
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, v_main_upper, 'push', '{"de": "Drücken", "en": "Push"}'::jsonb, true, 1)
  RETURNING id INTO v_main_upper_push;

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, v_main_upper, 'pull', '{"de": "Ziehen", "en": "Pull"}'::jsonb, true, 2)
  RETURNING id INTO v_main_upper_pull;

  -- Main > Upper > Push > Vertical / Horizontal / Lateral (depth 3)
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order) VALUES
    (v_dim_id, v_main_upper_push, 'vertical',   '{"de": "Vertikal", "en": "Vertical"}'::jsonb, false, 1),
    (v_dim_id, v_main_upper_push, 'horizontal',  '{"de": "Horizontal", "en": "Horizontal"}'::jsonb, false, 2),
    (v_dim_id, v_main_upper_push, 'lateral',     '{"de": "Lateral", "en": "Lateral"}'::jsonb, false, 3);

  -- Main > Upper > Pull > Vertical / Horizontal / Lateral (depth 3)
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order) VALUES
    (v_dim_id, v_main_upper_pull, 'vertical',   '{"de": "Vertikal", "en": "Vertical"}'::jsonb, false, 1),
    (v_dim_id, v_main_upper_pull, 'horizontal',  '{"de": "Horizontal", "en": "Horizontal"}'::jsonb, false, 2),
    (v_dim_id, v_main_upper_pull, 'lateral',     '{"de": "Lateral", "en": "Lateral"}'::jsonb, false, 3);

  -- ── Main > Lower > Squat / Deadlift / Hinge (depth 2) ────────
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, v_main_lower, 'squat', '{"de": "Kniebeuge", "en": "Squat"}'::jsonb, true, 1)
  RETURNING id INTO v_main_lower_squat;

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, v_main_lower, 'deadlift', '{"de": "Kreuzheben", "en": "Deadlift"}'::jsonb, true, 2)
  RETURNING id INTO v_main_lower_deadlift;

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, v_main_lower, 'hinge', '{"de": "Hüftbeugung", "en": "Hinge"}'::jsonb, true, 3)
  RETURNING id INTO v_main_lower_hinge;

  -- Main > Lower > Squat > Sagittal / Frontal (depth 3)
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order) VALUES
    (v_dim_id, v_main_lower_squat, 'sagittal', '{"de": "Sagittal", "en": "Sagittal"}'::jsonb, false, 1),
    (v_dim_id, v_main_lower_squat, 'frontal',  '{"de": "Frontal", "en": "Frontal"}'::jsonb, false, 2);

  -- Main > Lower > Deadlift > Sagittal / Frontal (depth 3)
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order) VALUES
    (v_dim_id, v_main_lower_deadlift, 'sagittal', '{"de": "Sagittal", "en": "Sagittal"}'::jsonb, false, 1),
    (v_dim_id, v_main_lower_deadlift, 'frontal',  '{"de": "Frontal", "en": "Frontal"}'::jsonb, false, 2);

  -- Main > Lower > Hinge > Hamstring-dominant / Glute-dominant / Adductor-dominant (depth 3)
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order) VALUES
    (v_dim_id, v_main_lower_hinge, 'hamstring-dominant', '{"de": "Beinbeuger-dominant", "en": "Hamstring-dominant"}'::jsonb, false, 1),
    (v_dim_id, v_main_lower_hinge, 'glute-dominant',     '{"de": "Gesäß-dominant", "en": "Glute-dominant"}'::jsonb, false, 2),
    (v_dim_id, v_main_lower_hinge, 'adductor-dominant',  '{"de": "Adduktoren-dominant", "en": "Adductor-dominant"}'::jsonb, false, 3);

  -- ── Assist > Upper / Lower (depth 1) ──────────────────────────
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, v_assist, 'upper', '{"de": "Oberkörper", "en": "Upper"}'::jsonb, true, 1)
  RETURNING id INTO v_assist_upper;

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, v_assist, 'lower', '{"de": "Unterkörper", "en": "Lower"}'::jsonb, true, 2)
  RETURNING id INTO v_assist_lower;

  -- ── Assist > Upper > Push / Pull (depth 2) ────────────────────
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, v_assist_upper, 'push', '{"de": "Drücken", "en": "Push"}'::jsonb, true, 1)
  RETURNING id INTO v_assist_upper_push;

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, v_assist_upper, 'pull', '{"de": "Ziehen", "en": "Pull"}'::jsonb, true, 2)
  RETURNING id INTO v_assist_upper_pull;

  -- Assist > Upper > Push > Shoulders / Chest / Triceps (depth 3)
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order) VALUES
    (v_dim_id, v_assist_upper_push, 'shoulders', '{"de": "Schultern", "en": "Shoulders"}'::jsonb, false, 1),
    (v_dim_id, v_assist_upper_push, 'chest',     '{"de": "Brust", "en": "Chest"}'::jsonb, false, 2),
    (v_dim_id, v_assist_upper_push, 'triceps',   '{"de": "Trizeps", "en": "Triceps"}'::jsonb, false, 3);

  -- Assist > Upper > Pull > Latissimus / Trapezius / Biceps (depth 3)
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order) VALUES
    (v_dim_id, v_assist_upper_pull, 'latissimus', '{"de": "Latissimus", "en": "Latissimus"}'::jsonb, false, 1),
    (v_dim_id, v_assist_upper_pull, 'trapezius',  '{"de": "Trapez", "en": "Trapezius"}'::jsonb, false, 2),
    (v_dim_id, v_assist_upper_pull, 'biceps',     '{"de": "Bizeps", "en": "Biceps"}'::jsonb, false, 3);

  -- ── Assist > Lower > Anterior / Posterior / Lateral (depth 2) ─
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, v_assist_lower, 'anterior', '{"de": "Vordere Kette", "en": "Anterior"}'::jsonb, true, 1)
  RETURNING id INTO v_assist_lower_anterior;

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, v_assist_lower, 'posterior', '{"de": "Hintere Kette", "en": "Posterior"}'::jsonb, true, 2)
  RETURNING id INTO v_assist_lower_posterior;

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, v_assist_lower, 'lateral', '{"de": "Seitliche Kette", "en": "Lateral"}'::jsonb, true, 3)
  RETURNING id INTO v_assist_lower_lateral;

  -- Assist > Lower > Anterior > Quadriceps / Hip Flexors / Tibialis Ant. (depth 3)
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order) VALUES
    (v_dim_id, v_assist_lower_anterior, 'quadriceps',    '{"de": "Quadrizeps", "en": "Quadriceps"}'::jsonb, false, 1),
    (v_dim_id, v_assist_lower_anterior, 'hip-flexors',   '{"de": "Hüftbeuger", "en": "Hip Flexors"}'::jsonb, false, 2),
    (v_dim_id, v_assist_lower_anterior, 'tibialis-ant',  '{"de": "Tibialis Anterior", "en": "Tibialis Ant."}'::jsonb, false, 3);

  -- Assist > Lower > Posterior > Hamstrings / Gluteus Max. / Calf (depth 3)
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order) VALUES
    (v_dim_id, v_assist_lower_posterior, 'hamstrings',    '{"de": "Beinbeuger", "en": "Hamstrings"}'::jsonb, false, 1),
    (v_dim_id, v_assist_lower_posterior, 'gluteus-max',   '{"de": "Großer Gesäßmuskel", "en": "Gluteus Max."}'::jsonb, false, 2),
    (v_dim_id, v_assist_lower_posterior, 'calf',          '{"de": "Wade", "en": "Calf"}'::jsonb, false, 3);

  -- Assist > Lower > Lateral > Abductors / Adductors (depth 3)
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order) VALUES
    (v_dim_id, v_assist_lower_lateral, 'abductors',  '{"de": "Abduktoren", "en": "Abductors"}'::jsonb, false, 1),
    (v_dim_id, v_assist_lower_lateral, 'adductors',  '{"de": "Adduktoren", "en": "Adductors"}'::jsonb, false, 2);

  -- ── Core chains (depth 1) ─────────────────────────────────────
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, v_core, 'anterior-chain', '{"de": "Vordere Kette", "en": "Anterior Chain"}'::jsonb, true, 1)
  RETURNING id INTO v_core_anterior;

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, v_core, 'posterior-chain', '{"de": "Hintere Kette", "en": "Posterior Chain"}'::jsonb, true, 2)
  RETURNING id INTO v_core_posterior;

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, v_core, 'lateral-chain', '{"de": "Seitliche Kette", "en": "Lateral Chain"}'::jsonb, true, 3)
  RETURNING id INTO v_core_lateral;

  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order)
  VALUES (v_dim_id, v_core, 'rotational-chain', '{"de": "Rotationskette", "en": "Rotational Chain"}'::jsonb, true, 4)
  RETURNING id INTO v_core_rotational;

  -- Core > Anterior Chain > 3 types (depth 2)
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order) VALUES
    (v_dim_id, v_core_anterior, 'dynamic-flexion',           '{"de": "Dynamische Flexion", "en": "Dynamic Flexion"}'::jsonb, false, 1),
    (v_dim_id, v_core_anterior, 'anti-extension',            '{"de": "Anti-Extension", "en": "Anti-Extension"}'::jsonb, false, 2),
    (v_dim_id, v_core_anterior, 'reactive-anti-extension',   '{"de": "Reaktive Anti-Extension", "en": "Reactive Anti-Extension"}'::jsonb, false, 3);

  -- Core > Posterior Chain > 3 types (depth 2)
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order) VALUES
    (v_dim_id, v_core_posterior, 'dynamic-extension',        '{"de": "Dynamische Extension", "en": "Dynamic Extension"}'::jsonb, false, 1),
    (v_dim_id, v_core_posterior, 'anti-flexion',             '{"de": "Anti-Flexion", "en": "Anti-Flexion"}'::jsonb, false, 2),
    (v_dim_id, v_core_posterior, 'reactive-anti-flexion',    '{"de": "Reaktive Anti-Flexion", "en": "Reactive Anti-Flexion"}'::jsonb, false, 3);

  -- Core > Lateral Chain > 3 types (depth 2)
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order) VALUES
    (v_dim_id, v_core_lateral, 'dynamic-lateral-flexion',            '{"de": "Dynamische Lateralflexion", "en": "Dynamic Lateral Flexion"}'::jsonb, false, 1),
    (v_dim_id, v_core_lateral, 'anti-lateral-flexion',               '{"de": "Anti-Lateralflexion", "en": "Anti-Lateral Flexion"}'::jsonb, false, 2),
    (v_dim_id, v_core_lateral, 'reactive-anti-lateral-flexion',      '{"de": "Reaktive Anti-Lateralflexion", "en": "Reactive Anti-Lateral Flexion"}'::jsonb, false, 3);

  -- Core > Rotational Chain > 3 types (depth 2)
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order) VALUES
    (v_dim_id, v_core_rotational, 'dynamic-rotation',        '{"de": "Dynamische Rotation", "en": "Dynamic Rotation"}'::jsonb, false, 1),
    (v_dim_id, v_core_rotational, 'anti-rotation',           '{"de": "Anti-Rotation", "en": "Anti-Rotation"}'::jsonb, false, 2),
    (v_dim_id, v_core_rotational, 'reactive-anti-rotation',  '{"de": "Reaktive Anti-Rotation", "en": "Reactive Anti-Rotation"}'::jsonb, false, 3);

  -- ── Prep nodes (depth 1) ──────────────────────────────────────
  INSERT INTO public.category_nodes (dimension_id, parent_id, slug, name, trainer_visible, sort_order) VALUES
    (v_dim_id, v_prep, 'cervical-spine',  '{"de": "Halswirbelsäule", "en": "Cervical Spine"}'::jsonb, true, 1),
    (v_dim_id, v_prep, 'thoracic-spine',  '{"de": "Brustwirbelsäule", "en": "Thoracic Spine"}'::jsonb, true, 2),
    (v_dim_id, v_prep, 'lumbar-spine',    '{"de": "Lendenwirbelsäule", "en": "Lumbar Spine"}'::jsonb, true, 3),
    (v_dim_id, v_prep, 'shoulder',        '{"de": "Schulter", "en": "Shoulder"}'::jsonb, true, 4),
    (v_dim_id, v_prep, 'hip',             '{"de": "Hüfte", "en": "Hip"}'::jsonb, true, 5),
    (v_dim_id, v_prep, 'wrist',           '{"de": "Handgelenk", "en": "Wrist"}'::jsonb, true, 6),
    (v_dim_id, v_prep, 'knee',            '{"de": "Knie", "en": "Knee"}'::jsonb, true, 7),
    (v_dim_id, v_prep, 'ankle',           '{"de": "Sprunggelenk", "en": "Ankle"}'::jsonb, true, 8);
END;
$$;

-- =============================================================================
-- 19. Migration: Existing exercise_taxonomy → category_nodes
-- =============================================================================

-- Mapping table to track old → new IDs
CREATE TABLE public.taxonomy_migration_map (
  old_taxonomy_id uuid NOT NULL UNIQUE,
  new_node_id     uuid NOT NULL UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Migrate muscle_group entries
DO $$
DECLARE
  v_dim_id uuid;
  v_rec RECORD;
  v_new_id uuid;
BEGIN
  SELECT id INTO v_dim_id FROM public.category_dimensions WHERE slug = 'muscle_group';

  FOR v_rec IN
    SELECT id, name, scope, created_by, sort_order
    FROM public.exercise_taxonomy
    WHERE type = 'muscle_group' AND is_deleted = false
    ORDER BY sort_order
  LOOP
    -- Check if already migrated
    IF NOT EXISTS (SELECT 1 FROM public.taxonomy_migration_map WHERE old_taxonomy_id = v_rec.id) THEN
      -- Generate slug from English name (lowercase, spaces to hyphens)
      INSERT INTO public.category_nodes (
        dimension_id, parent_id, slug, name, scope, created_by, sort_order
      ) VALUES (
        v_dim_id,
        NULL,
        lower(replace(trim(v_rec.name->>'en'), ' ', '-')),
        v_rec.name,
        v_rec.scope,
        v_rec.created_by,
        v_rec.sort_order
      )
      RETURNING id INTO v_new_id;

      INSERT INTO public.taxonomy_migration_map (old_taxonomy_id, new_node_id)
      VALUES (v_rec.id, v_new_id);
    END IF;
  END LOOP;
END;
$$;

-- Migrate equipment entries
DO $$
DECLARE
  v_dim_id uuid;
  v_rec RECORD;
  v_new_id uuid;
BEGIN
  SELECT id INTO v_dim_id FROM public.category_dimensions WHERE slug = 'equipment';

  FOR v_rec IN
    SELECT id, name, scope, created_by, sort_order
    FROM public.exercise_taxonomy
    WHERE type = 'equipment' AND is_deleted = false
    ORDER BY sort_order
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.taxonomy_migration_map WHERE old_taxonomy_id = v_rec.id) THEN
      INSERT INTO public.category_nodes (
        dimension_id, parent_id, slug, name, scope, created_by, sort_order
      ) VALUES (
        v_dim_id,
        NULL,
        lower(replace(trim(v_rec.name->>'en'), ' ', '-')),
        v_rec.name,
        v_rec.scope,
        v_rec.created_by,
        v_rec.sort_order
      )
      RETURNING id INTO v_new_id;

      INSERT INTO public.taxonomy_migration_map (old_taxonomy_id, new_node_id)
      VALUES (v_rec.id, v_new_id);
    END IF;
  END LOOP;
END;
$$;

-- =============================================================================
-- 20. Migration: exercise_taxonomy_assignments → exercise_category_assignments
-- =============================================================================

INSERT INTO public.exercise_category_assignments (exercise_id, node_id, assigned_by)
SELECT
  eta.exercise_id,
  tmm.new_node_id,
  e.created_by
FROM public.exercise_taxonomy_assignments eta
JOIN public.taxonomy_migration_map tmm ON tmm.old_taxonomy_id = eta.taxonomy_id
JOIN public.exercises e ON e.id = eta.exercise_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercise_category_assignments eca
  WHERE eca.exercise_id = eta.exercise_id AND eca.node_id = tmm.new_node_id
);
