import { NextResponse } from 'next/server';
import { createOrUpdateUser, createEvent } from '@/lib/beta-store';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const { allowed, retryAfter } = checkRateLimit(getClientIp(request), 10);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = typeof (body as Record<string, unknown>).email === 'string'
    ? (body as Record<string, unknown>).email as string
    : null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const { user } = await createOrUpdateUser({ email: email.trim() });

  await createEvent({
    event_type: 'email_captured',
    user_id: user.id,
    email: user.email,
    page_context: '/review/summary',
  });

  return NextResponse.json({ ok: true });
}
