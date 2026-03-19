-- Fix: Allow trainers to read connected athletes' consent status
--
-- Root cause: The original RLS policy on user_consents only allows
-- auth.uid() = user_id (own consents). When a trainer views an athlete's
-- detail page, the consent query returned empty → false "consent revoked" warning.
--
-- Previous attempt used SECURITY DEFINER RPC functions, but PostgREST's
-- schema cache didn't pick them up (known issue with PgBouncer on hosted Supabase).
--
-- This simpler approach adds a second SELECT policy. PostgreSQL OR's all
-- SELECT policies together, so the trainer path works alongside the existing
-- "Users can read own consents" policy.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Trainers can read connected athlete consents'
      AND tablename = 'user_consents'
  ) THEN
    CREATE POLICY "Trainers can read connected athlete consents"
      ON public.user_consents FOR SELECT
      USING (
        EXISTS(
          SELECT 1 FROM public.trainer_athlete_connections
          WHERE trainer_id = auth.uid()
            AND athlete_id = user_consents.user_id
            AND status = 'active'
        )
      );
  END IF;
END
$$;
