-- Migration: PROJ-5 Enhancement 3 — Add connection_type column
-- BUG-13: Missing connection_type discriminator for invite vs request flows

-- Add connection_type column with CHECK constraint
ALTER TABLE public.trainer_athlete_connections
  ADD COLUMN IF NOT EXISTS connection_type text NOT NULL DEFAULT 'invite';

ALTER TABLE public.trainer_athlete_connections
  ADD CONSTRAINT chk_connection_type
  CHECK (connection_type IN ('invite', 'request'));

-- Existing rows automatically receive 'invite' via DEFAULT
-- No backfill needed — all prior connections were invite-based

-- Index for filtering by connection_type (e.g. pending requests vs pending invites)
CREATE INDEX IF NOT EXISTS idx_connections_connection_type
  ON public.trainer_athlete_connections(connection_type)
  WHERE status = 'pending';
