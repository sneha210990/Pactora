import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  createOperatorSessionCookie,
  isOperatorConfigured,
  OPERATOR_COOKIE_NAME,
  operatorCookieOptions,
  verifyOperatorKey,
} from '@/lib/operator-auth';

export async function POST(request: Request) {
  if (!isOperatorConfigured()) {
    // Fail closed without advertising that the operator surface exists.
    return new NextResponse(null, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { key?: unknown } | null;
  const provided = typeof body?.key === 'string' ? body.key : '';

  const ok = await verifyOperatorKey(provided);
  if (!ok) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
  }

  const { value, maxAgeSeconds } = await createOperatorSessionCookie();
  const cookieStore = await cookies();
  cookieStore.set(OPERATOR_COOKIE_NAME, value, operatorCookieOptions(maxAgeSeconds));

  return NextResponse.json({ ok: true });
}
