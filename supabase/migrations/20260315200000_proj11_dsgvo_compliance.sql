-- Migration: PROJ-11 DSGVO-Compliance & Datenschutz
-- Adds: ip_address to user_consents, data_exports table, pending_deletions table,
--        consent revocation cascade trigger

-- =============================================================================
-- 1. Add ip_address column to user_consents (Art. 7 documentation)
-- =============================================================================

ALTER TABLE public.user_consents
  ADD COLUMN IF NOT EXISTS ip_address text;

-- =============================================================================
-- 2. Create data_exports table (Art. 20 rate limiting & tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.data_exports (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          text        NOT NULL DEFAULT 'completed'
                              CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at    timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  file_path       text,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.data_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own exports"
  ON public.data_exports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exports"
  ON public.data_exports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 3. Create pending_deletions table (Art. 17 — 30-day grace period)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pending_deletions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id),
  requested_at    timestamptz NOT NULL DEFAULT now(),
  delete_after    timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_deletions ENABLE ROW LEVEL SECURITY;

-- No user-facing RLS policies — only accessed via service-role key

-- =============================================================================
-- 4. Consent revocation cascade trigger
--    When body_wellness_data or nutrition_data consent is revoked (granted=false),
--    automatically set corresponding can_see_* flags to false on all active
--    trainer_athlete_connections for that athlete.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_consent_revocation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act on revocation (granted = false)
  IF NEW.granted = false THEN
    IF NEW.consent_type = 'body_wellness_data' THEN
      UPDATE public.trainer_athlete_connections
      SET can_see_body_data = false
      WHERE athlete_id = NEW.user_id
        AND status = 'active';
    END IF;

    IF NEW.consent_type = 'nutrition_data' THEN
      UPDATE public.trainer_athlete_connections
      SET can_see_nutrition = false
      WHERE athlete_id = NEW.user_id
        AND status = 'active';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger fires on INSERT (append-only table — new rows represent consent changes)
CREATE TRIGGER on_consent_revocation
  AFTER INSERT ON public.user_consents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_consent_revocation();
