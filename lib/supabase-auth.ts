import { getCanonicalAppUrl } from './app-url';
import { signPayload, verifyAndExtract } from './session-crypto';

export const SESSION_COOKIE_NAME = 'pactora_session';

// The session cookie carries Supabase tokens only — never an identity.
// Callers MUST derive the authenticated user from `getUserFromAccessToken`
// against Supabase. The previous embedded `user` field was removed to make
// impersonation via cookie-tampering impossible even if a future code path
// forgets to re-validate.
export type SessionPayload = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

type AuthTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user?: {
    id: string;
    email?: string | null;
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

// Returns the configured app URL when one is explicitly set via env, or null
// otherwise. Code that has access to a request should prefer
// `getCanonicalAppUrl(request)` from lib/app-url for a non-null result.
export function getAppUrl(): string | null {
  const { origin, source } = getCanonicalAppUrl();
  return source === 'env' || source === 'vercel_prod' ? origin : null;
}

function getAnonKey() {
  return requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// True when the server-only service-role key is configured. Callers can use
// this to choose a durable Supabase-backed path vs. a local fallback.
export function hasServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function buildSessionPayload(auth: AuthTokenResponse): SessionPayload {
  return {
    access_token: auth.access_token,
    refresh_token: auth.refresh_token,
    expires_at: Date.now() + auth.expires_in * 1000,
  };
}

// On-the-wire payload uses short keys to keep the cookie compact.
type WirePayload = { a: string; r: string; e: number };

export async function serializeSession(payload: SessionPayload): Promise<string> {
  const wire: WirePayload = {
    a: payload.access_token,
    r: payload.refresh_token,
    e: payload.expires_at,
  };
  return signPayload(JSON.stringify(wire));
}

export async function parseSession(value: string | undefined): Promise<SessionPayload | null> {
  const json = await verifyAndExtract(value);
  if (!json) return null;

  try {
    const parsed = JSON.parse(json) as Partial<WirePayload>;
    if (
      typeof parsed.a !== 'string' || !parsed.a ||
      typeof parsed.r !== 'string' || !parsed.r ||
      typeof parsed.e !== 'number' || !Number.isFinite(parsed.e)
    ) {
      return null;
    }
    return {
      access_token: parsed.a,
      refresh_token: parsed.r,
      expires_at: parsed.e,
    };
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

// Authenticated PostgREST/Auth calls using the service-role key. Bypasses RLS,
// so it must only ever run server-side. Used for the rate_limits table, which
// the public anon key is deliberately locked out of.
export async function supabaseAdminFetch(path: string, init?: RequestInit) {
  const key = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  return fetch(`${getSupabaseUrl()}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
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
    // Always Secure — modern browsers (Chrome 89+, Firefox 75+, Safari) treat
    // localhost as a secure context, so this does not break local HTTP dev.
    // The previous NODE_ENV gate left Vercel preview deployments (which run
    // over HTTPS with NODE_ENV !== 'production') vulnerable to cookie
    // exfiltration over downgraded connections.
    secure: true,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
