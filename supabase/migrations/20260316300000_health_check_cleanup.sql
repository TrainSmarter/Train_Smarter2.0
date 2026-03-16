-- Migration: Health Check & Cleanup utilities
-- Creates:
--   1. cleanup_orphaned_data() — removes orphaned profiles, consents, deletions, overrides
--   2. check_fk_cascade_config() — verifies FK cascade rules for critical tables
--   3. check_user_consents_rls() — detects UPDATE/DELETE policies on user_consents
-- All functions are SECURITY DEFINER, callable only by service_role.

-- =============================================================================
-- 1. cleanup_orphaned_data() — removes records referencing non-existent auth.users
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  deleted_profiles      integer := 0;
  deleted_consents      integer := 0;
  deleted_deletions     integer := 0;
  deleted_overrides     integer := 0;
BEGIN
  -- 1. Delete profiles where auth.users record does not exist
  WITH removed AS (
    DELETE FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.users u WHERE u.id = p.id
    )
    RETURNING p.id
  )
  SELECT COUNT(*) INTO deleted_profiles FROM removed;

  -- 2. Delete user_consents where auth.users record does not exist
  WITH removed AS (
    DELETE FROM public.user_consents uc
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.users u WHERE u.id = uc.user_id
    )
    RETURNING uc.id
  )
  SELECT COUNT(*) INTO deleted_consents FROM removed;

  -- 3. Delete pending_deletions where auth.users record does not exist
  WITH removed AS (
    DELETE FROM public.pending_deletions pd
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.users u WHERE u.id = pd.user_id
    )
    RETURNING pd.id
  )
  SELECT COUNT(*) INTO deleted_deletions FROM removed;

  -- 4. Delete feedback_category_overrides where profiles record does not exist
  --    (profiles FK cascades from auth.users, but overrides FK references profiles)
  WITH removed AS (
    DELETE FROM public.feedback_category_overrides fco
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = fco.user_id
    )
    RETURNING fco.id
  )
  SELECT COUNT(*) INTO deleted_overrides FROM removed;

  RAISE LOG 'cleanup_orphaned_data: profiles=%, consents=%, deletions=%, overrides=%',
    deleted_profiles, deleted_consents, deleted_deletions, deleted_overrides;

  RETURN jsonb_build_object(
    'deleted_profiles', deleted_profiles,
    'deleted_consents', deleted_consents,
    'deleted_pending_deletions', deleted_deletions,
    'deleted_category_overrides', deleted_overrides,
    'total', deleted_profiles + deleted_consents + deleted_deletions + deleted_overrides
  );
END;
$fn$;

-- Only service_role can call this function
REVOKE ALL ON FUNCTION public.cleanup_orphaned_data() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_orphaned_data() FROM authenticated;

-- =============================================================================
-- 2. check_fk_cascade_config() — returns FK constraints that should be CASCADE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_fk_cascade_config()
RETURNS TABLE (
  table_name    text,
  constraint_name text,
  delete_rule   text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- Check critical tables that reference auth.users and should CASCADE on delete
  SELECT
    tc.table_name::text,
    tc.constraint_name::text,
    rc.delete_rule::text
  FROM information_schema.table_constraints tc
  JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.constraint_schema = rc.constraint_schema
  JOIN information_schema.constraint_column_usage ccu
    ON rc.unique_constraint_name = ccu.constraint_name
    AND rc.unique_constraint_schema = ccu.constraint_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND ccu.table_schema = 'auth'
    AND ccu.table_name = 'users'
    AND tc.table_name IN ('profiles', 'pending_deletions', 'user_consents', 'data_exports')
  ORDER BY tc.table_name;
$$;

REVOKE ALL ON FUNCTION public.check_fk_cascade_config() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_fk_cascade_config() FROM authenticated;

-- =============================================================================
-- 3. check_user_consents_rls() — detects UPDATE/DELETE policies on user_consents
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_user_consents_rls()
RETURNS TABLE (
  policyname text,
  cmd        text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    pol.policyname::text,
    pol.cmd::text
  FROM pg_policies pol
  WHERE pol.schemaname = 'public'
    AND pol.tablename = 'user_consents'
    AND pol.cmd IN ('UPDATE', 'DELETE', 'ALL');
$$;

REVOKE ALL ON FUNCTION public.check_user_consents_rls() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_user_consents_rls() FROM authenticated;
