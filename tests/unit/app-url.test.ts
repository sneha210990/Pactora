import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCanonicalAppUrl } from '../../lib/app-url';

// All env vars touched by the resolver — wipe before each test to make
// precedence assertions explicit and order-independent.
const URL_ENV_VARS = [
  'NEXT_PUBLIC_APP_URL',
  'APP_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
  'VERCEL_URL',
];

beforeEach(() => {
  for (const name of URL_ENV_VARS) {
    vi.stubEnv(name, '');
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getCanonicalAppUrl — precedence', () => {
  it('uses NEXT_PUBLIC_APP_URL when set (highest priority)', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://pactora.vercel.app');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'should-be-ignored.vercel.app');
    const result = getCanonicalAppUrl({ url: 'https://wrong.example/some-path' });
    expect(result).toEqual({ origin: 'https://pactora.vercel.app', source: 'env' });
  });

  it('falls back to APP_URL when NEXT_PUBLIC_APP_URL is unset', () => {
    vi.stubEnv('APP_URL', 'https://pactora.vercel.app');
    expect(getCanonicalAppUrl()).toEqual({
      origin: 'https://pactora.vercel.app',
      source: 'env',
    });
  });

  it('falls back to VERCEL_PROJECT_PRODUCTION_URL when no explicit env is set', () => {
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'pactora.vercel.app');
    expect(getCanonicalAppUrl()).toEqual({
      origin: 'https://pactora.vercel.app',
      source: 'vercel_prod',
    });
  });

  it('falls back to request origin when no env vars and a request is provided', () => {
    const result = getCanonicalAppUrl({ url: 'https://preview-abc.vercel.app/api/auth/google?next=/x' });
    expect(result).toEqual({
      origin: 'https://preview-abc.vercel.app',
      source: 'request',
    });
  });

  it('falls back to http://localhost:3000 when nothing else is available', () => {
    expect(getCanonicalAppUrl()).toEqual({
      origin: 'http://localhost:3000',
      source: 'localhost',
    });
  });
});

describe('getCanonicalAppUrl — Vercel-protected URL guard', () => {
  it('NEVER consults process.env.VERCEL_URL', () => {
    // VERCEL_URL is the deployment-specific URL behind Deployment Protection
    // (e.g. pactora-snehas-projects-6c825892.vercel.app). Using it as the
    // OAuth redirect target sends users into the "request access" wall.
    vi.stubEnv('VERCEL_URL', 'pactora-snehas-projects-6c825892.vercel.app');
    const result = getCanonicalAppUrl({ url: 'https://pactora.vercel.app/x' });
    expect(result.origin).not.toContain('snehas-projects');
    expect(result.source).toBe('request');
  });

  it('prefers VERCEL_PROJECT_PRODUCTION_URL over VERCEL_URL even if both set', () => {
    vi.stubEnv('VERCEL_URL', 'pactora-snehas-projects-6c825892.vercel.app');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'pactora.vercel.app');
    expect(getCanonicalAppUrl().origin).toBe('https://pactora.vercel.app');
  });
});

describe('getCanonicalAppUrl — normalisation', () => {
  it('strips a trailing slash from explicit env values', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://pactora.vercel.app/');
    expect(getCanonicalAppUrl().origin).toBe('https://pactora.vercel.app');
  });

  it('coerces bare hosts to https://', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'pactora.vercel.app');
    expect(getCanonicalAppUrl().origin).toBe('https://pactora.vercel.app');
  });

  it('preserves an http:// scheme when explicitly provided (local dev)', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    expect(getCanonicalAppUrl().origin).toBe('http://localhost:3000');
  });

  it('strips a trailing slash from VERCEL_PROJECT_PRODUCTION_URL too', () => {
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'pactora.vercel.app/');
    expect(getCanonicalAppUrl().origin).toBe('https://pactora.vercel.app');
  });
});

describe('getCanonicalAppUrl — degraded inputs', () => {
  it('ignores empty-string env values', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '');
    expect(getCanonicalAppUrl().source).toBe('localhost');
  });

  it('falls through to localhost if request.url cannot be parsed', () => {
    const result = getCanonicalAppUrl({ url: 'not a url at all' });
    expect(result).toEqual({ origin: 'http://localhost:3000', source: 'localhost' });
  });
});
