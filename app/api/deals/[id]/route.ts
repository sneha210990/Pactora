import { NextResponse } from 'next/server';
import { getCurrentSessionUser } from '@/lib/auth';
import { isSupabaseDbConfigured, dbGetDeal } from '@/lib/supabase-db';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  if (!isSupabaseDbConfigured()) return NextResponse.json({ error: 'Server storage not configured.' }, { status: 503 });

  const { id } = await params;
  const authUserId = session.user.auth_user_id ?? session.user.id;
  const deal = await dbGetDeal(id, authUserId);
  if (!deal) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ deal });
}
