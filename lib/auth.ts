import { cookies } from 'next/headers';
import { getUserBySessionToken } from './beta-store';

export const SESSION_COOKIE_NAME = 'pactora_beta_session';

export async function getCurrentSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return getUserBySessionToken(token);
}
