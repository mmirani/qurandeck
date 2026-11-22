import { isSafeShape } from "@/lib/guide/missed-shape";

/** A shape is only shown once it has been missed at least this many times in the window. */
export const MISSED_MIN_COUNT = 3;
export const MISSED_WINDOW_DAYS = 30;
export const MISSED_RETENTION_DAYS = 90;
export const MISSED_BODY_LIMIT = 256;

export type MissedRow = { shape: string; day: string; count: number };
export type MissedTop = { shape: string; count: number; days: number };

/**
 * The same statements as migrations/0001_sana_missed_daily.sql. Every one is safe to run again.
 * The store runs them once per server instance before its first read or write.
 */
export function missedSchemaStatements(): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      status text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS sana_missed_daily (
      shape text NOT NULL CHECK (char_length(shape) BETWEEN 1 AND 80),
      day date NOT NULL,
      count integer NOT NULL DEFAULT 1 CHECK (count > 0),
      PRIMARY KEY (shape, day)
    )`,
    `CREATE INDEX IF NOT EXISTS sana_missed_daily_day_idx ON sana_missed_daily (day)`,
    `INSERT INTO schema_migrations (id, status) VALUES ('sana-missed-v1', 'done') ON CONFLICT (id) DO NOTHING`,
  ];
}

/**
 * Runs a setup step at most once while it succeeds. Callers share one in-flight promise.
 * After a failure, the next try waits `retryMs` so a broken database is not hit on every request.
 */
export function onceWithRetry(step: () => Promise<void>, retryMs = 10 * 60 * 1000, clock: () => number = Date.now) {
  let ready: Promise<void> | null = null;
  let failedAt = -Infinity;
  return async (): Promise<boolean> => {
    if (!ready && clock() - failedAt < retryMs) return false;
    ready ??= step().catch((error) => {
      ready = null;
      failedAt = clock();
      throw error;
    });
    try {
      await ready;
      return true;
    } catch {
      return false;
    }
  };
}

/** Storage seam so the route and tests share one path. */
export interface MissedStore {
  /** Adds one to today's count. Resolves false when the table is missing or storage is off. */
  record(shape: string): Promise<boolean>;
}

/** Parse the POST body. Only {"shape": "..."} with a safe shape is accepted; any other key is refused. */
export function parseMissedBody(raw: string): string | null {
  if (!raw || raw.length > MISSED_BODY_LIMIT) return null;
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== "shape") return null;
  const shape = (body as { shape: unknown }).shape;
  return isSafeShape(shape) ? shape : null;
}

export async function acceptMissedPost(raw: string, store: MissedStore): Promise<{ status: 204 | 400 }> {
  const shape = parseMissedBody(raw);
  if (!shape) return { status: 400 };
  try {
    await store.record(shape);
  } catch {
    // Counting must never break Sana. A failed write is dropped.
  }
  return { status: 204 };
}

/** UTC calendar day, "YYYY-MM-DD". */
export function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Top shapes over the last 30 days, only those with at least 3 misses.
 * Rows outside the window, unsafe shapes, and bad counts are ignored.
 */
export function topMissedShapes(rows: MissedRow[], now = new Date(), limit = 50): MissedTop[] {
  const since = new Date(now.getTime() - (MISSED_WINDOW_DAYS - 1) * 86_400_000);
  const from = utcDay(since);
  const totals = new Map<string, { count: number; days: Set<string> }>();
  for (const row of rows) {
    if (!isSafeShape(row.shape)) continue;
    if (row.day < from) continue;
    const count = Number(row.count);
    if (!Number.isFinite(count) || count <= 0) continue;
    const entry = totals.get(row.shape) ?? { count: 0, days: new Set<string>() };
    entry.count += Math.floor(count);
    entry.days.add(row.day);
    totals.set(row.shape, entry);
  }
  return [...totals.entries()]
    .filter(([, entry]) => entry.count >= MISSED_MIN_COUNT)
    .map(([shape, entry]) => ({ shape, count: entry.count, days: entry.days.size }))
    .sort((a, b) => b.count - a.count || a.shape.localeCompare(b.shape))
    .slice(0, limit);
}
