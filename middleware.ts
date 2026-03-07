import { NextRequest, NextResponse } from 'next/server';
import { authCookieOptions, getUserFromAccessToken, parseSession, refreshSession, SESSION_COOKIE_NAME, serializeSession } from '@/lib/supabase-auth';

async function ensureValidSession(request: NextRequest, response: NextResponse) {
  const session = parseSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return null;
  }

  const userResponse = await getUserFromAccessToken(session.access_token);
  if (userResponse.ok) {
    return session;
  }

  const refreshResponse = await refreshSession(session.refresh_token);
  if (!refreshResponse.ok) {
    response.cookies.delete(SESSION_COOKIE_NAME);
    return null;
  }

  const refreshed = (await refreshResponse.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: { id: string; email: string };
  };

  response.cookies.set(
    SESSION_COOKIE_NAME,
    serializeSession({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: Date.now() + refreshed.expires_in * 1000,
      user: {
        id: refreshed.user.id,
        email: refreshed.user.email,
      },
    }),
    authCookieOptions(),
  );

  return {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_at: Date.now() + refreshed.expires_in * 1000,
    user: refreshed.user,
  };
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const response = NextResponse.next();

  const session = await ensureValidSession(request, response);

  if (pathname === '/login' && session) {
    const next = request.nextUrl.searchParams.get('next');
    const redirectTarget = next?.startsWith('/') ? next : '/deals/new';
    return NextResponse.redirect(new URL(redirectTarget, request.url));
  }

  if (pathname.startsWith('/deals/new') && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/deals/new/:path*', '/login'],
};
