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

// Methods that mutate server state and therefore require a CSRF tripwire.
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function unauthenticated(req: NextRequest, kind: 'api' | 'page', redirectTo: string) {
  if (kind === 'api') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const url = new URL(redirectTo, req.url);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── CSRF tripwire ─────────────────────────────────────────────────────
  // Custom headers can't be sent cross-origin without a CORS preflight,
  // and we never grant preflight, so requiring this header on every
  // state-changing /api/* call blocks browser-borne CSRF carrying the
  // victim's session cookie.
  if (pathname.startsWith('/api/') && STATE_CHANGING_METHODS.has(req.method)) {
    if (req.headers.get('x-pactora-client') !== 'web') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

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
  if (pathname.startsWith('/api/contracts/') || pathname.startsWith('/deals') || pathname.startsWith('/review')) {
    const cookieValue = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    let session = null;
    try {
      session = await parseSession(cookieValue);
    } catch {
      session = null;
    }
    if (!session) {
      return unauthenticated(req, pathname.startsWith('/api/') ? 'api' : 'page', '/login');
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // Matchers are evaluated as a union — anything outside these paths skips
  // middleware entirely and remains public.
  matcher: ['/operator/:path*', '/api/:path*', '/deals/:path*', '/deals', '/review/:path*'],
};
