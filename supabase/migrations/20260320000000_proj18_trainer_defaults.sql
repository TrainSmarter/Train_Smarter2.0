-- Migration: PROJ-18 Trainer Default-Kategorien & Pflichtfeld-System
-- New table: trainer_category_defaults
-- Alter: feedback_category_overrides — add is_required column
-- New functions: set_athlete_category_required, copy_trainer_defaults_to_athlete

-- =============================================================================
-- 1. New table: trainer_category_defaults
-- =============================================================================

CREATE TABLE public.trainer_category_defaults (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid        NOT NULL REFERENCES public.feedback_categories(id) ON DELETE CASCADE,
  is_active   boolean     NOT NULL DEFAULT true,
  is_required boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_trainer_category_default UNIQUE (trainer_id, category_id),
  -- Required can only be true if active is true
  CONSTRAINT chk_required_needs_active CHECK (NOT is_required OR is_active)
);

ALTER TABLE public.trainer_category_defaults ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER on_trainer_category_defaults_updated
  BEFORE UPDATE ON public.trainer_category_defaults
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Index for trainer lookups
CREATE INDEX idx_trainer_category_defaults_trainer
  ON public.trainer_category_defaults(trainer_id);

-- =============================================================================
-- 2. RLS Policies — trainer_category_defaults
-- =============================================================================

CREATE POLICY "Trainers can read own defaults"
  ON public.trainer_category_defaults FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can insert own defaults"
  ON public.trainer_category_defaults FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update own defaults"
  ON public.trainer_category_defaults FOR UPDATE
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete own defaults"
  ON public.trainer_category_defaults FOR DELETE
  USING (auth.uid() = trainer_id);

-- =============================================================================
-- 3. Add is_required to feedback_category_overrides
-- =============================================================================

ALTER TABLE public.feedback_category_overrides
  ADD COLUMN IF NOT EXISTS is_required boolean NOT NULL DEFAULT false;

-- =============================================================================
-- 4. SECURITY DEFINER function: set_athlete_category_required
-- Allows a connected trainer to set is_required on an athlete's override
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_athlete_category_required(
  p_athlete_id  uuid,
  p_category_id uuid,
  p_is_required boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is connected to this athlete
  IF NOT EXISTS (
    SELECT 1 FROM public.trainer_athlete_connections
    WHERE trainer_id = auth.uid()
      AND athlete_id = p_athlete_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not connected to this athlete';
  END IF;

  -- Upsert the override row
  INSERT INTO public.feedback_category_overrides (user_id, category_id, is_active, is_required)
  VALUES (p_athlete_id, p_category_id, true, p_is_required)
  ON CONFLICT (user_id, category_id)
  DO UPDATE SET
    is_required = p_is_required,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_athlete_category_required(uuid, uuid, boolean)
  TO authenticated;

-- =============================================================================
-- 5. SECURITY DEFINER function: copy_trainer_defaults_to_athlete
-- Copies trainer's default settings into athlete's overrides on connection
-- =============================================================================

CREATE OR REPLACE FUNCTION public.copy_trainer_defaults_to_athlete(
  p_trainer_id  uuid,
  p_athlete_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
BEGIN
  -- Verify caller is the trainer who owns these defaults
  v_caller := auth.uid();
  IF v_caller IS NULL OR v_caller != p_trainer_id THEN
    RAISE EXCEPTION 'Not authorized: caller must be the trainer who owns these defaults';
  END IF;

  -- Verify trainer-athlete connection exists and is accepted
  IF NOT EXISTS (
    SELECT 1 FROM public.trainer_athlete_connections
    WHERE trainer_id = v_caller
      AND athlete_id = p_athlete_id
      AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'Not authorized: no accepted connection between trainer and athlete';
  END IF;

  -- Copy all trainer defaults into athlete overrides
  -- ON CONFLICT: update existing overrides with trainer defaults
  INSERT INTO public.feedback_category_overrides (user_id, category_id, is_active, is_required)
  SELECT
    p_athlete_id,
    d.category_id,
    d.is_active,
    d.is_required
  FROM public.trainer_category_defaults d
  WHERE d.trainer_id = p_trainer_id
  ON CONFLICT (user_id, category_id)
  DO UPDATE SET
    is_active = EXCLUDED.is_active,
    is_required = EXCLUDED.is_required,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.copy_trainer_defaults_to_athlete(uuid, uuid)
  TO authenticated;
