import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/supabase-auth';
import { parseSession } from '@/lib/supabase-auth';
import { OPERATOR_COOKIE_NAME, verifyOperatorSessionCookie } from '@/lib/operator-auth';

// Routes within /operator/* and /api/operator/* that must remain reachable
// without an operator session (so login is possible at all).
const OPERATOR_PUBLIC_PATHS = new Set([
  '/operator/login',
  '/api/operator/login',
  '/api/operator/logout',
]);

function unauthenticated(req: NextRequest, kind: 'api' | 'page', redirectTo: string) {
  if (kind === 'api') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const url = new URL(redirectTo, req.url);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Operator surface ──────────────────────────────────────────────────
  if (pathname.startsWith('/operator/') || pathname.startsWith('/api/operator/')) {
    if (OPERATOR_PUBLIC_PATHS.has(pathname)) {
      return NextResponse.next();
    }
    const cookieValue = req.cookies.get(OPERATOR_COOKIE_NAME)?.value;
    let ok = false;
    try {
      ok = await verifyOperatorSessionCookie(cookieValue);
    } catch {
      ok = false; // missing SESSION_SECRET / other crypto failure → fail closed
    }
    if (!ok) {
      const kind = pathname.startsWith('/api/') ? 'api' : 'page';
      return unauthenticated(req, kind, '/operator/login');
    }
    return NextResponse.next();
  }

  // ── Authenticated user surface ────────────────────────────────────────
  // /api/contracts/* invokes Anthropic at significant cost on attacker-
  // controlled input. Require a valid (signed, unexpired-by-cookie-TTL)
  // session cookie before any handler runs. Identity is still re-derived
  // server-side by route handlers via getCurrentSessionUser().
  if (pathname.startsWith('/api/contracts/')) {
    const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    let session = null;
    try {
      session = await parseSession(cookieValue);
    } catch {
      session = null;
    }
    if (!session) {
      return unauthenticated(req, 'api', '/login');
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // Matchers are evaluated as a union — anything outside these paths skips
  // middleware entirely and remains public.
  matcher: ['/operator/:path*', '/api/operator/:path*', '/api/contracts/:path*'],
};
