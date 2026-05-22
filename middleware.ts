import { NextResponse } from 'next/server';

export function middleware() {
  // Auth gate temporarily disabled — re-enable once Supabase env vars are set on Vercel.
  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
