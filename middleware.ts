import { NextResponse } from 'next/server';

export function middleware() {
  // Keep core workflow publicly accessible without authentication.
  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
