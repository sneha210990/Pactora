import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createEvent, deleteSession } from '@/lib/beta-store';
import { SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await deleteSession(token);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);

  await createEvent({
    event_type: 'logout',
    user_id: null,
    email: null,
    page_context: '/logout',
  });

  return NextResponse.json({ ok: true });
}
