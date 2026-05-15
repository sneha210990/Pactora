import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  // pdf-parse loads pdf.js via a dynamic require() path that Vercel's bundler
  // cannot statically trace. This forces all pdf-parse files to be included
  // in the serverless function bundle so the runtime require succeeds.
  outputFileTracingIncludes: {
    '/api/contracts/extract': ['./node_modules/pdf-parse/**/*'],
  },
};

export default nextConfig;
