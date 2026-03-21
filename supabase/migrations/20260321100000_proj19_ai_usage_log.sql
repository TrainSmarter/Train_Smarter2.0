-- Migration: ai_usage_log table for PROJ-19 — KI-gestützte Übungserstellung
-- Tracks every AI call per user for rate limiting and audit.
-- RLS: Trainers read own entries, admin reads all, authenticated users insert own.

-- =============================================================================
-- 1. Table: ai_usage_log
-- =============================================================================

CREATE TABLE public.ai_usage_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id    text        NOT NULL,
  action_type text        NOT NULL CHECK (action_type IN ('suggest_all', 'optimize_field')),
  exercise_name text      NOT NULL DEFAULT '',
  field_name  text,       -- only set for 'optimize_field' actions
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. Indexes
-- =============================================================================

-- Composite index for rate-limit checks: COUNT(*) WHERE user_id = X AND created_at > Y
CREATE INDEX idx_ai_usage_log_user_created
  ON public.ai_usage_log(user_id, created_at DESC);

-- =============================================================================
-- 3. RLS Policies — ai_usage_log
-- =============================================================================

-- SELECT: Trainers can read their own entries (for usage display)
CREATE POLICY "Users can read own AI usage"
  ON public.ai_usage_log FOR SELECT
  USING (auth.uid() = user_id);

-- SELECT: Platform admins can read all entries (for overview)
CREATE POLICY "Admin can read all AI usage"
  ON public.ai_usage_log FOR SELECT
  USING (public.is_platform_admin());

-- INSERT: Authenticated users can insert their own entries
CREATE POLICY "Users can insert own AI usage"
  ON public.ai_usage_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policies — usage log is append-only (immutable audit trail)
