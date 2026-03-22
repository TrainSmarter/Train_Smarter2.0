-- Migration: Fix PROJ-20 QA findings (BUG-14, BUG-16)
--
-- BUG-14: Enable RLS on taxonomy_migration_map (admin-only read access)
-- BUG-16: Document intentional missing UPDATE policy on exercise_category_assignments

-- =============================================================================
-- 1. RLS on taxonomy_migration_map (BUG-14)
-- =============================================================================

ALTER TABLE public.taxonomy_migration_map ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read the migration mapping table
CREATE POLICY "Platform admins can read taxonomy migration map"
  ON public.taxonomy_migration_map FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

-- =============================================================================
-- 2. Comment on exercise_category_assignments UPDATE policy (BUG-16)
-- =============================================================================

-- NOTE: There is intentionally NO UPDATE policy on exercise_category_assignments.
-- The application uses a DELETE + INSERT pattern to replace assignments atomically.
-- An UPDATE policy is not needed because rows are never modified in-place.
COMMENT ON TABLE public.exercise_category_assignments IS
  'Exercise-to-category-node assignments. Uses DELETE+INSERT pattern (no UPDATE policy needed).';
