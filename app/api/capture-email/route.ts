import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createOrUpdateUser, createEvent } from '@/lib/beta-store';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { buildAnalysisEmail, type EmailFlag } from '@/lib/email/analysis-email';

export async function POST(request: Request) {
  const { allowed, retryAfter } = checkRateLimit(getClientIp(request), 10);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  const email = typeof b.email === 'string' ? b.email : null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const { user } = await createOrUpdateUser({ email: email.trim() });

  await createEvent({
    event_type: 'email_captured',
    user_id: user.id,
    email: user.email,
    page_context: '/review/summary',
  });

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const riskScore = typeof b.riskScore === 'number' ? b.riskScore : 0;
    const verdict = typeof b.verdict === 'string' ? b.verdict : 'Analysis saved';
    const verdictDetail = typeof b.verdictDetail === 'string' ? b.verdictDetail : '';
    const flags = Array.isArray(b.flags) ? (b.flags as EmailFlag[]) : [];

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ||
      'http://localhost:3000';
    const summaryUrl = `${appUrl}/review/summary`;

    const html = buildAnalysisEmail({ riskScore, verdict, verdictDetail, flags, summaryUrl });

    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL ?? 'Pactora <onboarding@resend.dev>';

    await resend.emails.send({
      from,
      to: email.trim(),
      subject: 'Your Pactora contract analysis',
      html,
    });
  }

  return NextResponse.json({ ok: true });
}
