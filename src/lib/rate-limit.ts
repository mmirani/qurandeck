import { createHash } from "node:crypto";
import { getSql } from "@/lib/db";

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

export type RateLimitResult = {
  ok: boolean;
  retryAfterSec: number;
};

export interface RateLimiter {
  hit(key: string, limit: number, windowMs: number, now?: number): Promise<RateLimitResult>;
}

export function rateLimitKey(kind: "email" | "ip", value: string) {
  const digest = createHash("sha256").update(`${kind}:${value}`).digest("hex");
  return `${kind}:${digest}`;
}

export class MemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, number[]>();

  async hit(key: string, limit: number, windowMs: number, now = Date.now()): Promise<RateLimitResult> {
    const recent = (this.buckets.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
    if (recent.length >= limit) {
      const oldest = recent[0] ?? now;
      const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      this.buckets.set(key, recent);
      return { ok: false, retryAfterSec };
    }
    recent.push(now);
    this.buckets.set(key, recent);
    return { ok: true, retryAfterSec: 0 };
  }
}

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

export function createNeonRateLimiter(sql: Sql): RateLimiter {
  let ready: Promise<void> | null = null;

  const ensure = () => {
    ready ??= (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS auth_rate_limits (
          bucket text PRIMARY KEY,
          hits integer NOT NULL,
          window_start timestamptz NOT NULL
        )
      `;
      await sql`DELETE FROM auth_rate_limits WHERE window_start < now() - interval '2 days'`;
    })().catch((error: unknown) => {
      ready = null;
      throw error;
    });
    return ready;
  };

  return {
    async hit(key, limit, windowMs, now = Date.now()) {
      await ensure();
      const windowStart = new Date(now - (now % windowMs)).toISOString();
      const rows = (await sql`
        INSERT INTO auth_rate_limits (bucket, hits, window_start)
        VALUES (${key}, 1, ${windowStart}::timestamptz)
        ON CONFLICT (bucket) DO UPDATE SET
          hits = CASE
            WHEN auth_rate_limits.window_start < ${windowStart}::timestamptz THEN 1
            ELSE auth_rate_limits.hits + 1
          END,
          window_start = CASE
            WHEN auth_rate_limits.window_start < ${windowStart}::timestamptz THEN ${windowStart}::timestamptz
            ELSE auth_rate_limits.window_start
          END
        RETURNING hits
      `) as { hits: number | string }[];
      const hits = Number(rows[0]?.hits);
      if (!Number.isFinite(hits) || hits > limit) {
        const start = Date.parse(windowStart);
        const retryAfterSec = Math.max(1, Math.ceil((start + windowMs - now) / 1000));
        return { ok: false, retryAfterSec };
      }
      return { ok: true, retryAfterSec: 0 };
    },
  };
}

type RateGlobals = typeof globalThis & {
  __qurandeckRateLimiter?: RateLimiter;
};

export function getRateLimiter(): RateLimiter {
  const globals = globalThis as RateGlobals;
  if (!globals.__qurandeckRateLimiter) {
    globals.__qurandeckRateLimiter = process.env.DATABASE_URL
      ? createNeonRateLimiter(getSql() as unknown as Sql)
      : new MemoryRateLimiter();
  }
  return globals.__qurandeckRateLimiter;
}
