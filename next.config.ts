import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  // Vercel's file tracer can't detect the dynamically required internal
  // pdf.js subpath at build time, so we force-include the whole lib tree.
  outputFileTracingIncludes: {
    '/api/contracts/extract': ['./node_modules/pdf-parse/lib/**/*'],
  },
};

export default nextConfig;
