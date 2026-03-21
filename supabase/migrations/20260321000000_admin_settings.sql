-- Migration: admin_settings table for PROJ-12 AI configuration
-- Stores key-value admin settings (e.g., AI model preference)
-- RLS: Only platform admins can read/write

-- =============================================================================
-- 1. Table: admin_settings
-- =============================================================================

CREATE TABLE public.admin_settings (
  key         text        PRIMARY KEY,
  value       jsonb       NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid        REFERENCES auth.users(id)
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Index on updated_by for audit trail lookups
CREATE INDEX idx_admin_settings_updated_by ON public.admin_settings(updated_by);

-- Auto-update updated_at on changes
CREATE TRIGGER on_admin_settings_updated
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 2. RLS Policies — admin_settings
-- =============================================================================

-- SELECT: Only platform admins
CREATE POLICY "Admin can read settings"
  ON public.admin_settings FOR SELECT
  USING (public.is_platform_admin());

-- INSERT: Only platform admins
CREATE POLICY "Admin can insert settings"
  ON public.admin_settings FOR INSERT
  WITH CHECK (public.is_platform_admin());

-- UPDATE: Only platform admins
CREATE POLICY "Admin can update settings"
  ON public.admin_settings FOR UPDATE
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- DELETE: Only platform admins
CREATE POLICY "Admin can delete settings"
  ON public.admin_settings FOR DELETE
  USING (public.is_platform_admin());

-- =============================================================================
-- 3. Seed: Default AI model setting
-- =============================================================================

INSERT INTO public.admin_settings (key, value)
VALUES ('ai_model', '"claude-haiku-4-5-20251001"');
