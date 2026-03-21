-- Migration: Allow authenticated users to read AI-related admin_settings
-- BUG-1 fix: Trainers need to read ai_model and rate limit settings
-- but should NOT be able to read other admin settings, custom prompts, or write anything.
-- Custom prompts (ai_prompt_suggest_all, ai_prompt_optimize_field) are read
-- via server actions with admin verification, so trainers don't need direct DB access.

-- Add SELECT policy for authenticated users on specific AI-related keys
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
