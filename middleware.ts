import { NextRequest, NextResponse } from 'next/server';
import { parseSession, SESSION_COOKIE_NAME } from '@/lib/supabase-auth';

const PROTECTED_PREFIXES = ['/deals', '/review', '/api/contracts'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );

  if (!needsAuth) {
    return NextResponse.next();
  }

  const session = parseSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
