-- Fix: pending_deletions FK blocks auth.users deletion
-- Change from NO ACTION to CASCADE so deleting auth.users also removes pending_deletions

ALTER TABLE public.pending_deletions
  DROP CONSTRAINT pending_deletions_user_id_fkey;

ALTER TABLE public.pending_deletions
  ADD CONSTRAINT pending_deletions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update cleanup function to be robust
CREATE OR REPLACE FUNCTION public.cleanup_pending_deletions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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
    anon_email := 'deleted_' || LEFT(rec.user_id::text, 8) || '@anonymized.local';

    -- Anonymize auth.users
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

    -- Delete profile (CASCADE cleans up most related data)
    DELETE FROM public.profiles WHERE id = rec.user_id;

    -- Mark this pending deletion as completed (not deleted, for audit trail)
    UPDATE public.pending_deletions
    SET status = 'completed'
    WHERE id = rec.id;

    RAISE LOG 'DSGVO cleanup: completed deletion for user %', rec.user_id;
  END LOOP;
END;
$fn$;

REVOKE ALL ON FUNCTION public.cleanup_pending_deletions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_pending_deletions() FROM authenticated;
