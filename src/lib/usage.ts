import { createHash, createHmac } from "node:crypto";
import { canonicalAnonId } from "@/lib/anon-id";
import { rateLimitKey, type RateLimiter } from "@/lib/rate-limit";

export const USAGE_RETENTION_MONTHS = 13;
export const SIGN_IN_DEDUPE_MS = 2 * 60 * 1000;
export const DELETE_DEDUPE_MS = 60 * 1000;
export const GUEST_EVENT_LIMIT = 100;
export const GUEST_EVENT_WINDOW_MS = 60 * 60 * 1000;
export const MERGE_EVENT_LIMIT = 8;
export const MERGE_EVENT_WINDOW_MS = 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const SIGN_IN_METHODS = ["email_code", "passkey", "google", "apple"] as const;
export type SignInMethod = (typeof SIGN_IN_METHODS)[number];

export const USAGE_EVENT_TYPES = [
  "guest_started",
  "sign_up",
  "sign_in",
  "guest_merge",
  "account_deleted",
] as const;
export type UsageEventType = (typeof USAGE_EVENT_TYPES)[number];

const ONCE_EVENTS = new Set<UsageEventType>(["guest_started", "sign_up", "guest_merge"]);

export type UsageInsert = {
  eventType: UsageEventType;
  method: SignInMethod | null;
  subjectHash: string;
};

export type StoredUsageEvent = UsageInsert & { createdAt: Date };

export type UsageInsertResult = "inserted" | "duplicate";

export type UsageInserter = {
  insert(event: UsageInsert): Promise<UsageInsertResult>;
};

export type UsageCounts = { all: number; d30: number; d7: number };

export type UsageRate = { rate: number | null; merges: number; guests: number };

export type UsageDay = {
  day: string;
  guests: number;
  signUps: number;
  signIns: number;
  merges: number;
  deletions: number;
  total: number;
};

export type UsageStats = {
  guests: UsageCounts;
  signUps: UsageCounts;
  merges: UsageCounts;
  deletions: UsageCounts;
  signIns: Record<SignInMethod, UsageCounts>;
  signInTotal: UsageCounts;
  conversion: { all: UsageRate; d30: UsageRate; d7: UsageRate };
  daily: UsageDay[];
};

export type UsageTotalRow = {
  eventType: string;
  method: string | null;
  all: number;
  d30: number;
  d7: number;
};

export type UsageDailyRow = {
  day: string;
  eventType: string;
  count: number;
};

const HASH = /^[0-9a-f]{64}$/;

export function usageRecordingEnabled() {
  const secret = process.env.AUTH_SECRET;
  return Boolean(process.env.DATABASE_URL && secret && secret.length >= 16);
}

export function usageSubject(value: string, secret = process.env.AUTH_SECRET) {
  if (!secret || secret.length < 16) throw new Error("AUTH_SECRET is not set");
  const key = createHash("sha256").update(`qurandeck-usage-v1:${secret}`).digest();
  return createHmac("sha256", key).update(value.trim().toLowerCase()).digest("hex");
}

export function adminEmails(raw = process.env.ADMIN_EMAILS ?? "") {
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined, raw = process.env.ADMIN_EMAILS ?? "") {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return adminEmails(raw).includes(normalized);
}

export function signInMethod(provider: string | null | undefined): SignInMethod | null {
  const id = provider?.trim().toLowerCase();
  if (id === "magic-link" || id === "email-code" || id === "email") return "email_code";
  if (id === "passkey") return "passkey";
  if (id === "google") return "google";
  if (id === "apple") return "apple";
  return null;
}

export function assertUsageInsert(event: UsageInsert) {
  if (!(USAGE_EVENT_TYPES as readonly string[]).includes(event.eventType)) {
    throw new Error("Usage event type is not allowed");
  }
  if (event.method !== null && !(SIGN_IN_METHODS as readonly string[]).includes(event.method)) {
    throw new Error("Usage method is not allowed");
  }
  if (!HASH.test(event.subjectHash)) throw new Error("Usage subject is not a hash");
  if ((event.eventType === "sign_in" || event.eventType === "sign_up") && !event.method) {
    throw new Error("Usage sign-in needs a method");
  }
}

export function isDuplicateUsage(existing: readonly StoredUsageEvent[], next: UsageInsert, now: Date) {
  for (const row of existing) {
    if (row.eventType !== next.eventType || row.subjectHash !== next.subjectHash) continue;
    if (ONCE_EVENTS.has(next.eventType)) return true;
    const age = now.getTime() - row.createdAt.getTime();
    if (age < 0) continue;
    if (next.eventType === "sign_in" && row.method === next.method && age < SIGN_IN_DEDUPE_MS) return true;
    if (next.eventType === "account_deleted" && age < DELETE_DEDUPE_MS) return true;
  }
  return false;
}

export function createMemoryUsageStore(events: StoredUsageEvent[] = [], clock: () => Date = () => new Date()) {
  return {
    events,
    async insert(event: UsageInsert): Promise<UsageInsertResult> {
      assertUsageInsert(event);
      const now = clock();
      if (isDuplicateUsage(events, event, now)) return "duplicate";
      events.push({ ...event, createdAt: now });
      return "inserted";
    },
  };
}

export function accountUsageSubject(email: string, secret?: string) {
  return usageSubject(`account:${email.trim().toLowerCase()}`, secret);
}

export function guestUsageSubject(anonId: string, secret?: string) {
  return usageSubject(`guest:${anonId}`, secret);
}

export function mergeUsageSubject(email: string, anonId: string, secret?: string) {
  return usageSubject(`merge:${email.trim().toLowerCase()}:${anonId}`, secret);
}

export async function recordAuthEvents(
  store: UsageInserter,
  email: string,
  provider: string | null | undefined,
  secret?: string,
) {
  const method = signInMethod(provider);
  if (!method || !email.trim()) return { recorded: false as const };
  const subjectHash = accountUsageSubject(email, secret);
  const signUp = await store.insert({ eventType: "sign_up", method, subjectHash });
  const signIn = await store.insert({ eventType: "sign_in", method, subjectHash });
  return { recorded: true as const, signUp, signIn, subjectHash };
}

export async function recordGuestStarted(store: UsageInserter, anonId: string, secret?: string) {
  const subjectHash = guestUsageSubject(anonId, secret);
  const result = await store.insert({ eventType: "guest_started", method: null, subjectHash });
  return { result, subjectHash };
}

export async function recordGuestMerge(store: UsageInserter, email: string, anonId: string, secret?: string) {
  const subjectHash = mergeUsageSubject(email, anonId, secret);
  const result = await store.insert({ eventType: "guest_merge", method: null, subjectHash });
  return { result, subjectHash };
}

export async function recordAccountDeleted(store: UsageInserter, email: string, secret?: string) {
  const subjectHash = accountUsageSubject(email, secret);
  const result = await store.insert({ eventType: "account_deleted", method: null, subjectHash });
  return { result, subjectHash };
}

export function parseUsageRequest(
  body: unknown,
): { ok: true; kind: "guest_started" | "guest_merge"; anonId: string } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request." };
  const record = body as { event?: unknown; anonId?: unknown };
  const anonId = typeof record.anonId === "string" ? canonicalAnonId(record.anonId) : null;
  if ((record.event === "guest_started" || record.event === "guest_merge") && anonId) {
    return { ok: true, kind: record.event, anonId };
  }
  return { ok: false, error: "Invalid request." };
}

export type UsagePostResult = {
  status: number;
  body: { ok: boolean; error?: string };
  headers?: Record<string, string>;
};

export async function acceptUsagePost(input: {
  body: unknown;
  signedInEmail: string | null;
  ip: string;
  limiter: RateLimiter;
  store: UsageInserter;
  now?: number;
  secret?: string;
}): Promise<UsagePostResult> {
  const parsed = parseUsageRequest(input.body);
  if (!parsed.ok) return { status: 400, body: { ok: false, error: parsed.error } };

  const now = input.now ?? Date.now();
  if (parsed.kind === "guest_started") {
    const hit = await input.limiter.hit(
      rateLimitKey("ip", `usage-guest:${input.ip}`),
      GUEST_EVENT_LIMIT,
      GUEST_EVENT_WINDOW_MS,
      now,
    );
    if (!hit.ok) return limited(hit.retryAfterSec);
    try {
      await recordGuestStarted(input.store, parsed.anonId, input.secret);
    } catch {
      return unavailable();
    }
    return { status: 200, body: { ok: true } };
  }

  const email = input.signedInEmail?.trim().toLowerCase() ?? "";
  if (!email) return { status: 401, body: { ok: false, error: "Sign in required." } };
  const hit = await input.limiter.hit(
    rateLimitKey("email", `usage-merge:${email}`),
    MERGE_EVENT_LIMIT,
    MERGE_EVENT_WINDOW_MS,
    now,
  );
  if (!hit.ok) return limited(hit.retryAfterSec);
  try {
    await recordGuestMerge(input.store, email, parsed.anonId, input.secret);
  } catch {
    return unavailable();
  }
  return { status: 200, body: { ok: true } };
}

function limited(retryAfterSec: number): UsagePostResult {
  return {
    status: 429,
    body: { ok: false, error: "Too many requests." },
    headers: { "Retry-After": String(retryAfterSec) },
  };
}

function unavailable(): UsagePostResult {
  return { status: 503, body: { ok: false, error: "Usage log is unavailable." } };
}

function emptyCounts(): UsageCounts {
  return { all: 0, d30: 0, d7: 0 };
}

function conversion(merges: number, guests: number): UsageRate {
  return { rate: guests > 0 ? merges / guests : null, merges, guests };
}

export function usageChartDays(now: Date) {
  const days: string[] = [];
  for (let index = 29; index >= 0; index -= 1) {
    days.push(new Date(now.getTime() - index * DAY_MS).toISOString().slice(0, 10));
  }
  return days;
}

export function usageRange(now: Date) {
  return {
    d7: new Date(now.getTime() - 7 * DAY_MS).toISOString(),
    d30: new Date(now.getTime() - 30 * DAY_MS).toISOString(),
  };
}

function isMethod(value: string | null): value is SignInMethod {
  return Boolean(value && (SIGN_IN_METHODS as readonly string[]).includes(value));
}

export function assembleUsageStats(totals: UsageTotalRow[], daily: UsageDailyRow[], now = new Date()): UsageStats {
  const stats: UsageStats = {
    guests: emptyCounts(),
    signUps: emptyCounts(),
    merges: emptyCounts(),
    deletions: emptyCounts(),
    signIns: {
      email_code: emptyCounts(),
      passkey: emptyCounts(),
      google: emptyCounts(),
      apple: emptyCounts(),
    },
    signInTotal: emptyCounts(),
    conversion: { all: conversion(0, 0), d30: conversion(0, 0), d7: conversion(0, 0) },
    daily: usageChartDays(now).map((day) => ({
      day,
      guests: 0,
      signUps: 0,
      signIns: 0,
      merges: 0,
      deletions: 0,
      total: 0,
    })),
  };

  const add = (target: UsageCounts, row: UsageTotalRow) => {
    target.all += row.all;
    target.d30 += row.d30;
    target.d7 += row.d7;
  };

  for (const row of totals) {
    if (row.eventType === "guest_started") add(stats.guests, row);
    else if (row.eventType === "sign_up") add(stats.signUps, row);
    else if (row.eventType === "guest_merge") add(stats.merges, row);
    else if (row.eventType === "account_deleted") add(stats.deletions, row);
    else if (row.eventType === "sign_in") {
      add(stats.signInTotal, row);
      if (isMethod(row.method)) add(stats.signIns[row.method], row);
    }
  }

  const byDay = new Map(stats.daily.map((day) => [day.day, day]));
  for (const row of daily) {
    const day = byDay.get(row.day.slice(0, 10));
    if (!day || row.count <= 0) continue;
    if (row.eventType === "guest_started") day.guests += row.count;
    else if (row.eventType === "sign_up") day.signUps += row.count;
    else if (row.eventType === "sign_in") day.signIns += row.count;
    else if (row.eventType === "guest_merge") day.merges += row.count;
    else if (row.eventType === "account_deleted") day.deletions += row.count;
    else continue;
    day.total += row.count;
  }

  stats.conversion = {
    all: conversion(stats.merges.all, stats.guests.all),
    d30: conversion(stats.merges.d30, stats.guests.d30),
    d7: conversion(stats.merges.d7, stats.guests.d7),
  };
  return stats;
}
