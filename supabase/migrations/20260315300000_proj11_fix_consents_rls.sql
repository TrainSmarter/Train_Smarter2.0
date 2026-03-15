-- Migration: PROJ-11 Fix user_consents RLS (BUG-15)
-- The "Users can update own consents" policy uses FOR ALL which allows
-- UPDATE and DELETE, breaking the legally required append-only audit trail.
-- Fix: Drop the overly permissive policy. Only SELECT and INSERT remain.

DROP POLICY IF EXISTS "Users can update own consents" ON public.user_consents;
