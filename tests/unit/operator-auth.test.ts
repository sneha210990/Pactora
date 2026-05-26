import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createOperatorSessionCookie,
  isOperatorConfigured,
  OPERATOR_COOKIE_NAME,
  operatorCookieOptions,
  verifyOperatorKey,
  verifyOperatorSessionCookie,
} from '../../lib/operator-auth';

const VALID_SECRET = 'E'.repeat(32);
const VALID_OPERATOR_KEY = 'super-secret-operator-key-xyz';

beforeAll(() => {
  vi.stubEnv('SESSION_SECRET', VALID_SECRET);
  vi.stubEnv('PACTORA_OPERATOR_KEY', VALID_OPERATOR_KEY);
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('OPERATOR_COOKIE_NAME', () => {
  it('is stable and namespaced', () => {
    expect(OPERATOR_COOKIE_NAME).toBe('pactora_operator');
  });
});

describe('isOperatorConfigured', () => {
  it('returns true when PACTORA_OPERATOR_KEY is set', () => {
    expect(isOperatorConfigured()).toBe(true);
  });

  it('returns false when PACTORA_OPERATOR_KEY is empty', () => {
    vi.stubEnv('PACTORA_OPERATOR_KEY', '');
    try {
      expect(isOperatorConfigured()).toBe(false);
    } finally {
      vi.stubEnv('PACTORA_OPERATOR_KEY', VALID_OPERATOR_KEY);
    }
  });
});

describe('verifyOperatorKey', () => {
  it('returns true for the configured key', async () => {
    expect(await verifyOperatorKey(VALID_OPERATOR_KEY)).toBe(true);
  });

  it('returns false for a mismatched key', async () => {
    expect(await verifyOperatorKey('wrong-key')).toBe(false);
  });

  it('returns false for the empty string', async () => {
    expect(await verifyOperatorKey('')).toBe(false);
  });

  it('returns false for a key that is a prefix of the real one', async () => {
    expect(await verifyOperatorKey(VALID_OPERATOR_KEY.slice(0, 5))).toBe(false);
  });

  it('returns false when PACTORA_OPERATOR_KEY is unset, regardless of input', async () => {
    vi.stubEnv('PACTORA_OPERATOR_KEY', '');
    try {
      expect(await verifyOperatorKey(VALID_OPERATOR_KEY)).toBe(false);
      expect(await verifyOperatorKey('')).toBe(false);
    } finally {
      vi.stubEnv('PACTORA_OPERATOR_KEY', VALID_OPERATOR_KEY);
    }
  });
});

describe('createOperatorSessionCookie + verifyOperatorSessionCookie', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('produces a cookie that verifies immediately', async () => {
    const { value } = await createOperatorSessionCookie();
    expect(await verifyOperatorSessionCookie(value)).toBe(true);
  });

  it('exposes a maxAge that matches the cookie TTL (8 hours)', async () => {
    const { maxAgeSeconds } = await createOperatorSessionCookie();
    expect(maxAgeSeconds).toBe(8 * 60 * 60);
  });

  it('rejects a cookie whose exp is in the past', async () => {
    const { value } = await createOperatorSessionCookie();
    // Advance 9 hours past the 8-hour TTL.
    vi.setSystemTime(new Date('2026-01-01T09:00:00Z'));
    expect(await verifyOperatorSessionCookie(value)).toBe(false);
  });

  it('still validates a fresh cookie just before expiry', async () => {
    const { value } = await createOperatorSessionCookie();
    // 1 second before expiry.
    vi.setSystemTime(new Date('2026-01-01T07:59:59Z'));
    expect(await verifyOperatorSessionCookie(value)).toBe(true);
  });

  it('rejects undefined / empty / malformed cookies', async () => {
    expect(await verifyOperatorSessionCookie(undefined)).toBe(false);
    expect(await verifyOperatorSessionCookie('')).toBe(false);
    expect(await verifyOperatorSessionCookie('garbage')).toBe(false);
    expect(await verifyOperatorSessionCookie('payload.')).toBe(false);
  });

  it('rejects a cookie with a tampered signature', async () => {
    const { value } = await createOperatorSessionCookie();
    const [payload, sig] = value.split('.');
    const tampered = (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1);
    expect(await verifyOperatorSessionCookie(`${payload}.${tampered}`)).toBe(false);
  });

  it('rejects a cookie signed by a different SESSION_SECRET', async () => {
    const { value } = await createOperatorSessionCookie();
    vi.stubEnv('SESSION_SECRET', 'F'.repeat(32));
    try {
      expect(await verifyOperatorSessionCookie(value)).toBe(false);
    } finally {
      vi.stubEnv('SESSION_SECRET', VALID_SECRET);
    }
  });

  it('rejects a cookie with a forged exp claim (no signature match)', async () => {
    // Craft a payload that LOOKS valid but was never signed by this secret.
    const fakePayload = Buffer.from(JSON.stringify({ exp: 9_999_999_999_999 })).toString('base64url');
    const fakeSig = Buffer.from('a'.repeat(32)).toString('base64url');
    expect(await verifyOperatorSessionCookie(`${fakePayload}.${fakeSig}`)).toBe(false);
  });
});

describe('operatorCookieOptions', () => {
  it('always sets httpOnly + Secure + SameSite=Strict + path=/ (Vuln 11 regression)', () => {
    const opts = operatorCookieOptions(3600);
    expect(opts.httpOnly).toBe(true);
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe('strict');
    expect(opts.path).toBe('/');
    expect(opts.maxAge).toBe(3600);
  });

  it('uses Secure even when NODE_ENV is not production', () => {
    const original = process.env.NODE_ENV;
    vi.stubEnv('NODE_ENV', 'development');
    try {
      expect(operatorCookieOptions(3600).secure).toBe(true);
    } finally {
      vi.stubEnv('NODE_ENV', original ?? 'test');
    }
  });
});
