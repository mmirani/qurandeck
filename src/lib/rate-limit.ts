type Bucket = { stamps: number[] };

const buckets = new Map<string, Bucket>();

export type RateLimit = {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
};

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimit {
  const bucket = buckets.get(key) ?? { stamps: [] };
  const fresh = bucket.stamps.filter((stamp) => now - stamp < windowMs);
  if (fresh.length >= limit) {
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - fresh[0])) / 1000));
    bucket.stamps = fresh;
    buckets.set(key, bucket);
    return { ok: false, limit, remaining: 0, retryAfter };
  }
  fresh.push(now);
  bucket.stamps = fresh;
  buckets.set(key, bucket);
  return { ok: true, limit, remaining: Math.max(0, limit - fresh.length), retryAfter: 0 };
}

export function clientAddress(headerValue: string | null, fallback = "local") {
  const forwarded = headerValue?.split(",")[0]?.trim();
  return forwarded || fallback;
}

export function limitForPath(pathname: string): { name: string; limit: number; windowMs: number } | null {
  if (pathname.startsWith("/api/auth")) return null;
  if (pathname.startsWith("/api/feedback")) return { name: "feedback", limit: 5, windowMs: 60 * 60 * 1000 };
  if (pathname.startsWith("/api/ranks/reset")) return { name: "ranks-reset", limit: 5, windowMs: 60 * 1000 };
  if (pathname.startsWith("/api/library")) return { name: "library", limit: 20, windowMs: 60 * 1000 };
  if (pathname.startsWith("/api/quran/search")) return { name: "search", limit: 30, windowMs: 60 * 1000 };
  if (pathname.startsWith("/api/beta")) return { name: "beta", limit: 8, windowMs: 60 * 1000 };
  if (pathname.startsWith("/api/")) return { name: "api", limit: 90, windowMs: 60 * 1000 };
  return null;
}
