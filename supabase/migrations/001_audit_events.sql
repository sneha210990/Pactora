-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Creates the audit_events table with RLS so users can only read their own records.
-- The service role key (SUPABASE_SERVICE_ROLE_KEY) bypasses RLS for server writes.

CREATE TABLE IF NOT EXISTS public.audit_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action       TEXT        NOT NULL,
  document_id  TEXT,
  metadata     JSONB       NOT NULL DEFAULT '{}'::JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_events_user_id_idx  ON public.audit_events (user_id);
CREATE INDEX IF NOT EXISTS audit_events_created_at_idx ON public.audit_events (created_at DESC);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users may only read their own rows.
CREATE POLICY "Users can read own audit events"
  ON public.audit_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
