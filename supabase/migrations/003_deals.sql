-- Run in Supabase Dashboard → SQL Editor after 002_clause_patterns.sql.
-- Stores completed analysis snapshots per user so deals survive across
-- devices and browser clears. Signed-in users get server-backed history;
-- guests continue to use localStorage only.

CREATE TABLE IF NOT EXISTS public.deals (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name    TEXT        NOT NULL,
  analyzed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  risk_counts  JSONB       NOT NULL DEFAULT '{}'::JSONB,
  clause_count INTEGER     NOT NULL DEFAULT 0,
  snapshot     JSONB       NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS deals_user_created_idx ON public.deals (user_id, created_at DESC);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Authenticated users may only read and write their own deals.
CREATE POLICY "Users can read own deals"
  ON public.deals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deals"
  ON public.deals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own deals"
  ON public.deals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
