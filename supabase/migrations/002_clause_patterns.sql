-- Run this in the Supabase SQL editor after 001_audit_events.sql.
-- Stores anonymised clause patterns for internal benchmarking (PRODUCT-01).
-- No RLS — table is written and read exclusively via service role key server-side.
-- Users never query this table directly.

CREATE TABLE IF NOT EXISTS public.clause_patterns (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_type   TEXT        NOT NULL,
  risk_level    TEXT        NOT NULL,
  contract_type TEXT,
  jurisdiction  TEXT,
  clause_text   TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clause_patterns_clause_type_idx  ON public.clause_patterns (clause_type);
CREATE INDEX IF NOT EXISTS clause_patterns_risk_level_idx   ON public.clause_patterns (risk_level);
CREATE INDEX IF NOT EXISTS clause_patterns_created_at_idx   ON public.clause_patterns (created_at DESC);
