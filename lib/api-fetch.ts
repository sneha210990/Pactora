// Wrapper around fetch() for internal /api/* calls.
//
// Injects X-Pactora-Client: web so the request matches the middleware CSRF
// gate. Custom headers force a CORS preflight cross-origin, which we never
// grant — so attacker pages can't forge state-changing requests carrying
// the victim's session cookie.

const CLIENT_HEADER = 'X-Pactora-Client';
const CLIENT_HEADER_VALUE = 'web';

export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set(CLIENT_HEADER, CLIENT_HEADER_VALUE);
  return fetch(input, { ...init, headers });
}
