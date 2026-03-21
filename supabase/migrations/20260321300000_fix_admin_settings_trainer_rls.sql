-- Migration: Tighten trainer RLS on admin_settings
-- Remove custom prompt keys from trainer-readable settings.
-- Server actions read prompts with admin verification already,
-- so trainers don't need direct DB read access to prompt templates.

-- Drop the old policy and recreate without prompt keys
DROP POLICY IF EXISTS "Authenticated users can read AI settings" ON public.admin_settings;

CREATE POLICY "Authenticated users can read AI settings"
  ON public.admin_settings FOR SELECT
  TO authenticated
  USING (
    key IN (
      'ai_model',
      'ai_extended_thinking',
      'ai_rate_limit_period',
      'ai_rate_limit_count'
    )
  );
