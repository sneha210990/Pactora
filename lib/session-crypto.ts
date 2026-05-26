// Cookie integrity primitives. HMAC-SHA256 signed envelopes using Web Crypto so
// the same module works in both the Node and Edge runtimes (middleware, route
// handlers, server components).
//
// Cookie format:  <payload_b64url>.<signature_b64url>
//
// Rotating SESSION_SECRET invalidates every outstanding cookie. A length floor
// is enforced so a forgotten or empty env var fails closed at boot rather than
// silently weakening every signature.

const SECRET_MIN_LEN = 32;

let cachedKey: Promise<CryptoKey> | null = null;
let cachedSecret: string | null = null;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < SECRET_MIN_LEN) {
    throw new Error(
      `SESSION_SECRET must be set to at least ${SECRET_MIN_LEN} characters. Generate one with: openssl rand -base64 32`,
    );
  }
  return secret;
}

function getSigningKey(): Promise<CryptoKey> {
  const secret = getSecret();
  if (cachedKey && cachedSecret === secret) return cachedKey;
  cachedSecret = secret;
  cachedKey = crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  return cachedKey;
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): Uint8Array<ArrayBuffer> | null {
  try {
    const padded =
      input.replaceAll('-', '+').replaceAll('_', '/') +
      '==='.slice((input.length + 3) % 4);
    const s = atob(padded);
    const out = new Uint8Array(new ArrayBuffer(s.length));
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export async function signPayload(payloadJson: string): Promise<string> {
  const key = await getSigningKey();
  const payloadBytes = new TextEncoder().encode(payloadJson);
  const sig = await crypto.subtle.sign('HMAC', key, payloadBytes);
  return `${toBase64Url(payloadBytes)}.${toBase64Url(sig)}`;
}

export async function verifyAndExtract(
  cookieValue: string | undefined,
): Promise<string | null> {
  if (!cookieValue) return null;
  const dot = cookieValue.indexOf('.');
  if (dot <= 0 || dot === cookieValue.length - 1) return null;

  const payloadBytes = fromBase64Url(cookieValue.slice(0, dot));
  const sigBytes = fromBase64Url(cookieValue.slice(dot + 1));
  if (!payloadBytes || !sigBytes) return null;

  const key = await getSigningKey();
  const ok = await crypto.subtle.verify('HMAC', key, sigBytes, payloadBytes);
  if (!ok) return null;

  return new TextDecoder().decode(payloadBytes);
}

// Constant-time string equality. Hashes both inputs to fixed-length digests so
// neither length nor content of either input is observable through timing —
// the only side-effect is one SHA-256 over each input regardless of size.
export async function timingSafeStringEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}
