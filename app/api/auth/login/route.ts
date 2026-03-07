import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createEvent, createOrUpdateUserByIdentity } from '@/lib/beta-store';
import { authCookieOptions, SESSION_COOKIE_NAME, serializeSession, signInWithEmail, signUpWithEmail } from '@/lib/supabase-auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const mode = body?.mode === 'signup' ? 'signup' : 'login';

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  if (mode === 'signup') {
    const signupResponse = await signUpWithEmail(email, password);
    if (!signupResponse.ok) {
      const err = await signupResponse.json().catch(() => null) as { msg?: string } | null;
      return NextResponse.json({ error: err?.msg ?? 'Unable to sign up right now.' }, { status: 400 });
    }
  }

  const signInResponse = await signInWithEmail(email, password);

  if (!signInResponse.ok) {
    const err = await signInResponse.json().catch(() => null) as { error_description?: string; msg?: string } | null;
    return NextResponse.json({ error: err?.error_description ?? err?.msg ?? 'Unable to log in right now.' }, { status: 400 });
  }

  const data = (await signInResponse.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: { id: string; email: string };
  };

  const betaUser = await createOrUpdateUserByIdentity({
    provider: 'supabase',
    auth_user_id: data.user.id,
    email: data.user.email,
  });

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    serializeSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    }),
    authCookieOptions(),
  );

  await createEvent({
    event_type: mode === 'signup' ? 'user_signed_up' : 'user_logged_in',
    user_id: betaUser.id,
    email: betaUser.email,
    page_context: '/login',
  });

  return NextResponse.json({ ok: true, user: betaUser });
}
