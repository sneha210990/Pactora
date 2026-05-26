import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authCookieOptions,
  buildSessionPayload,
  parseSession,
  serializeSession,
  SESSION_COOKIE_NAME,
} from '../../lib/supabase-auth';

const VALID_SECRET = 'C'.repeat(32);

beforeAll(() => {
  vi.stubEnv('SESSION_SECRET', VALID_SECRET);
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('SESSION_COOKIE_NAME', () => {
  it('is stable and namespaced', () => {
    expect(SESSION_COOKIE_NAME).toBe('pactora_session');
  });
});

describe('buildSessionPayload', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('preserves access_token and refresh_token verbatim', () => {
    const payload = buildSessionPayload({
      access_token: 'access-abc',
      refresh_token: 'refresh-xyz',
      expires_in: 3600,
    });
    expect(payload.access_token).toBe('access-abc');
    expect(payload.refresh_token).toBe('refresh-xyz');
  });

  it('computes expires_at as Date.now() + expires_in * 1000', () => {
    const payload = buildSessionPayload({
      access_token: 'a',
      refresh_token: 'r',
      expires_in: 3600,
    });
    // 2026-01-01T00:00:00Z + 3600s
    expect(payload.expires_at).toBe(Date.parse('2026-01-01T01:00:00Z'));
  });

  it('does NOT embed a user identity in the payload (regression — Vuln 3)', () => {
    const payload = buildSessionPayload({
      access_token: 'a',
      refresh_token: 'r',
      expires_in: 3600,
      user: { id: 'spoofed', email: 'spoofed@example.com' },
    });
    expect(payload).not.toHaveProperty('user');
    expect(Object.keys(payload).sort()).toEqual([
      'access_token',
      'expires_at',
      'refresh_token',
    ]);
  });
});

describe('serializeSession + parseSession', () => {
  it('roundtrips tokens and expiry', async () => {
    const cookie = await serializeSession({
      access_token: 'aaa',
      refresh_token: 'rrr',
      expires_at: 1_800_000_000_000,
    });
    const parsed = await parseSession(cookie);
    expect(parsed).toEqual({
      access_token: 'aaa',
      refresh_token: 'rrr',
      expires_at: 1_800_000_000_000,
    });
  });

  it('returns null for undefined / empty cookie', async () => {
    expect(await parseSession(undefined)).toBeNull();
    expect(await parseSession('')).toBeNull();
  });

  it('returns null for malformed cookies', async () => {
    expect(await parseSession('not-a-signed-envelope')).toBeNull();
    expect(await parseSession('payload.')).toBeNull();
    expect(await parseSession('.signature')).toBeNull();
  });

  it('rejects a cookie whose signature does not match the payload', async () => {
    const cookie = await serializeSession({
      access_token: 'aaa',
      refresh_token: 'rrr',
      expires_at: 1_800_000_000_000,
    });
    const [payload, sig] = cookie.split('.');
    const tampered = (payload[0] === 'A' ? 'B' : 'A') + payload.slice(1);
    expect(await parseSession(`${tampered}.${sig}`)).toBeNull();
  });

  it('rejects a cookie that does not include the expected wire fields', async () => {
    // Manually craft a signed envelope with the wrong schema (missing `a`).
    const { signPayload } = await import('../../lib/session-crypto');
    const bogus = await signPayload(JSON.stringify({ r: 'r', e: 1 }));
    expect(await parseSession(bogus)).toBeNull();
  });

  it('rejects a cookie that was signed by a different secret', async () => {
    const cookie = await serializeSession({
      access_token: 'aaa',
      refresh_token: 'rrr',
      expires_at: 1_800_000_000_000,
    });
    vi.stubEnv('SESSION_SECRET', 'D'.repeat(32));
    try {
      expect(await parseSession(cookie)).toBeNull();
    } finally {
      vi.stubEnv('SESSION_SECRET', VALID_SECRET);
    }
  });
});

describe('authCookieOptions', () => {
  it('always sets httpOnly + Secure + SameSite=Lax + path=/ (Vuln 11 regression)', () => {
    const opts = authCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
  });

  it('uses Secure even when NODE_ENV is not production', () => {
    const original = process.env.NODE_ENV;
    vi.stubEnv('NODE_ENV', 'development');
    try {
      expect(authCookieOptions().secure).toBe(true);
    } finally {
      vi.stubEnv('NODE_ENV', original ?? 'test');
    }
  });

  it('defaults maxAge to 30 days', () => {
    expect(authCookieOptions().maxAge).toBe(60 * 60 * 24 * 30);
  });

  it('honours an explicit maxAge override (used by logout to clear the cookie)', () => {
    expect(authCookieOptions(0).maxAge).toBe(0);
  });
});
