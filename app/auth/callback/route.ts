import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createEvent, createOrUpdateUserByIdentity } from '@/lib/beta-store';
import { authCookieOptions, exchangeAuthCodeForSession, getAppUrl, getUserFromAccessToken, SESSION_COOKIE_NAME, serializeSession } from '@/lib/supabase-auth';

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/';
  }

  return next;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = getSafeNextPath(request.nextUrl.searchParams.get('state') ?? request.nextUrl.searchParams.get('next'));
  const appUrl = getAppUrl();

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=Missing+authentication+code.', request.url));
  }

  if (!appUrl) {
    return NextResponse.redirect(new URL('/login?error=Application+URL+is+not+configured.', request.url));
  }

  const redirectTo = `${appUrl}/auth/callback`;

  const exchangeResponse = await exchangeAuthCodeForSession(code, redirectTo);
  if (!exchangeResponse.ok) {
    const exchangeError = (await exchangeResponse.json().catch(() => null)) as { error_description?: string; msg?: string; error?: string } | null;
    const error = exchangeError?.error_description ?? exchangeError?.msg ?? exchangeError?.error ?? 'Unable to complete sign in.';
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url));
  }

  const session = (await exchangeResponse.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!session.access_token || !session.refresh_token) {
    return NextResponse.redirect(new URL('/login?error=Incomplete+session+returned+by+authentication+provider.', request.url));
  }

  const userResponse = await getUserFromAccessToken(session.access_token);
  if (!userResponse.ok) {
    return NextResponse.redirect(new URL('/login?error=Unable+to+load+authenticated+user+profile.', request.url));
  }

  const authUser = (await userResponse.json()) as { id: string; email?: string | null };
  if (!authUser.email) {
    return NextResponse.redirect(new URL('/login?error=Authenticated+account+is+missing+an+email+address.', request.url));
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
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: Date.now() + (session.expires_in ?? 3600) * 1000,
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

  return NextResponse.redirect(new URL(next, request.url));
}
