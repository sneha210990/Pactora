import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  authCookieOptions,
  exchangeAuthCodeForSession,
  getAppUrl,
  getUserFromAccessToken,
  serializeSession,
} from '@/lib/supabase-auth';

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/deals/new';
  }

  return next;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const nextPath = getSafeNextPath(url.searchParams.get('next') ?? url.searchParams.get('state'));
  const appUrl = getAppUrl();

  if (!code || !appUrl) {
    return NextResponse.redirect(new URL('/login?error=google_auth_failed', request.url));
  }

  const redirectTo = `${appUrl}/auth/callback`;
  const exchangeResponse = await exchangeAuthCodeForSession(code, redirectTo);

  if (!exchangeResponse.ok) {
    return NextResponse.redirect(new URL('/login?error=google_auth_failed', request.url));
  }

  const session = (await exchangeResponse.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  } | null;

  if (!session?.access_token || !session?.refresh_token) {
    return NextResponse.redirect(new URL('/login?error=google_auth_failed', request.url));
  }

  const userResponse = await getUserFromAccessToken(session.access_token);
  const authUser = (await userResponse.json().catch(() => null)) as { id?: string; email?: string | null } | null;

  if (!userResponse.ok || !authUser?.id || !authUser?.email) {
    return NextResponse.redirect(new URL('/login?error=google_auth_failed', request.url));
  }

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    serializeSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: Date.now() + (session.expires_in ?? 3600) * 1000,
      user: {
        id: authUser.id,
        email: authUser.email,
      },
    }),
    authCookieOptions(),
  );

  return NextResponse.redirect(new URL(nextPath, request.url));
}
