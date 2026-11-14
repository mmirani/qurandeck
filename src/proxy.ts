import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientAddress, limitForPath, rateLimit } from "@/lib/rate-limit";
import { quranCacheHeaders } from "@/lib/quran/http-cache";
import { quranRequestAllowed } from "@/lib/quran/same-origin";
import { canonicalRedirectUrl } from "@/lib/seo";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const redirectTo = canonicalRedirectUrl(request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "", pathname, search);
  if (redirectTo) return NextResponse.redirect(redirectTo, 301);

  const quran = isQuranApi(pathname);
  if (quran && !allowedQuranRequest(request)) {
    return NextResponse.json(
      { error: "This route is only available on QuranDeck." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const rule = limitForPath(pathname);
  if (!rule) return NextResponse.next();

  const ip = clientAddress(request.headers.get("x-forwarded-for"), request.headers.get("x-real-ip") ?? "local");
  const result = rateLimit(`${rule.name}:${ip}`, rule.limit, rule.windowMs);
  if (result.ok) {
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(result.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    // Setting any header here replaces the route's Cache-Control on Vercel.
    // A bare `public` is not stored. Repeat the full CDN headers for Quran GETs.
    if (quran && (request.method === "GET" || request.method === "HEAD")) {
      for (const [key, value] of Object.entries(quranCacheHeaders())) {
        response.headers.set(key, value);
      }
    }
    return response;
  }

  return NextResponse.json(
    { error: "Too many requests. Please wait a moment and try again." },
    {
      status: 429,
      headers: {
        "Cache-Control": "private, no-store",
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}

function isQuranApi(pathname: string) {
  return pathname === "/api/quran" || pathname.startsWith("/api/quran/");
}

function allowedQuranRequest(request: NextRequest) {
  return quranRequestAllowed({
    host: request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "",
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
    secFetchSite: request.headers.get("sec-fetch-site"),
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2)$).*)"],
};
