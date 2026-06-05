import { NextResponse } from 'next/server';
import { getCurrentSessionUser } from '@/lib/auth';
import { isSupabaseDbConfigured, dbInsertDeal, dbListDeals } from '@/lib/supabase-db';
import type { DocumentAnalysisState } from '@/lib/document-analysis-store';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getCurrentSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  if (!isSupabaseDbConfigured()) return NextResponse.json({ deals: [] });

  const authUserId = session.user.auth_user_id ?? session.user.id;
  const deals = await dbListDeals(authUserId);
  return NextResponse.json({ deals: deals ?? [] });
}

export async function POST(request: Request) {
  const session = await getCurrentSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  if (!isSupabaseDbConfigured()) return NextResponse.json({ error: 'Server storage not configured.' }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const snapshot = b.snapshot as DocumentAnalysisState | undefined;
  if (!snapshot) return NextResponse.json({ error: 'snapshot required.' }, { status: 400 });

  const clauses = (snapshot.clauses ?? []) as Array<{ riskLevel?: string }>;
  const authUserId = session.user.auth_user_id ?? session.user.id;

  const deal = await dbInsertDeal({
    user_id: authUserId,
    file_name: snapshot.documentMeta?.fileName ?? 'Untitled contract',
    analyzed_at: new Date().toISOString(),
    risk_counts: {
      high: clauses.filter((c) => c.riskLevel === 'High').length,
      medium: clauses.filter((c) => c.riskLevel === 'Medium').length,
      low: clauses.filter((c) => c.riskLevel === 'Low').length,
    },
    clause_count: clauses.length,
    snapshot,
  });

  if (!deal) return NextResponse.json({ error: 'Failed to save deal.' }, { status: 500 });
  return NextResponse.json({ deal });
}
