import { NextResponse } from 'next/server';
import { getSupabaseUrl } from '@/lib/supabase-auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawNext = url.searchParams.get('next') || '';
  const next = rawNext && /^\/[^/]/.test(rawNext) ? rawNext : '/deals/new';

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || url.origin;

  const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  const authUrl = new URL('/auth/v1/authorize', getSupabaseUrl());
  authUrl.searchParams.set('provider', 'google');
  authUrl.searchParams.set('redirect_to', redirectTo);

  return NextResponse.redirect(authUrl);
}
