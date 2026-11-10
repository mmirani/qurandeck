import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `npm run build` uses webpack. Vercel's Turbopack font rewriter rejects
  // Source Serif 4 (`next/font/google queries have exactly one entry`).
};

export default nextConfig;
