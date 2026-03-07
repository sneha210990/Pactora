import { NextResponse } from 'next/server';
import { getCurrentSessionUser } from '@/lib/auth';
import { touchUserLastActive } from '@/lib/beta-store';

export async function GET() {
  const sessionData = await getCurrentSessionUser();

  if (!sessionData) {
    return NextResponse.json({ user: null });
  }

  await touchUserLastActive(sessionData.user.id);

  return NextResponse.json({ user: sessionData.user });
}
