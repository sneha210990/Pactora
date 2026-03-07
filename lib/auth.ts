import { cookies } from 'next/headers';
import { getUserFromAccessToken, parseSession, SESSION_COOKIE_NAME } from './supabase-auth';
import { createOrUpdateUserByIdentity } from './beta-store';

export { SESSION_COOKIE_NAME } from './supabase-auth';

export async function getCurrentSessionUser() {
  const cookieStore = await cookies();
  const session = parseSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return null;
  }

  const userResponse = await getUserFromAccessToken(session.access_token);

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
