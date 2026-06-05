-- Durable per-IP rate-limit storage.
--
-- This table is a dumb key->timestamps store. ALL rate-limit decision logic
-- lives in TypeScript (lib/rate-limit.ts) — there is intentionally no SQL
-- function here. Each row holds one client IP and a JSON array of the request
-- timestamps (epoch ms) seen inside the current sliding window.
--
-- Run once in the Supabase dashboard → SQL Editor (Production project).

create table if not exists rate_limits (
  bucket_key  text primary key,            -- the client IP
  hits        jsonb not null default '[]', -- array of epoch-ms timestamps within the window
  updated_at  timestamptz not null default now()
);

-- RLS on with NO policies: the public anon key (shipped to browsers) can never
-- read or tamper with the counters. Only the server-side service-role key,
-- which bypasses RLS, can touch this table.
alter table rate_limits enable row level security;

-- Optional housekeeping for IPs that never return (rows are otherwise tiny and
-- self-trimming, since we only ever store timestamps inside the window):
--   delete from rate_limits where updated_at < now() - interval '1 day';
