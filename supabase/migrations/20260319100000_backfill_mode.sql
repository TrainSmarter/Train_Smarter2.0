-- Migration: Change feedback_backfill_days (integer) to feedback_backfill_mode (text)
-- The old column is kept for backwards compatibility but is deprecated.

-- 1. Add the new column with CHECK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'trainer_athlete_connections'
      AND column_name = 'feedback_backfill_mode'
  ) THEN
    ALTER TABLE public.trainer_athlete_connections
      ADD COLUMN feedback_backfill_mode text NOT NULL DEFAULT 'current_week'
      CONSTRAINT chk_feedback_backfill_mode CHECK (feedback_backfill_mode IN ('current_week', 'two_weeks', 'unlimited'));
  END IF;
END
$$;

-- 2. Backfill existing rows based on the old feedback_backfill_days value
--    <= 7 days  -> current_week
--    <= 14 days -> two_weeks
--    > 14 days  -> unlimited  (should not occur with old CHECK 1..14, but safe fallback)
UPDATE public.trainer_athlete_connections
SET feedback_backfill_mode = CASE
  WHEN feedback_backfill_days <= 7 THEN 'current_week'
  WHEN feedback_backfill_days <= 14 THEN 'two_weeks'
  ELSE 'unlimited'
END
WHERE feedback_backfill_mode = 'current_week'; -- only touch rows that still have the default

-- 3. Mark the old column as deprecated (comment only — column is NOT dropped)
COMMENT ON COLUMN public.trainer_athlete_connections.feedback_backfill_days
  IS 'DEPRECATED: Use feedback_backfill_mode instead. Kept for backwards compatibility.';
