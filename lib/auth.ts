import { cookies } from 'next/headers';
import { authCookieOptions, getUserFromAccessToken, parseSession, refreshSession, SESSION_COOKIE_NAME, serializeSession } from './supabase-auth';
import { createOrUpdateUserByIdentity } from './beta-store';

export { SESSION_COOKIE_NAME } from './supabase-auth';

export async function getCurrentSessionUser() {
  const cookieStore = await cookies();
  let session = parseSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);

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
      user: { id: string; email: string };
    };

    session = {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: Date.now() + refreshed.expires_in * 1000,
      user: refreshed.user,
    };

    cookieStore.set(SESSION_COOKIE_NAME, serializeSession(session), authCookieOptions());
    userResponse = await getUserFromAccessToken(session.access_token);
  }

  if (!userResponse.ok) {
    return null;
  }

  const user = (await userResponse.json()) as { id: string; email?: string | null };
  if (!user.email) {
    return null;
  }

  const betaUser = await createOrUpdateUserByIdentity({
    provider: 'supabase',
    auth_user_id: user.id,
    email: user.email,
  });

  return { user: betaUser };
}
