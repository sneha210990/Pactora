import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createEvent, createOrUpdateUser, createSession } from '@/lib/beta-store';
import { SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const full_name = typeof body?.full_name === 'string' ? body.full_name : undefined;
  const company = typeof body?.company === 'string' ? body.company : undefined;
  const role = typeof body?.role === 'string' ? body.role : undefined;
  const use_case = typeof body?.use_case === 'string' ? body.use_case : undefined;

  const { user, created } = await createOrUpdateUser({
    email,
    full_name,
    company,
    role,
    use_case,
  });

  const session = await createSession(user.id);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  await createEvent({
    event_type: created ? 'user_signed_up' : 'user_logged_in',
    user_id: user.id,
    email: user.email,
    page_context: '/login',
  });

  if (full_name || company || role || use_case) {
    await createEvent({
      event_type: 'profile_completed',
      user_id: user.id,
      email: user.email,
      page_context: '/login',
    });
  }

  return NextResponse.json({ ok: true, user });
}
