import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  signPayload,
  timingSafeStringEqual,
  verifyAndExtract,
} from '../../lib/session-crypto';

const VALID_SECRET = 'A'.repeat(32); // ≥32 chars

beforeAll(() => {
  vi.stubEnv('SESSION_SECRET', VALID_SECRET);
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('signPayload + verifyAndExtract', () => {
  it('roundtrips a payload that was signed by the same secret', async () => {
    const payload = JSON.stringify({ hello: 'world', n: 42 });
    const signed = await signPayload(payload);
    expect(await verifyAndExtract(signed)).toBe(payload);
  });

  it('produces an envelope of the form <payload>.<sig>', async () => {
    const signed = await signPayload('x');
    const parts = signed.split('.');
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it('rejects undefined / empty strings', async () => {
    expect(await verifyAndExtract(undefined)).toBeNull();
    expect(await verifyAndExtract('')).toBeNull();
  });

  it('rejects values without a dot separator', async () => {
    expect(await verifyAndExtract('no-dot-here')).toBeNull();
  });

  it('rejects values with empty payload or signature halves', async () => {
    expect(await verifyAndExtract('.signature')).toBeNull();
    expect(await verifyAndExtract('payload.')).toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const signed = await signPayload(JSON.stringify({ user: 'alice' }));
    const [payload, sig] = signed.split('.');
    // Flip the first character of the payload (still valid base64url alphabet).
    const tampered = (payload[0] === 'A' ? 'B' : 'A') + payload.slice(1);
    expect(await verifyAndExtract(`${tampered}.${sig}`)).toBeNull();
  });

  it('rejects a tampered signature', async () => {
    const signed = await signPayload(JSON.stringify({ user: 'alice' }));
    const [payload, sig] = signed.split('.');
    const tampered = (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1);
    expect(await verifyAndExtract(`${payload}.${tampered}`)).toBeNull();
  });

  it('rejects a signature produced by a different secret', async () => {
    const signed = await signPayload('alpha');
    vi.stubEnv('SESSION_SECRET', 'B'.repeat(32));
    try {
      expect(await verifyAndExtract(signed)).toBeNull();
    } finally {
      vi.stubEnv('SESSION_SECRET', VALID_SECRET);
    }
  });

  it('rejects malformed base64url in either half', async () => {
    // `*` is not a valid base64url character.
    expect(await verifyAndExtract('***.***')).toBeNull();
  });

  it('throws when SESSION_SECRET is unset', async () => {
    vi.stubEnv('SESSION_SECRET', '');
    try {
      await expect(signPayload('x')).rejects.toThrow(/SESSION_SECRET/);
    } finally {
      vi.stubEnv('SESSION_SECRET', VALID_SECRET);
    }
  });

  it('throws when SESSION_SECRET is shorter than 32 chars', async () => {
    vi.stubEnv('SESSION_SECRET', 'short');
    try {
      await expect(signPayload('x')).rejects.toThrow(/32 characters/);
    } finally {
      vi.stubEnv('SESSION_SECRET', VALID_SECRET);
    }
  });
});

describe('timingSafeStringEqual', () => {
  it('returns true for equal strings', async () => {
    expect(await timingSafeStringEqual('hello', 'hello')).toBe(true);
  });

  it('returns true for empty == empty', async () => {
    expect(await timingSafeStringEqual('', '')).toBe(true);
  });

  it('returns false for different content of the same length', async () => {
    expect(await timingSafeStringEqual('abcdef', 'abcdeg')).toBe(false);
  });

  it('returns false for strings of different lengths', async () => {
    expect(await timingSafeStringEqual('abc', 'abcdef')).toBe(false);
    expect(await timingSafeStringEqual('abcdef', 'abc')).toBe(false);
  });

  it('returns false for empty vs non-empty', async () => {
    expect(await timingSafeStringEqual('', 'a')).toBe(false);
    expect(await timingSafeStringEqual('a', '')).toBe(false);
  });

  it('handles unicode-equivalent strings', async () => {
    expect(await timingSafeStringEqual('café', 'café')).toBe(true);
    expect(await timingSafeStringEqual('café', 'cafe')).toBe(false);
  });
});
