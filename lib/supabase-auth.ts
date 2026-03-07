export const SESSION_COOKIE_NAME = 'pactora_session';

type SessionPayload = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email: string;
  };
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseUrl() {
  return requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
}

export function getAppUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (!value) {
    return null;
  }

  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function getAnonKey() {
  return requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

function encode(data: string) {
  return encodeURIComponent(data);
}

function decode(data: string) {
  return decodeURIComponent(data);
}

export function serializeSession(payload: SessionPayload) {
  return encode(JSON.stringify(payload));
}

export function parseSession(value: string | undefined): SessionPayload | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(decode(value)) as SessionPayload;
  } catch {
    return null;
  }
}

async function supabaseFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${getSupabaseUrl()}${path}`, {
    ...init,
    headers: {
      apikey: getAnonKey(),
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  return response;
}

export async function signUpWithEmail(email: string, password: string) {
  return supabaseFetch('/auth/v1/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function signInWithEmail(email: string, password: string) {
  return supabaseFetch('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function refreshSession(refreshToken: string) {
  return supabaseFetch('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export async function exchangeAuthCodeForSession(code: string, redirectTo: string) {
  return supabaseFetch('/auth/v1/token?grant_type=authorization_code', {
    method: 'POST',
    body: JSON.stringify({ code, redirect_to: redirectTo }),
  });
}

export async function getUserFromAccessToken(accessToken: string) {
  return supabaseFetch('/auth/v1/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export function authCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 30) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
