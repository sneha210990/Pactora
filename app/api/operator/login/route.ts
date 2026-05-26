import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  createOperatorSessionCookie,
  isOperatorConfigured,
  OPERATOR_COOKIE_NAME,
  operatorCookieOptions,
  verifyOperatorKey,
} from '@/lib/operator-auth';

// Both "operator surface not configured" and "wrong key" return an identical
// 404 with no body. Differentiating between the two would let an unauth probe
// learn whether the operator surface is active on this deployment, which
// narrows attacker focus for online guessing. Real failure reasons are
// logged server-side only.
const NOT_FOUND_RESPONSE = () => new NextResponse(null, { status: 404 });

export async function POST(request: Request) {
  if (!isOperatorConfigured()) {
    return NOT_FOUND_RESPONSE();
  }

  const body = (await request.json().catch(() => null)) as { key?: unknown } | null;
  const provided = typeof body?.key === 'string' ? body.key : '';

  const ok = await verifyOperatorKey(provided);
  if (!ok) {
    console.warn('[operator/login] rejected attempt');
    return NOT_FOUND_RESPONSE();
  }

  const { value, maxAgeSeconds } = await createOperatorSessionCookie();
  const cookieStore = await cookies();
  cookieStore.set(OPERATOR_COOKIE_NAME, value, operatorCookieOptions(maxAgeSeconds));

  return NextResponse.json({ ok: true });
}
