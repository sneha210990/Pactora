import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';

// These tests only exercise the CSRF tripwire — the operator and contracts
// auth blocks short-circuit on their own paths and are covered separately.
// We use /api/feedback as a representative state-changing API route that
// the tripwire MUST block but which doesn't fall through to operator or
// contracts auth (so no env vars or session parsing are touched).

function makeRequest(url: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method: init.method ?? 'GET',
    headers: init.headers,
  });
}

describe('middleware CSRF tripwire', () => {
  it('rejects POST to /api/* without X-Pactora-Client header', async () => {
    const res = await middleware(makeRequest('/api/feedback', { method: 'POST' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: 'Forbidden' });
  });

  it('rejects POST when the header value is wrong', async () => {
    const res = await middleware(
      makeRequest('/api/feedback', {
        method: 'POST',
        headers: { 'X-Pactora-Client': 'mobile' },
      }),
    );
    expect(res.status).toBe(403);
  });

  it('allows POST to /api/* with the correct X-Pactora-Client header', async () => {
    const res = await middleware(
      makeRequest('/api/feedback', {
        method: 'POST',
        headers: { 'X-Pactora-Client': 'web' },
      }),
    );
    // NextResponse.next() returns 200 with no body; the important thing is
    // the tripwire did not return 403.
    expect(res.status).not.toBe(403);
  });

  it('accepts the header case-insensitively (HTTP header semantics)', async () => {
    const res = await middleware(
      makeRequest('/api/feedback', {
        method: 'POST',
        headers: { 'x-pactora-client': 'web' },
      }),
    );
    expect(res.status).not.toBe(403);
  });

  it.each(['PUT', 'PATCH', 'DELETE'])(
    'rejects %s to /api/* without the header',
    async (method) => {
      const res = await middleware(makeRequest('/api/feedback', { method }));
      expect(res.status).toBe(403);
    },
  );

  it('lets GET requests through without the header (read-only)', async () => {
    const res = await middleware(makeRequest('/api/me', { method: 'GET' }));
    expect(res.status).not.toBe(403);
  });

  it('does not gate non-/api routes', async () => {
    const res = await middleware(makeRequest('/login', { method: 'POST' }));
    expect(res.status).not.toBe(403);
  });
});

describe('middleware CSRF tripwire — operator public paths', () => {
  // OPERATOR_PUBLIC_PATHS exempts certain /api/operator/* routes from the
  // operator *session* check — but the CSRF tripwire runs first in the
  // middleware chain. A missing or wrong header must still be rejected with
  // 403 even on paths like /api/operator/login, so the public-path exemption
  // can't be abused as a way to bypass CSRF.

  it.each(['/api/operator/login', '/api/operator/logout'])(
    'rejects POST to public operator path %s without X-Pactora-Client header',
    async (path) => {
      const res = await middleware(makeRequest(path, { method: 'POST' }));
      // Tripwire fires before the OPERATOR_PUBLIC_PATHS check — 403, not 401.
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body).toEqual({ error: 'Forbidden' });
    },
  );

  it.each(['/api/operator/login', '/api/operator/logout'])(
    'allows POST to public operator path %s with the correct header',
    async (path) => {
      const res = await middleware(
        makeRequest(path, {
          method: 'POST',
          headers: { 'X-Pactora-Client': 'web' },
        }),
      );
      // CSRF passes; public-path exemption returns NextResponse.next() (200).
      expect(res.status).not.toBe(403);
    },
  );

  it('returns 403, not 401, on a protected operator route without the header', async () => {
    // Confirms the tripwire (403) fires before the operator session check
    // (which would return 401) — order of precedence is explicit.
    const res = await middleware(
      makeRequest('/api/operator/users', { method: 'POST' }),
    );
    expect(res.status).toBe(403);
  });
});
