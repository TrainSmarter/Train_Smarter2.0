-- Migration: PROJ-11 DSGVO Bug Fixes (BUG-15, BUG-8, BUG-11)
--
-- BUG-15 (CRITICAL): Ensure user_consents is truly append-only (no UPDATE/DELETE)
-- BUG-8  (HIGH): Email anonymization handled in API route (no DB migration needed)
-- BUG-11 (HIGH): Add pg_cron cleanup function for pending_deletions after 30 days

-- =============================================================================
-- 1. BUG-15: Lock down user_consents — append-only audit trail
--    Drop any UPDATE or DELETE policies. Only SELECT + INSERT must remain.
--    This is idempotent — safe to run even if 20260315300000 already applied.
-- =============================================================================

-- Drop the overly permissive FOR ALL policy (covers UPDATE & DELETE)
DROP POLICY IF EXISTS "Users can update own consents" ON public.user_consents;

-- Ensure no standalone UPDATE or DELETE policies exist either
DROP POLICY IF EXISTS "Users can delete own consents" ON public.user_consents;

-- Verify: only these two policies should remain:
--   "Users can read own consents"   (FOR SELECT)
--   "Users can insert own consents" (FOR INSERT)

-- =============================================================================
-- 2. BUG-11: Automated cleanup of pending deletions after 30-day grace period
--    Creates a SECURITY DEFINER function that:
--    a) Finds all pending_deletions past their delete_after date
--    b) Anonymizes the auth.users email & clears user_metadata
--    c) Deletes profile data (CASCADE handles related tables)
--    d) Marks the pending_deletion as 'completed'
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_pending_deletions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  anon_email TEXT;
BEGIN
  FOR rec IN
    SELECT pd.id, pd.user_id
    FROM public.pending_deletions pd
    WHERE pd.status = 'pending'
      AND pd.delete_after < now()
  LOOP
    -- Build anonymized email
    anon_email := 'deleted_' || LEFT(rec.user_id::text, 8) || '@anonymized.local';

    -- Anonymize email and clear metadata in auth.users
    UPDATE auth.users
    SET
      email = anon_email,
      encrypted_password = '',
      raw_user_meta_data = '{}'::jsonb,
      raw_app_meta_data = raw_app_meta_data || jsonb_build_object(
        'deletion_completed', true,
        'deletion_completed_at', now()::text
      ),
      updated_at = now()
    WHERE id = rec.user_id;

    -- Delete profile (CASCADE will clean up related data)
    DELETE FROM public.profiles WHERE id = rec.user_id;

    -- Mark pending deletion as completed
    UPDATE public.pending_deletions
    SET status = 'completed'
    WHERE id = rec.id;

    RAISE LOG 'DSGVO cleanup: completed deletion for user %', rec.user_id;
  END LOOP;
END;
$$;

-- Grant execute to service_role only (not to authenticated users)
REVOKE ALL ON FUNCTION public.cleanup_pending_deletions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_pending_deletions() FROM authenticated;

-- =============================================================================
-- 3. Schedule pg_cron job — runs daily at 03:00 UTC
--    Requires pg_cron extension (enable via Supabase Dashboard: Database → Extensions)
--    If pg_cron is not yet enabled, this block will log a notice and skip.
-- =============================================================================

DO $$
BEGIN
  -- Check if pg_cron extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if present (idempotent)
    PERFORM cron.unschedule('dsgvo-cleanup-pending-deletions');

    -- Schedule daily cleanup at 03:00 UTC
    PERFORM cron.schedule(
      'dsgvo-cleanup-pending-deletions',
      '0 3 * * *',
      $$SELECT public.cleanup_pending_deletions()$$
    );

    RAISE NOTICE 'pg_cron job "dsgvo-cleanup-pending-deletions" scheduled (daily 03:00 UTC)';
  ELSE
    RAISE NOTICE 'pg_cron extension not enabled. Enable it via Supabase Dashboard → Database → Extensions, then run: SELECT cron.schedule(''dsgvo-cleanup-pending-deletions'', ''0 3 * * *'', $$SELECT public.cleanup_pending_deletions()$$);';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule pg_cron job: %. Enable pg_cron and schedule manually.', SQLERRM;
END;
$$;

-- =============================================================================
-- 4. Index on pending_deletions for efficient cleanup queries
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_pending_deletions_status_delete_after
  ON public.pending_deletions (status, delete_after)
  WHERE status = 'pending';
