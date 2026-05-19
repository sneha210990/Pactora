import { NextResponse } from 'next/server';
import { createOrUpdateUser, createEvent } from '@/lib/beta-store';
import { sendBetaConfirmation } from '@/lib/email';

export async function POST(request: Request) {
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

  const { user, created } = await createOrUpdateUser({ email: email.trim() });

  await createEvent({
    event_type: 'email_captured',
    user_id: user.id,
    email: user.email,
    page_context: '/review/summary',
  });

  // Only send confirmation on first capture — not on repeat submissions.
  if (created) {
    await sendBetaConfirmation(user.email);
  }

  return NextResponse.json({ ok: true });
}
