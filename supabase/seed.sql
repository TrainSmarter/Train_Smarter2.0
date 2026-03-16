-- =============================================================================
-- Train Smarter 2.0 — E2E Test Seed Data
-- =============================================================================
-- Run via: supabase db reset (applies migrations, then this seed)
--
-- Creates two test users with stable UUIDs:
--   1. Trainer: test-trainer@train-smarter.at / TestTrainer123!
--   2. Athlete: test-athlete@train-smarter.at / TestAthlete123!
-- Plus: consents, role profiles, and an active connection between them.
-- =============================================================================

-- Stable UUIDs for test users (never change these)
DO $$
DECLARE
  trainer_uuid uuid := 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  athlete_uuid uuid := 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
BEGIN

  -- =========================================================================
  -- 1. Create auth users (local Supabase only — uses direct INSERT)
  -- =========================================================================
  -- Password hash for "TestTrainer123!" (bcrypt)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_user_meta_data, raw_app_meta_data,
    role, aud, created_at, updated_at
  ) VALUES (
    trainer_uuid,
    '00000000-0000-0000-0000-000000000000',
    'test-trainer@train-smarter.at',
    crypt('TestTrainer123!', gen_salt('bf')),
    now(), now(),
    jsonb_build_object(
      'first_name', 'Anna',
      'last_name', 'Müller',
      'locale', 'de'
    ),
    jsonb_build_object(
      'provider', 'email',
      'providers', ARRAY['email'],
      'roles', ARRAY['TRAINER'],
      'onboarding_completed', true
    ),
    'authenticated', 'authenticated', now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    trainer_uuid, trainer_uuid,
    'test-trainer@train-smarter.at', 'email',
    jsonb_build_object(
      'sub', trainer_uuid::text,
      'email', 'test-trainer@train-smarter.at',
      'email_verified', true
    ),
    now(), now(), now()
  ) ON CONFLICT DO NOTHING;

  -- Password hash for "TestAthlete123!" (bcrypt)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_user_meta_data, raw_app_meta_data,
    role, aud, created_at, updated_at
  ) VALUES (
    athlete_uuid,
    '00000000-0000-0000-0000-000000000000',
    'test-athlete@train-smarter.at',
    crypt('TestAthlete123!', gen_salt('bf')),
    now(), now(),
    jsonb_build_object(
      'first_name', 'Leo',
      'last_name', 'Schmidt',
      'locale', 'de'
    ),
    jsonb_build_object(
      'provider', 'email',
      'providers', ARRAY['email'],
      'roles', ARRAY['ATHLETE'],
      'onboarding_completed', true
    ),
    'authenticated', 'authenticated', now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    athlete_uuid, athlete_uuid,
    'test-athlete@train-smarter.at', 'email',
    jsonb_build_object(
      'sub', athlete_uuid::text,
      'email', 'test-athlete@train-smarter.at',
      'email_verified', true
    ),
    now(), now(), now()
  ) ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- 2. Profiles (trigger should auto-create, but ensure fields are correct)
  -- =========================================================================
  -- Wait briefly for trigger, then upsert to ensure correct values
  UPDATE public.profiles SET
    first_name = 'Anna',
    last_name = 'Müller',
    onboarding_completed = true,
    onboarding_step = 4,
    locale = 'de',
    timezone = 'Europe/Vienna'
  WHERE id = trainer_uuid;

  UPDATE public.profiles SET
    first_name = 'Leo',
    last_name = 'Schmidt',
    onboarding_completed = true,
    onboarding_step = 4,
    locale = 'de',
    timezone = 'Europe/Vienna'
  WHERE id = athlete_uuid;

  -- =========================================================================
  -- 3. GDPR Consents (required before role assignment)
  -- =========================================================================
  INSERT INTO public.user_consents (user_id, consent_type, granted, policy_version, ip_address)
  VALUES
    (trainer_uuid, 'terms_privacy', true, 'v1.0', '127.0.0.1'),
    (trainer_uuid, 'body_wellness_data', true, 'v1.0', '127.0.0.1'),
    (athlete_uuid, 'terms_privacy', true, 'v1.0', '127.0.0.1'),
    (athlete_uuid, 'body_wellness_data', true, 'v1.0', '127.0.0.1'),
    (athlete_uuid, 'nutrition_data', true, 'v1.0', '127.0.0.1')
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- 4. Role-specific profile extensions
  -- =========================================================================
  INSERT INTO public.trainer_profiles (id, organization_name, specialization, max_athletes)
  VALUES (trainer_uuid, 'E2E Test Gym', 'Athletiktraining', 100)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.athlete_profiles (id, height_cm, sport_type)
  VALUES (athlete_uuid, 182.0, 'Kraftsport')
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- 5. Active trainer ↔ athlete connection
  -- =========================================================================
  INSERT INTO public.trainer_athlete_connections (
    trainer_id, athlete_id, athlete_email, status,
    invited_at, connected_at,
    can_see_body_data, can_see_nutrition, can_see_calendar, can_see_analysis
  ) VALUES (
    trainer_uuid,
    athlete_uuid,
    'test-athlete@train-smarter.at',
    'active',
    now() - interval '1 day',
    now(),
    true, true, true, false
  ) ON CONFLICT DO NOTHING;

END $$;
