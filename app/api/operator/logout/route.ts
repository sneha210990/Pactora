import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { OPERATOR_COOKIE_NAME, operatorCookieOptions } from '@/lib/operator-auth';

export async function POST() {
  const cookieStore = await cookies();
  // Clear with the same flags as the live cookie so browsers replace cleanly.
  cookieStore.set(OPERATOR_COOKIE_NAME, '', operatorCookieOptions(0));
  return NextResponse.json({ ok: true });
}
