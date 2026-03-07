import { NextResponse } from 'next/server';
import { getSupabaseUrl } from '@/lib/supabase-auth';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get('next') || '/deals/new';
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const authUrl = new URL('/auth/v1/authorize', getSupabaseUrl());
  authUrl.searchParams.set('provider', 'google');
  authUrl.searchParams.set('redirect_to', redirectTo);

  return NextResponse.redirect(authUrl);
}
