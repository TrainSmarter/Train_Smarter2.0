-- Migration: PROJ-5 Athleten-Management
-- Tables: trainer_athlete_connections, trainer_profiles, athlete_profiles
-- Convention: All timestamps use timestamptz (never timestamp without tz)

-- =============================================================================
-- 1. Add email column to profiles (synced from auth.users)
-- =============================================================================

-- Frontend joins profiles for email display; auth.users is not directly queryable
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Backfill existing profiles with email from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- Update handle_new_user() to also copy email on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Sync email changes from auth.users -> profiles
CREATE OR REPLACE FUNCTION public.handle_user_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_email_change();

-- =============================================================================
-- 2. Add timezone to profiles (needed for PROJ-6 server-side date logic)
-- =============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/Vienna';

-- =============================================================================
-- 3. Role-specific profile extension tables
-- =============================================================================

-- Trainer-specific profile data (1:1 with profiles)
CREATE TABLE public.trainer_profiles (
  id                uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_name text,
  specialization    text,
  max_athletes      integer     NOT NULL DEFAULT 100,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trainer_profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER on_trainer_profiles_updated
  BEFORE UPDATE ON public.trainer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Athlete-specific profile data (1:1 with profiles)
CREATE TABLE public.athlete_profiles (
  id            uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  height_cm     numeric(5,1),
  sport_type    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER on_athlete_profiles_updated
  BEFORE UPDATE ON public.athlete_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 4. Trainer-Athlete connections
-- =============================================================================

CREATE TYPE public.connection_status AS ENUM (
  'pending',
  'active',
  'rejected',
  'disconnected'
);

CREATE TABLE public.trainer_athlete_connections (
  id                      uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id              uuid              NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id              uuid              REFERENCES public.profiles(id) ON DELETE CASCADE,  -- NULL for pending invites
  athlete_email           text              NOT NULL,  -- Always set; used to match pending invites
  status                  connection_status NOT NULL DEFAULT 'pending',

  -- Invitation data
  invited_at              timestamptz       NOT NULL DEFAULT now(),
  invitation_message      text,
  invitation_expires_at   timestamptz       NOT NULL DEFAULT (now() + interval '7 days'),

  -- Lifecycle timestamps
  connected_at            timestamptz,
  rejected_at             timestamptz,
  disconnected_at         timestamptz,

  -- Granular data visibility (athlete controls these)
  can_see_body_data       boolean           NOT NULL DEFAULT true,
  can_see_nutrition       boolean           NOT NULL DEFAULT false,
  can_see_calendar        boolean           NOT NULL DEFAULT true,

  -- Trainer-controlled visibility
  can_see_analysis        boolean           NOT NULL DEFAULT false,

  created_at              timestamptz       NOT NULL DEFAULT now(),
  updated_at              timestamptz       NOT NULL DEFAULT now(),

  -- Self-invite prevention (only when athlete_id is set)
  CHECK (athlete_id IS NULL OR trainer_id != athlete_id)
);

ALTER TABLE public.trainer_athlete_connections ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER on_connections_updated
  BEFORE UPDATE ON public.trainer_athlete_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 5. Indexes for common queries
-- =============================================================================

-- Trainer's athletes list (filtered by status)
CREATE INDEX idx_connections_trainer_status
  ON public.trainer_athlete_connections(trainer_id, status);

-- Athlete's trainer lookup (filtered by status)
CREATE INDEX idx_connections_athlete_status
  ON public.trainer_athlete_connections(athlete_id, status)
  WHERE athlete_id IS NOT NULL;

-- Pending invitation lookup by email (athlete side)
CREATE INDEX idx_connections_athlete_email_pending
  ON public.trainer_athlete_connections(athlete_email, status)
  WHERE status = 'pending';

-- Expired invitation cleanup query
CREATE INDEX idx_connections_pending_expires
  ON public.trainer_athlete_connections(status, invitation_expires_at)
  WHERE status = 'pending';

-- Prevent duplicate active connections (trainer + athlete_id)
CREATE UNIQUE INDEX idx_unique_active_connection
  ON public.trainer_athlete_connections(trainer_id, athlete_id)
  WHERE status = 'active' AND athlete_id IS NOT NULL;

-- Prevent duplicate pending invitations (trainer + athlete_email)
CREATE UNIQUE INDEX idx_unique_pending_invitation
  ON public.trainer_athlete_connections(trainer_id, athlete_email)
  WHERE status = 'pending';

-- BUG-4: Enforce 1 trainer per athlete (only one active connection per athlete)
CREATE UNIQUE INDEX idx_unique_athlete_active_trainer
  ON public.trainer_athlete_connections(athlete_id)
  WHERE status = 'active' AND athlete_id IS NOT NULL;

-- BUG-9: Database-level CHECK constraint on invitation_message length
ALTER TABLE public.trainer_athlete_connections
  ADD CONSTRAINT chk_invitation_message_length
  CHECK (invitation_message IS NULL OR length(invitation_message) <= 500);

-- =============================================================================
-- 6. RLS Policies
-- =============================================================================

-- Trainer policies
CREATE POLICY "Trainers can read own connections"
  ON public.trainer_athlete_connections FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can insert connections (invite)"
  ON public.trainer_athlete_connections FOR INSERT
  WITH CHECK (
    auth.uid() = trainer_id
    AND public.has_role('TRAINER')
  );

CREATE POLICY "Trainers can update own connections"
  ON public.trainer_athlete_connections FOR UPDATE
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

-- Athlete policies (by athlete_id for active connections)
CREATE POLICY "Athletes can read own connections"
  ON public.trainer_athlete_connections FOR SELECT
  USING (auth.uid() = athlete_id);

-- Athlete policies (by athlete_email for pending invitations)
CREATE POLICY "Athletes can read pending invitations by email"
  ON public.trainer_athlete_connections FOR SELECT
  USING (
    status = 'pending'
    AND athlete_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Athletes can update own connections (accept/reject/visibility)"
  ON public.trainer_athlete_connections FOR UPDATE
  USING (
    auth.uid() = athlete_id
    OR (
      status = 'pending'
      AND athlete_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    auth.uid() = athlete_id
    OR (
      status = 'pending'
      AND athlete_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Trainer profiles: readable by self and connected athletes
CREATE POLICY "Users can read own trainer profile"
  ON public.trainer_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own trainer profile"
  ON public.trainer_profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Connected athletes can read trainer profile"
  ON public.trainer_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_athlete_connections
      WHERE trainer_id = trainer_profiles.id
        AND athlete_id = auth.uid()
        AND status = 'active'
    )
  );

-- Athlete profiles: readable by self and connected trainers
CREATE POLICY "Users can read own athlete profile"
  ON public.athlete_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own athlete profile"
  ON public.athlete_profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Connected trainers can read athlete profile"
  ON public.athlete_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_athlete_connections
      WHERE athlete_id = athlete_profiles.id
        AND trainer_id = auth.uid()
        AND status = 'active'
    )
  );

-- Profiles: trainers can read connected athlete profiles (email, name, avatar)
CREATE POLICY "Trainers can read connected athlete profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_athlete_connections
      WHERE athlete_id = profiles.id
        AND trainer_id = auth.uid()
        AND status IN ('pending', 'active')
    )
  );

-- Athletes can read their trainer's profile
CREATE POLICY "Athletes can read connected trainer profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_athlete_connections
      WHERE trainer_id = profiles.id
        AND (
          athlete_id = auth.uid()
          OR (
            status = 'pending'
            AND athlete_email = (SELECT email FROM auth.users WHERE id = auth.uid())
          )
        )
        AND status IN ('pending', 'active')
    )
  );
