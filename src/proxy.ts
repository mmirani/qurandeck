import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientAddress, limitForPath, rateLimit } from "@/lib/rate-limit";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rule = limitForPath(pathname);
  if (!rule) return NextResponse.next();

  const ip = clientAddress(request.headers.get("x-forwarded-for"), request.headers.get("x-real-ip") ?? "local");
  const result = rateLimit(`${rule.name}:${ip}`, rule.limit, rule.windowMs);
  if (result.ok) {
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(result.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    return response;
  }

  return NextResponse.json(
    { error: "Too many requests. Please wait a moment and try again." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}

export const config = {
  matcher: ["/api/:path*"],
};
