import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createEvent } from '@/lib/beta-store';
import { getCurrentSessionUser } from '@/lib/auth';
import { authCookieOptions, SESSION_COOKIE_NAME } from '@/lib/supabase-auth';

export async function POST(request: Request) {
  const sessionData = await getCurrentSessionUser();
  const cookieStore = await cookies();
  // Clear with full flags (Secure/HttpOnly/SameSite) so the replacement
  // Set-Cookie carries the same attributes as the original — `cookies().delete`
  // emits a flag-less header which can stick around in clients that warn on
  // attribute mismatch.
  cookieStore.set(SESSION_COOKIE_NAME, '', authCookieOptions(0));

  await createEvent({
    event_type: 'logout',
    user_id: sessionData?.user.id ?? null,
    email: sessionData?.user.email ?? null,
    page_context: '/logout',
  });

  // Always redirect to the same origin the request arrived on — never trust
  // process.env.APP_URL to be set, and never default to http://localhost.
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
