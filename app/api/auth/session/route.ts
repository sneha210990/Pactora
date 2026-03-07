import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createEvent, createOrUpdateUserByIdentity } from '@/lib/beta-store';
import {
  authCookieOptions,
  buildSessionPayload,
  exchangeAuthCodeForSession,
  getUserFromAccessToken,
  SESSION_COOKIE_NAME,
  serializeSession,
} from '@/lib/supabase-auth';

type SessionRequestBody = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  code?: string;
  redirect_to?: string;
};

type SupabaseAuthError = {
  error_description?: string;
  msg?: string;
  message?: string;
  error?: string;
};

function parseSupabaseError(error: SupabaseAuthError | null, fallback: string) {
  return (
    error?.error_description ??
    error?.message ??
    error?.msg ??
    error?.error ??
    fallback
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SessionRequestBody | null;
  const accessToken = typeof body?.access_token === 'string' ? body.access_token : '';
  const refreshToken = typeof body?.refresh_token === 'string' ? body.refresh_token : '';
  const expiresIn = typeof body?.expires_in === 'number' ? body.expires_in : 3600;
  const authCode = typeof body?.code === 'string' ? body.code : '';
  const redirectTo = typeof body?.redirect_to === 'string' ? body.redirect_to : '';

  let sessionTokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user?: { id: string; email?: string | null };
  };

  if (authCode) {
    if (!redirectTo) {
      return NextResponse.json(
        { error: 'Missing redirect URL for OAuth code exchange.' },
        { status: 400 },
      );
    }

    const exchangeResponse = await exchangeAuthCodeForSession(authCode, redirectTo);

    if (!exchangeResponse.ok) {
      const exchangeError = (await exchangeResponse.json().catch(() => null)) as SupabaseAuthError | null;
      return NextResponse.json(
        {
          error: parseSupabaseError(exchangeError, 'Unable to exchange OAuth code for session.'),
          stage: 'code_exchange',
        },
        { status: 400 },
      );
    }

    sessionTokens = (await exchangeResponse.json()) as typeof sessionTokens;
  } else {
    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: 'Missing session token payload.', stage: 'session_payload' },
        { status: 400 },
      );
    }

    sessionTokens = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
    };
  }

  const userResponse = await getUserFromAccessToken(sessionTokens.access_token);
  if (!userResponse.ok) {
    const userError = (await userResponse.json().catch(() => null)) as SupabaseAuthError | null;
    return NextResponse.json(
      {
        error: parseSupabaseError(userError, 'Unable to verify authenticated user.'),
        stage: 'user_verification',
      },
      { status: 400 },
    );
  }

  const authUser = (await userResponse.json()) as { id: string; email?: string | null };
  if (!authUser.email) {
    return NextResponse.json(
      {
        error: 'Authenticated account does not have an email.',
        stage: 'user_verification',
      },
      { status: 400 },
    );
  }

  const betaUser = await createOrUpdateUserByIdentity({
    provider: 'supabase',
    auth_user_id: authUser.id,
    email: authUser.email,
  });

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    serializeSession(buildSessionPayload(sessionTokens, { id: authUser.id, email: authUser.email })),
    authCookieOptions(),
  );

  await createEvent({
    event_type: 'user_logged_in',
    user_id: betaUser.id,
    email: betaUser.email,
    page_context: '/auth/callback',
  });

  return NextResponse.json({ ok: true });
}
