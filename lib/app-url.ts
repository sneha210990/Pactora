// Canonical app-URL resolution.
//
// We deal with three URL contexts in this app:
//
//   1. Server-side absolute URLs we hand to external services
//      (Supabase OAuth redirect_to, webhook URLs, etc.) — these MUST resolve
//      to a publicly-reachable host and they MUST match what was
//      pre-registered with the third party.
//   2. Server-side internal redirects within our own app — use
//      `new URL(path, request.url)` directly; the user lands back on
//      whichever host they came from, which is what we want.
//   3. Client-side `window.location.origin` — naturally tracks the host
//      the user is currently on.
//
// This module covers category (1). Use `getCanonicalAppUrl(request).origin`
// any time you build a URL that is going to be handed to Supabase, OAuth
// providers, email links, or any other external endpoint.
//
// PRECEDENCE (first match wins):
//   1. NEXT_PUBLIC_APP_URL or APP_URL  — explicit per-environment override.
//   2. VERCEL_PROJECT_PRODUCTION_URL    — Vercel's canonical *production*
//                                         domain (e.g. pactora.vercel.app).
//                                         Always set on Vercel, always public.
//   3. request.url origin               — preview deployments and dev.
//   4. http://localhost:3000            — last-resort fallback.
//
// DELIBERATELY NOT USED: process.env.VERCEL_URL.
//   That variable contains the deployment-specific URL
//   (e.g. pactora-snehas-projects-6c825892.vercel.app), which sits behind
//   Vercel's Deployment Protection. Sending OAuth users there ends in a
//   "request access" wall and a broken sign-in. Use VERCEL_PROJECT_PRODUCTION_URL
//   instead.

export type AppUrlSource = 'env' | 'vercel_prod' | 'request' | 'localhost';

export type AppUrlResult = {
  origin: string;
  source: AppUrlSource;
};

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function ensureProtocol(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

function nonEmptyEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function getCanonicalAppUrl(request?: { url: string }): AppUrlResult {
  const explicit = nonEmptyEnv('NEXT_PUBLIC_APP_URL') ?? nonEmptyEnv('APP_URL');
  if (explicit) {
    return { origin: stripTrailingSlash(ensureProtocol(explicit)), source: 'env' };
  }

  const vercelProd = nonEmptyEnv('VERCEL_PROJECT_PRODUCTION_URL');
  if (vercelProd) {
    return { origin: `https://${stripTrailingSlash(vercelProd)}`, source: 'vercel_prod' };
  }

  if (request) {
    try {
      return { origin: new URL(request.url).origin, source: 'request' };
    } catch {
      // fall through to localhost
    }
  }

  return { origin: 'http://localhost:3000', source: 'localhost' };
}
