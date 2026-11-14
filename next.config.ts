import type { NextConfig } from "next";
import { apexAliasRedirects } from "./src/lib/apex-redirect";

const isDev = process.env.NODE_ENV === "development";

// Production analytics beacons are same-origin (/_vercel/insights and
// /_vercel/speed-insights). Development loads the scripts from Vercel.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' https://audio.qurancdn.com https://verses.quran.com https://cdn.islamic.network https://download.quranicaudio.com https://everyayah.com",
  "connect-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com https://api.quran.com https://api.alquran.cloud https://api.quran.foundation https://apis.quran.foundation https://apis-prelive.quran.foundation https://oauth2.quran.foundation https://prelive-oauth2.quran.foundation https://audio.qurancdn.com https://verses.quran.com https://cdn.islamic.network https://download.quranicaudio.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin" },
  {
    key: "Permissions-Policy",
    // microphone=(self) lets Sana's speech recognition use the mic on this
    // origin. microphone=() blocks it for the whole site, including iOS Safari.
    value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    // The surah header art is 2880px wide, so 2880 is the largest size served.
    deviceSizes: [640, 828, 1200, 1600, 1920, 2400, 2880],
    qualities: [75, 80],
  },
  // fontkit reads its own data files from node_modules. Bundling it into the
  // Open Graph route turns those paths into URL objects and the build fails.
  serverExternalPackages: ["fontkit"],
  // `npm run build` uses webpack. Vercel's Turbopack font rewriter rejects
  // Source Serif 4 (`next/font/google queries have exactly one entry`).
  async redirects() {
    return apexAliasRedirects();
  },
  async headers() {
    const robots = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    const preview =
      process.env.VERCEL_ENV === "preview"
        ? [{ source: "/:path*", headers: robots }]
        : [];
    return [
      { source: "/:path*", headers: securityHeaders },
      ...preview,
      { source: "/admin", headers: robots },
      { source: "/admin/:path*", headers: robots },
    ];
  },
};

export default nextConfig;
