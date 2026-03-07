import { NextResponse } from 'next/server';
import { getCurrentSessionUser } from '@/lib/auth';
import { createEvent, createFeedback, FeedbackCategory } from '@/lib/beta-store';

const categories = new Set<FeedbackCategory>(['bug', 'confusing', 'missing_feature', 'general_feedback']);

export async function POST(request: Request) {
  const sessionData = await getCurrentSessionUser();
  const body = await request.json().catch(() => null);

  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const category = typeof body?.category === 'string' ? body.category : '';
  const page_context = typeof body?.page_context === 'string' ? body.page_context : 'unknown';
  const request_call = Boolean(body?.request_call);
  const can_contact = Boolean(body?.can_contact);

  if (!message || message.length < 8 || message.length > 3000) {
    return NextResponse.json(
      { error: 'Please provide feedback between 8 and 3000 characters.' },
      { status: 400 },
    );
  }

  if (!categories.has(category as FeedbackCategory)) {
    return NextResponse.json({ error: 'Please select a feedback category.' }, { status: 400 });
  }

  let rating: number | null = null;
  if (typeof body?.rating === 'number') {
    if (body.rating >= 1 && body.rating <= 5) {
      rating = body.rating;
    } else {
      return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 });
    }
  }

  const emailFromBody = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const email = sessionData?.user.email ?? emailFromBody;

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required for feedback follow-up.' }, { status: 400 });
  }

  await createFeedback({
    user_id: sessionData?.user.id ?? null,
    email,
    category: category as FeedbackCategory,
    rating,
    message,
    page_context,
    request_call,
    can_contact,
  });

  await createEvent({
    event_type: 'feedback_submitted',
    user_id: sessionData?.user.id ?? null,
    email,
    page_context,
  });

  return NextResponse.json({ ok: true });
}
