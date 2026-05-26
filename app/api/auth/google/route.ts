import { NextResponse } from 'next/server';
import { getCanonicalAppUrl } from '@/lib/app-url';
import { getSupabaseUrl } from '@/lib/supabase-auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get('next') || '/deals/new';

  // The base URL handed to Supabase here MUST match an entry on the project's
  // Authentication → URL Configuration → Redirect URLs allowlist. If it
  // doesn't, Supabase silently substitutes the configured Site URL — which
  // is how users end up on the deployment-protected project URL after Google
  // sign-in. See lib/app-url.ts for precedence rules.
  const { origin } = getCanonicalAppUrl(request);
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const authUrl = new URL('/auth/v1/authorize', getSupabaseUrl());
  authUrl.searchParams.set('provider', 'google');
  authUrl.searchParams.set('redirect_to', redirectTo);

  return NextResponse.redirect(authUrl);
}
