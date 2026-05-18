import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  // pdf-parse and mammoth are loaded via dynamic createRequire() calls that
  // Vercel's static file tracer cannot follow. Force-include the entire
  // node_modules subtree for the extract route so every transitive dep is
  // present at runtime — avoids whack-a-mole with individual missing packages.
  outputFileTracingIncludes: {
    'app/api/contracts/extract/route': ['./node_modules/**/*'],
  },
};

export default nextConfig;
