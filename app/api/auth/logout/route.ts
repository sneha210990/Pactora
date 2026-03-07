import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createEvent } from '@/lib/beta-store';
import { getCurrentSessionUser } from '@/lib/auth';
import { SESSION_COOKIE_NAME } from '@/lib/supabase-auth';

export async function POST() {
  const sessionData = await getCurrentSessionUser();
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);

  await createEvent({
    event_type: 'logout',
    user_id: sessionData?.user.id ?? null,
    email: sessionData?.user.email ?? null,
    page_context: '/logout',
  });

  return NextResponse.json({ ok: true });
}
