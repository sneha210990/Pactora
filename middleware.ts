import { NextResponse } from 'next/server';

export function middleware() {
  // Demo mode: temporarily bypass all authentication checks and redirects.
  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
