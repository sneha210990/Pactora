import { NextResponse } from 'next/server';
import { getCurrentSessionUser } from '@/lib/auth';
import { BetaEventType, createEvent } from '@/lib/beta-store';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const allowedEventTypes = new Set<BetaEventType>([
  'contract_upload_started',
  'contract_uploaded',
  'manual_clause_entry_started',
  'manual_clause_entry_submitted',
  'analysis_started',
  'analysis_completed',
]);

export async function POST(request: Request) {
  const { allowed, retryAfter } = checkRateLimit(getClientIp(request), 30);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  const sessionData = await getCurrentSessionUser();

  const body = await request.json().catch(() => null);
  const event_type = typeof body?.event_type === 'string' ? body.event_type : '';
  const rawPageContext = typeof body?.page_context === 'string' ? body.page_context : 'unknown';
  const page_context = rawPageContext.slice(0, 200);

  if (!allowedEventTypes.has(event_type as BetaEventType)) {
    return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
  }

  await createEvent({
    event_type: event_type as BetaEventType,
    user_id: sessionData?.user.id ?? null,
    email: sessionData?.user.email ?? null,
    page_context,
  });

  return NextResponse.json({ ok: true });
}
