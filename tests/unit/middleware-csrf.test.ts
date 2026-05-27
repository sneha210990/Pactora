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
