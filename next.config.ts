import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  // Both pdf-parse and mammoth are loaded via dynamic createRequire() calls that
  // Vercel's static file tracer cannot follow. These entries force all their files
  // into the serverless bundle so the runtime require() succeeds.
  // Key uses the App Router server-output path (app/…/route), not the URL path.
  outputFileTracingIncludes: {
    'app/api/contracts/extract/route': [
      './node_modules/pdf-parse/**/*',
      './node_modules/node-ensure/**/*',
      './node_modules/mammoth/**/*',
      // mammoth transitive dependencies — Vercel's static tracer misses these
      // because mammoth is loaded via createRequire() rather than a static import.
      './node_modules/underscore/**/*',
      './node_modules/jszip/**/*',
      './node_modules/xmlbuilder2/**/*',
      './node_modules/xmldom/**/*',
    ],
  },
};

export default nextConfig;
