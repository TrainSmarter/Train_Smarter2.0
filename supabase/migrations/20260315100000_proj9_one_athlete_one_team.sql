-- Migration: PROJ-9 "Ein Athlet = Ein Team"
-- Changes the UNIQUE constraint on team_athletes from (team_id, athlete_id)
-- to just (athlete_id), enforcing that each athlete can only be in one team.
--
-- Steps:
-- 1. Clean up duplicates (keep only the newest assignment per athlete_id)
-- 2. Drop old UNIQUE constraint
-- 3. Add new UNIQUE constraint on athlete_id only

-- =============================================================================
-- 1. Clean up duplicate assignments: keep only the newest per athlete_id
-- =============================================================================

-- Delete all but the most recent assignment for each athlete_id
DELETE FROM public.team_athletes
WHERE id NOT IN (
  SELECT DISTINCT ON (athlete_id) id
  FROM public.team_athletes
  ORDER BY athlete_id, assigned_at DESC
);

-- =============================================================================
-- 2. Drop old UNIQUE constraint (team_id, athlete_id)
-- =============================================================================

ALTER TABLE public.team_athletes
  DROP CONSTRAINT uq_team_athlete;

-- =============================================================================
-- 3. Add new UNIQUE constraint on athlete_id only
-- =============================================================================

ALTER TABLE public.team_athletes
  ADD CONSTRAINT uq_athlete_one_team UNIQUE (athlete_id);

-- =============================================================================
-- 4. Drop the now-redundant index on athlete_id (UNIQUE constraint creates one)
-- =============================================================================

-- The UNIQUE constraint on athlete_id implicitly creates an index,
-- so we can drop the explicit one to avoid duplication.
DROP INDEX IF EXISTS idx_team_athletes_athlete;
