import { cookies } from 'next/headers';
import {
  buildSessionPayload,
  getUserFromAccessToken,
  parseSession,
  refreshSession,
  SESSION_COOKIE_NAME,
} from './supabase-auth';
import { createOrUpdateUserByIdentity } from './beta-store';

export { SESSION_COOKIE_NAME } from './supabase-auth';

export async function getCurrentSessionUser() {
  const cookieStore = await cookies();
  let session = await parseSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return null;
  }

  let userResponse = await getUserFromAccessToken(session.access_token);

  if (!userResponse.ok) {
    const refreshResponse = await refreshSession(session.refresh_token);
    if (!refreshResponse.ok) {
      return null;
    }

    const refreshed = (await refreshResponse.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    session = buildSessionPayload(refreshed);
    // Cookie update is handled by middleware — cannot set cookies during render.
    userResponse = await getUserFromAccessToken(session.access_token);
  }

  if (!userResponse.ok) {
    return null;
  }

  const user = (await userResponse.json()) as { id: string; email?: string | null };
  if (!user.email) {
    return null;
  }

  try {
    const betaUser = await createOrUpdateUserByIdentity({
      provider: 'supabase',
      auth_user_id: user.id,
      email: user.email,
    });
    return { user: betaUser };
  } catch {
    // Beta-store unavailable (e.g. read-only filesystem on serverless).
    // Return a minimal user shape so the session is still usable.
    const now = new Date().toISOString();
    return {
      user: {
        id: user.id,
        email: user.email,
        auth_provider: 'supabase',
        auth_user_id: user.id,
        created_at: now,
        updated_at: now,
        last_active_at: now,
        first_upload_at: null,
        first_feedback_at: null,
      },
    };
  }
}
