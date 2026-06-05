import { NextResponse, type NextRequest } from 'next/server';
import { OPERATOR_COOKIE_NAME, verifyOperatorSessionCookie } from '@/lib/operator-auth';
import {
  SESSION_COOKIE_NAME,
  authCookieOptions,
  buildSessionPayload,
  parseSession,
  serializeSession,
} from '@/lib/supabase-auth';

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

async function refreshUserSessionIfNeeded(req: NextRequest, res: NextResponse): Promise<void> {
  const raw = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return;

  const session = await parseSession(raw);
  if (!session) return;

  // Refresh if token expires within 60 seconds
  if (session.expires_at - Date.now() > 60_000) return;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return;

    const refreshRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (!refreshRes.ok) return;

    const refreshed = (await refreshRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    const newSession = buildSessionPayload(refreshed);
    const serialized = await serializeSession(newSession);
    res.cookies.set(SESSION_COOKIE_NAME, serialized, authCookieOptions());
  } catch {
    // Non-fatal — let the request proceed with the stale session
  }
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

  const res = NextResponse.next();
  await refreshUserSessionIfNeeded(req, res);
  return res;
}

export const config = {
  matcher: ['/operator/:path*', '/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
