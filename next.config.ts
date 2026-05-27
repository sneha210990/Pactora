import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  // CSP is in report-only mode to discover violations before enforcing.
  // Once the allowlist is stable, switch to Content-Security-Policy.
  {
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co https://api.anthropic.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  // pdf-parse is loaded via createRequire() pointing at a specific internal subpath
  // (pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js) that the static tracer cannot follow.
  // mammoth uses a standard dynamic import() so Next.js bundles it automatically.
  serverExternalPackages: ['pdf-parse', '@ansonlai/docx-redline-js', 'jszip', '@xmldom/xmldom'],
  outputFileTracingIncludes: {
    'app/api/contracts/extract/route': [
      './node_modules/pdf-parse/**/*',
      './node_modules/node-ensure/**/*',
    ],
  },
};

export default nextConfig;
