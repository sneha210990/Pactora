import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createEvent, createOrUpdateUserByIdentity } from '@/lib/beta-store';
import { authCookieOptions, getUserFromAccessToken, SESSION_COOKIE_NAME, serializeSession } from '@/lib/supabase-auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const accessToken = typeof body?.access_token === 'string' ? body.access_token : '';
  const refreshToken = typeof body?.refresh_token === 'string' ? body.refresh_token : '';
  const expiresIn = typeof body?.expires_in === 'number' ? body.expires_in : 3600;

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: 'Missing session token payload.' }, { status: 400 });
  }

  const userResponse = await getUserFromAccessToken(accessToken);
  if (!userResponse.ok) {
    return NextResponse.json({ error: 'Unable to verify authenticated user.' }, { status: 400 });
  }

  const authUser = (await userResponse.json()) as { id: string; email?: string | null };
  if (!authUser.email) {
    return NextResponse.json({ error: 'Authenticated account does not have an email.' }, { status: 400 });
  }

  const betaUser = await createOrUpdateUserByIdentity({
    provider: 'supabase',
    auth_user_id: authUser.id,
    email: authUser.email,
  });

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    serializeSession({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Date.now() + expiresIn * 1000,
      user: { id: authUser.id, email: authUser.email },
    }),
    authCookieOptions(),
  );

  await createEvent({
    event_type: 'user_logged_in',
    user_id: betaUser.id,
    email: betaUser.email,
    page_context: '/auth/callback',
  });

  return NextResponse.json({ ok: true });
}
