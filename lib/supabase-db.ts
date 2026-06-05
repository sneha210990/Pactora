// Server-side Supabase PostgREST client.
// Uses the service role key so writes bypass RLS from trusted API routes.
// When SUPABASE_SERVICE_ROLE_KEY is not set, every function returns null/false
// and callers fall back to the file-based beta-store.

import type { AuditAction, AuditEvent } from './beta-store';
import type { DocumentAnalysisState } from './document-analysis-store';

export type DbDeal = {
  id: string;
  user_id: string;
  file_name: string;
  analyzed_at: string;
  risk_counts: { high: number; medium: number; low: number };
  clause_count: number;
  snapshot: DocumentAnalysisState;
  created_at: string;
};

function serviceKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

function supabaseUrl(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
}

export function isSupabaseDbConfigured(): boolean {
  return !!(supabaseUrl() && serviceKey());
}

async function dbFetch(path: string, init?: RequestInit): Promise<Response | null> {
  const url = supabaseUrl();
  const key = serviceKey();
  if (!url || !key) return null;

  try {
    return await fetch(`${url}/rest/v1${path}`, {
      ...init,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });
  } catch {
    return null;
  }
}

export async function dbInsertAuditEvent(params: {
  user_id: string | null;
  action: AuditAction;
  document_id?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  const res = await dbFetch('/audit_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: params.user_id,
      action: params.action,
      document_id: params.document_id ?? null,
      metadata: params.metadata ?? {},
    }),
  });
  return res !== null && res.ok;
}

export async function dbQueryAuditEvents(options: {
  userId?: string | null;
  limit?: number;
}): Promise<AuditEvent[] | null> {
  const limit = options.limit ?? 100;
  const userFilter = options.userId ? `&user_id=eq.${encodeURIComponent(options.userId)}` : '';
  const res = await dbFetch(
    `/audit_events?select=*${userFilter}&order=created_at.desc&limit=${limit}`,
    { headers: { Prefer: 'return=representation' } },
  );
  if (!res || !res.ok) return null;
  return res.json() as Promise<AuditEvent[]>;
}

export async function dbInsertDeal(params: {
  user_id: string;
  file_name: string;
  analyzed_at: string;
  risk_counts: { high: number; medium: number; low: number };
  clause_count: number;
  snapshot: DocumentAnalysisState;
}): Promise<DbDeal | null> {
  const res = await dbFetch('/deals', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(params),
  });
  if (!res || !res.ok) return null;
  const rows = await res.json() as DbDeal[];
  return rows[0] ?? null;
}

export async function dbListDeals(userId: string, limit = 50): Promise<DbDeal[] | null> {
  const res = await dbFetch(
    `/deals?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=${limit}`,
    { headers: { Prefer: 'return=representation' } },
  );
  if (!res || !res.ok) return null;
  return res.json() as Promise<DbDeal[]>;
}

export async function dbGetDeal(id: string, userId: string): Promise<DbDeal | null> {
  const res = await dbFetch(
    `/deals?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    { headers: { Prefer: 'return=representation' } },
  );
  if (!res || !res.ok) return null;
  const rows = await res.json() as DbDeal[];
  return rows[0] ?? null;
}

export async function dbInsertClausePattern(params: {
  clause_type: string;
  risk_level: string;
  contract_type: string | null;
  jurisdiction: string | null;
  clause_text: string;
}): Promise<boolean> {
  const res = await dbFetch('/clause_patterns', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(params),
  });
  return res !== null && res.ok;
}
