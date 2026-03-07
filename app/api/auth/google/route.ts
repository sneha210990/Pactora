import { NextResponse } from 'next/server';
import { getAppUrl, getSupabaseUrl } from '@/lib/supabase-auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get('next') || '/deals/new';
  const appUrl = getAppUrl();

  if (!appUrl) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent('Application URL is not configured.')}`, request.url));
  }

  const redirectTo = `${appUrl}/auth/callback`;

  const authUrl = new URL('/auth/v1/authorize', getSupabaseUrl());
  authUrl.searchParams.set('provider', 'google');
  authUrl.searchParams.set('redirect_to', redirectTo);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', next);

  return NextResponse.redirect(authUrl);
}
