import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse is loaded via createRequire() pointing at a specific internal subpath
  // (pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js) that the static tracer cannot follow.
  // mammoth uses a standard dynamic import() so Next.js bundles it automatically.
  serverExternalPackages: ['pdf-parse'],
  outputFileTracingIncludes: {
    'app/api/contracts/extract/route': [
      './node_modules/pdf-parse/**/*',
    ],
  },
};

export default nextConfig;
