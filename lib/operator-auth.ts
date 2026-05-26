import { signPayload, timingSafeStringEqual, verifyAndExtract } from './session-crypto';

export const OPERATOR_COOKIE_NAME = 'pactora_operator';
const OPERATOR_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function getOperatorKey(): string | null {
  const key = process.env.PACTORA_OPERATOR_KEY;
  return key && key.length > 0 ? key : null;
}

export function isOperatorConfigured(): boolean {
  return getOperatorKey() !== null;
}

// Constant-time check of an attacker-supplied key against PACTORA_OPERATOR_KEY.
// Returns false (without leaking the configuration state) if the key is unset.
export async function verifyOperatorKey(provided: string): Promise<boolean> {
  const expected = getOperatorKey();
  if (!expected) return false;
  return timingSafeStringEqual(expected, provided);
}

type OperatorWire = { exp: number };

export async function createOperatorSessionCookie(): Promise<{ value: string; maxAgeSeconds: number }> {
  const wire: OperatorWire = { exp: Date.now() + OPERATOR_TTL_MS };
  return {
    value: await signPayload(JSON.stringify(wire)),
    maxAgeSeconds: Math.floor(OPERATOR_TTL_MS / 1000),
  };
}

// Returns true when the cookie has a valid signature AND is unexpired.
export async function verifyOperatorSessionCookie(
  cookieValue: string | undefined,
): Promise<boolean> {
  const json = await verifyAndExtract(cookieValue);
  if (!json) return false;
  try {
    const parsed = JSON.parse(json) as Partial<OperatorWire>;
    if (typeof parsed.exp !== 'number' || !Number.isFinite(parsed.exp)) return false;
    return parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export function operatorCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: true,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
