import { createHash, createHmac } from "node:crypto";
import { canonicalAnonId } from "@/lib/anon-id";
import { assertGeoEvent, countryFromHeader, geoVisitorHash, type GeoEvent } from "@/lib/geo";
import { rateLimitKey, type RateLimiter } from "@/lib/rate-limit";
import {
  AUTH_REASONS,
  DEVICES,
  FEATURES,
  SANA_COMMANDS,
  SETTING_VALUES,
  SIGN_IN_METHODS,
  isThemeSetting,
  parseClientEvent,
  type ClientUsageEvent,
  type DeviceBucket,
  type FeatureId,
  type SanaCommand,
  type SignInMethod,
} from "@/lib/usage-catalog";

export {
  AUTH_REASONS,
  DEVICES,
  FEATURES,
  METHOD_LABELS,
  SANA_COMMANDS,
  SETTING_VALUES,
  SIGN_IN_METHODS,
  type AuthReason,
  type ClientUsageEvent,
  type DeviceBucket,
  type FeatureId,
  type SanaCommand,
  type SettingValue,
  type SignInMethod,
} from "@/lib/usage-catalog";

export const USAGE_RETENTION_MONTHS = 13;
export const SIGN_IN_DEDUPE_MS = 2 * 60 * 1000;
export const DELETE_DEDUPE_MS = 60 * 1000;
export const GUEST_EVENT_LIMIT = 100;
export const GUEST_EVENT_WINDOW_MS = 60 * 60 * 1000;
export const MERGE_EVENT_LIMIT = 8;
export const MERGE_EVENT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const CLIENT_BATCH_LIMIT = 20;
export const CLIENT_EVENT_LIMIT = 480;
export const SUBJECT_EVENT_LIMIT = 360;
export const CLIENT_EVENT_WINDOW_MS = 60 * 60 * 1000;
export const USAGE_BODY_LIMIT = 12_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const THEME_DEDUPE_SECONDS = 7 * 24 * 60 * 60;

export const USAGE_EVENT_TYPES = [
  "guest_started",
  "sign_up",
  "sign_in",
  "guest_merge",
  "account_deleted",
  "feature",
  "sana_opened",
  "sana_command",
  "sana_unknown",
  "tour_started",
  "tour_completed",
  "sana_refusal",
  "setting",
  "session_open",
  "auth_requested",
  "auth_code_used",
  "auth_failed",
] as const;
export type UsageEventType = (typeof USAGE_EVENT_TYPES)[number];

const ONCE_EVENTS = new Set<UsageEventType>(["guest_started", "sign_up", "guest_merge"]);

const DEDUPE_SECONDS: Partial<Record<UsageEventType, number>> = {
  sign_in: SIGN_IN_DEDUPE_MS / 1000,
  account_deleted: DELETE_DEDUPE_MS / 1000,
  feature: 2,
  sana_opened: 30,
  sana_command: 2,
  sana_unknown: 5,
  tour_started: 60,
  tour_completed: 300,
  sana_refusal: 5,
  setting: 2,
  auth_requested: 30,
  auth_code_used: 30,
  auth_failed: 30,
};

export type UsageInsert = {
  eventType: UsageEventType;
  method: SignInMethod | null;
  subjectHash: string;
  detail?: string | null;
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

export type FeatureStat = {
  id: FeatureId;
  counts: UsageCounts;
  readers: UsageCounts;
};

export type CommandStat = {
  command: SanaCommand;
  counts: UsageCounts;
  readers: UsageCounts;
};

export type SettingStat = {
  setting: string;
  counts: UsageCounts;
};

export type ThemeStat = {
  theme: string;
  readers: UsageCounts;
};

export type DeviceStat = {
  device: DeviceBucket;
  readers: UsageCounts;
};

export type AuthHealthRow = {
  method: SignInMethod;
  requested: UsageCounts;
  codeUsed: UsageCounts;
  completed: UsageCounts;
  failed: UsageCounts;
};

export type AuthFailureStat = {
  method: SignInMethod | null;
  reason: string;
  counts: UsageCounts;
};

export type UsageActivity = {
  day: number;
  d7: number;
  d30: number;
  all: number;
};

export type UsageRetention = {
  eligible: number;
  returned: number;
  rate: number | null;
  recentEligible: number;
  recentReturned: number;
  recentRate: number | null;
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
  features: FeatureStat[];
  sana: {
    opened: UsageCounts;
    unknown: UsageCounts;
    tourStarted: UsageCounts;
    tourCompleted: UsageCounts;
    refusals: UsageCounts;
    commands: CommandStat[];
  };
  settings: SettingStat[];
  themes: ThemeStat[];
  devices: DeviceStat[];
  activity: UsageActivity;
  retention: UsageRetention;
  authHealth: AuthHealthRow[];
  authFailures: AuthFailureStat[];
  dailyActive: { day: string; readers: number }[];
};

export type UsageTotalRow = {
  eventType: string;
  method: string | null;
  detail?: string | null;
  all: number;
  d30: number;
  d7: number;
  readersAll?: number;
  readers30?: number;
  readers7?: number;
};

export type UsageDailyRow = {
  day: string;
  eventType: string;
  count: number;
};

export type UsageDetailRow = {
  detail: string;
  all: number;
  d30: number;
  d7: number;
};

export type UsageStatsExtra = {
  activity?: UsageActivity;
  retention?: {
    eligible: number;
    returned: number;
    recentEligible: number;
    recentReturned: number;
  };
  themes?: UsageDetailRow[];
  devices?: UsageDetailRow[];
  dailyActive?: { day: string; readers: number }[];
};

const HASH = /^[0-9a-f]{64}$/;
const TOKEN = /^[a-z0-9_.:]+$/;

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

/** /admin/stats, including the country map. Anyone else is a 404. */
export function adminStatsStatus(email: string | null | undefined, raw = process.env.ADMIN_EMAILS ?? ""): 200 | 404 {
  return isAdminEmail(email, raw) ? 200 : 404;
}

export function signInMethod(provider: string | null | undefined): SignInMethod | null {
  const id = provider?.trim().toLowerCase();
  if (id === "magic-link" || id === "email-code" || id === "email") return "email_code";
  if (id === "passkey") return "passkey";
  if (id === "google") return "google";
  if (id === "apple") return "apple";
  return null;
}

function detailOf(event: UsageInsert) {
  return event.detail ?? null;
}

function quoteList(values: readonly string[]) {
  const unique = [...new Set(values)];
  for (const value of unique) {
    if (!TOKEN.test(value)) throw new Error("Usage token is not allowlisted");
  }
  return unique.map((value) => `'${value}'`).join(", ");
}

/** Trusted DDL built only from the allowlists. */
export function usageSchemaStatements() {
  const types = quoteList(USAGE_EVENT_TYPES);
  const methods = quoteList(SIGN_IN_METHODS);
  const details = quoteList([...FEATURES, ...SANA_COMMANDS, ...SETTING_VALUES, ...DEVICES, ...AUTH_REASONS]);
  return [
    "ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS detail text",
    "ALTER TABLE usage_events DROP CONSTRAINT IF EXISTS usage_events_type_chk",
    `ALTER TABLE usage_events ADD CONSTRAINT usage_events_type_chk CHECK (event_type IN (${types}))`,
    "ALTER TABLE usage_events DROP CONSTRAINT IF EXISTS usage_events_method_chk",
    `ALTER TABLE usage_events ADD CONSTRAINT usage_events_method_chk CHECK (method IS NULL OR method IN (${methods}))`,
    "ALTER TABLE usage_events DROP CONSTRAINT IF EXISTS usage_events_detail_chk",
    `ALTER TABLE usage_events ADD CONSTRAINT usage_events_detail_chk CHECK (detail IS NULL OR detail IN (${details}))`,
    "CREATE INDEX IF NOT EXISTS usage_events_subject_idx ON usage_events (subject_hash, created_at)",
    "INSERT INTO schema_migrations (id, status) VALUES ('usage-events-v2', 'done') ON CONFLICT (id) DO NOTHING",
  ];
}

export function usageDedupeSeconds(eventType: UsageEventType, detail: string | null) {
  if (eventType === "setting" && detail && isThemeSetting(detail)) return THEME_DEDUPE_SECONDS;
  return DEDUPE_SECONDS[eventType] ?? null;
}

export function usageInsertWindow(event: UsageInsert): "once" | "day" | number {
  if (ONCE_EVENTS.has(event.eventType)) return "once";
  if (event.eventType === "session_open") return "day";
  return usageDedupeSeconds(event.eventType, detailOf(event)) ?? 60;
}

export function assertUsageInsert(event: UsageInsert) {
  if (!(USAGE_EVENT_TYPES as readonly string[]).includes(event.eventType)) {
    throw new Error("Usage event type is not allowed");
  }
  if (event.method !== null && !(SIGN_IN_METHODS as readonly string[]).includes(event.method)) {
    throw new Error("Usage method is not allowed");
  }
  if (!HASH.test(event.subjectHash)) throw new Error("Usage subject is not a hash");
  const detail = detailOf(event);
  if (detail !== null && !TOKEN.test(detail)) throw new Error("Usage detail is not allowed");

  const methodFree = new Set<UsageEventType>([
    "guest_started",
    "guest_merge",
    "account_deleted",
    "feature",
    "sana_opened",
    "sana_command",
    "sana_unknown",
    "tour_started",
    "tour_completed",
    "sana_refusal",
    "setting",
    "session_open",
  ]);
  if (methodFree.has(event.eventType) && event.method !== null) {
    throw new Error("Usage event does not take a method");
  }

  switch (event.eventType) {
    case "sign_in":
    case "sign_up":
      if (!event.method || detail !== null) throw new Error("Usage sign-in needs a method");
      return;
    case "auth_requested":
      if (!event.method || detail !== null) throw new Error("Usage auth request needs a method");
      return;
    case "auth_code_used":
      if (event.method !== "email_code" || detail !== null) throw new Error("Usage code event is not allowed");
      return;
    case "auth_failed":
      if (!detail || !(AUTH_REASONS as readonly string[]).includes(detail)) {
        throw new Error("Usage failure reason is not allowed");
      }
      return;
    case "feature":
      if (!detail || !(FEATURES as readonly string[]).includes(detail)) throw new Error("Usage feature is not allowed");
      return;
    case "sana_command":
      if (!detail || !(SANA_COMMANDS as readonly string[]).includes(detail)) {
        throw new Error("Usage command is not allowed");
      }
      return;
    case "setting":
      if (!detail || !(SETTING_VALUES as readonly string[]).includes(detail)) {
        throw new Error("Usage setting is not allowed");
      }
      return;
    case "session_open":
      if (!detail || !(DEVICES as readonly string[]).includes(detail)) throw new Error("Usage device is not allowed");
      return;
    default:
      if (detail !== null) throw new Error("Usage detail is not allowed");
  }
}

function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function isDuplicateUsage(existing: readonly StoredUsageEvent[], next: UsageInsert, now: Date) {
  const detail = detailOf(next);
  const method = next.method ?? null;
  for (const row of existing) {
    if (row.eventType !== next.eventType || row.subjectHash !== next.subjectHash) continue;
    if (ONCE_EVENTS.has(next.eventType)) return true;
    if (next.eventType === "session_open") {
      if (utcDay(row.createdAt) === utcDay(now)) return true;
      continue;
    }
    if ((row.method ?? null) !== method) continue;
    if ((row.detail ?? null) !== detail) continue;
    const seconds = usageDedupeSeconds(next.eventType, detail);
    if (seconds == null) continue;
    const age = now.getTime() - row.createdAt.getTime();
    if (age >= 0 && age < seconds * 1000) return true;
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
      events.push({ ...event, detail: detailOf(event), createdAt: now });
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
  const signUp = await store.insert({ eventType: "sign_up", method, subjectHash, detail: null });
  const signIn = await store.insert({ eventType: "sign_in", method, subjectHash, detail: null });
  return { recorded: true as const, signUp, signIn, subjectHash };
}

export async function recordGuestStarted(store: UsageInserter, anonId: string, secret?: string) {
  const subjectHash = guestUsageSubject(anonId, secret);
  const result = await store.insert({ eventType: "guest_started", method: null, subjectHash, detail: null });
  return { result, subjectHash };
}

export async function recordGuestMerge(store: UsageInserter, email: string, anonId: string, secret?: string) {
  const subjectHash = mergeUsageSubject(email, anonId, secret);
  const result = await store.insert({ eventType: "guest_merge", method: null, subjectHash, detail: null });
  return { result, subjectHash };
}

export async function recordAccountDeleted(store: UsageInserter, email: string, secret?: string) {
  const subjectHash = accountUsageSubject(email, secret);
  const result = await store.insert({ eventType: "account_deleted", method: null, subjectHash, detail: null });
  return { result, subjectHash };
}

export function clientEventInsert(event: ClientUsageEvent, subjectHash: string): UsageInsert {
  switch (event.name) {
    case "feature":
      return { eventType: "feature", method: null, subjectHash, detail: event.feature };
    case "sana_command":
      return { eventType: "sana_command", method: null, subjectHash, detail: event.command };
    case "setting":
      return { eventType: "setting", method: null, subjectHash, detail: event.setting };
    case "session_open":
      return { eventType: "session_open", method: null, subjectHash, detail: event.device };
    case "page_view":
      throw new Error("Page views are not stored as usage events");
    case "auth_requested":
      return { eventType: "auth_requested", method: event.method, subjectHash, detail: null };
    case "auth_failed":
      return { eventType: "auth_failed", method: event.method, subjectHash, detail: event.reason };
    case "sana_opened":
    case "sana_unknown":
    case "tour_started":
    case "tour_completed":
    case "sana_refusal":
      return { eventType: event.name, method: null, subjectHash, detail: null };
  }
}

export type UsageRequest =
  | { ok: true; kind: "guest_started" | "guest_merge"; anonId: string }
  | { ok: true; kind: "batch"; anonId: string | null; events: ClientUsageEvent[] }
  | { ok: false; error: string };

function optionalAnon(value: unknown): string | null | "bad" {
  if (value == null) return null;
  if (typeof value !== "string") return "bad";
  return canonicalAnonId(value) ?? "bad";
}

export function parseUsageRequest(body: unknown): UsageRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Invalid request." };
  const record = body as Record<string, unknown>;
  if ("events" in record) {
    if (!Object.keys(record).every((key) => (CLIENT_BATCH_KEY_SET as readonly string[]).includes(key))) {
      return { ok: false, error: "Invalid request." };
    }
    if (!Array.isArray(record.events) || record.events.length === 0 || record.events.length > CLIENT_BATCH_LIMIT) {
      return { ok: false, error: "Invalid request." };
    }
    const anonId = optionalAnon("anonId" in record ? record.anonId : null);
    if (anonId === "bad") return { ok: false, error: "Invalid request." };
    const events: ClientUsageEvent[] = [];
    for (const item of record.events) {
      const event = parseClientEvent(item);
      if (!event) return { ok: false, error: "Invalid request." };
      events.push(event);
    }
    return { ok: true, kind: "batch", anonId, events };
  }

  const anonId = typeof record.anonId === "string" ? canonicalAnonId(record.anonId) : null;
  if ((record.event === "guest_started" || record.event === "guest_merge") && anonId) {
    return { ok: true, kind: record.event, anonId };
  }
  return { ok: false, error: "Invalid request." };
}

const CLIENT_BATCH_KEY_SET = ["events", "anonId"] as const;

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
  countryHeader?: string | null;
  recordGeo?: (event: GeoEvent) => Promise<void>;
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

  if (parsed.kind === "guest_merge") {
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

  const email = input.signedInEmail?.trim().toLowerCase() ?? "";
  let subjectHash: string;
  try {
    subjectHash = email
      ? accountUsageSubject(email, input.secret)
      : parsed.anonId
        ? guestUsageSubject(parsed.anonId, input.secret)
        : "";
  } catch {
    return unavailable();
  }
  if (!subjectHash || parsed.kind !== "batch") return { status: 400, body: { ok: false, error: "Invalid request." } };

  for (let index = 0; index < parsed.events.length; index += 1) {
    const ipHit = await input.limiter.hit(
      rateLimitKey("ip", `usage-client:${input.ip}`),
      CLIENT_EVENT_LIMIT,
      CLIENT_EVENT_WINDOW_MS,
      now,
    );
    if (!ipHit.ok) return limited(ipHit.retryAfterSec);
    const subjectHit = await input.limiter.hit(
      rateLimitKey("email", `usage-subject:${subjectHash}`),
      SUBJECT_EVENT_LIMIT,
      CLIENT_EVENT_WINDOW_MS,
      now,
    );
    if (!subjectHit.ok) return limited(subjectHit.retryAfterSec);
  }

  try {
    for (const event of parsed.events) {
      if (event.name === "page_view") {
        await emitGeo(input, "page_view", parsed.anonId);
        continue;
      }
      await input.store.insert(clientEventInsert(event, subjectHash));
      if (event.name === "session_open") await emitGeo(input, "visit", parsed.anonId);
    }
  } catch {
    return unavailable();
  }
  return { status: 200, body: { ok: true } };
}

async function emitGeo(
  input: { now?: number; secret?: string; countryHeader?: string | null; recordGeo?: (event: GeoEvent) => Promise<void> },
  kind: GeoEvent["kind"],
  anonId: string | null,
) {
  if (!input.recordGeo || !anonId) return;
  try {
    const day = new Date(input.now ?? Date.now()).toISOString().slice(0, 10);
    const event: GeoEvent = {
      day,
      country: countryFromHeader(input.countryHeader),
      visitorHash: geoVisitorHash(anonId, day, input.secret),
      kind,
    };
    assertGeoEvent(event);
    await input.recordGeo(event);
  } catch {
    // A country total must not fail the product event, and it never stores the address.
  }
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

function share(part: number, whole: number) {
  return whole > 0 ? part / whole : null;
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
    day: new Date(now.getTime() - DAY_MS).toISOString(),
    d7: new Date(now.getTime() - 7 * DAY_MS).toISOString(),
    d30: new Date(now.getTime() - 30 * DAY_MS).toISOString(),
    week: new Date(now.getTime() - 7 * DAY_MS).toISOString(),
  };
}

function isMethod(value: string | null): value is SignInMethod {
  return Boolean(value && (SIGN_IN_METHODS as readonly string[]).includes(value));
}

function addCounts(target: UsageCounts, row: UsageCounts) {
  target.all += row.all;
  target.d30 += row.d30;
  target.d7 += row.d7;
}

function readerCounts(row: UsageTotalRow): UsageCounts {
  return {
    all: row.readersAll ?? 0,
    d30: row.readers30 ?? 0,
    d7: row.readers7 ?? 0,
  };
}

function detailReaders(rows: UsageDetailRow[] | undefined, id: string): UsageCounts {
  const row = rows?.find((item) => item.detail === id);
  return row ? { all: row.all, d30: row.d30, d7: row.d7 } : emptyCounts();
}

export function assembleUsageStats(
  totals: UsageTotalRow[],
  daily: UsageDailyRow[],
  now = new Date(),
  extra: UsageStatsExtra = {},
): UsageStats {
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
    features: FEATURES.map((id) => ({ id, counts: emptyCounts(), readers: emptyCounts() })),
    sana: {
      opened: emptyCounts(),
      unknown: emptyCounts(),
      tourStarted: emptyCounts(),
      tourCompleted: emptyCounts(),
      refusals: emptyCounts(),
      commands: [],
    },
    settings: [],
    themes: [],
    devices: DEVICES.map((device) => ({ device, readers: emptyCounts() })),
    activity: extra.activity ?? { day: 0, d7: 0, d30: 0, all: 0 },
    retention: {
      eligible: extra.retention?.eligible ?? 0,
      returned: extra.retention?.returned ?? 0,
      rate: share(extra.retention?.returned ?? 0, extra.retention?.eligible ?? 0),
      recentEligible: extra.retention?.recentEligible ?? 0,
      recentReturned: extra.retention?.recentReturned ?? 0,
      recentRate: share(extra.retention?.recentReturned ?? 0, extra.retention?.recentEligible ?? 0),
    },
    authHealth: SIGN_IN_METHODS.map((method) => ({
      method,
      requested: emptyCounts(),
      codeUsed: emptyCounts(),
      completed: emptyCounts(),
      failed: emptyCounts(),
    })),
    authFailures: [],
    dailyActive: usageChartDays(now).map((day) => ({
      day,
      readers: extra.dailyActive?.find((item) => item.day.slice(0, 10) === day)?.readers ?? 0,
    })),
  };

  const featureById = new Map(stats.features.map((feature) => [feature.id, feature]));
  const healthByMethod = new Map(stats.authHealth.map((row) => [row.method, row]));
  const commands = new Map<SanaCommand, CommandStat>();

  for (const row of totals) {
    if (row.eventType === "guest_started") addCounts(stats.guests, row);
    else if (row.eventType === "sign_up") addCounts(stats.signUps, row);
    else if (row.eventType === "guest_merge") addCounts(stats.merges, row);
    else if (row.eventType === "account_deleted") addCounts(stats.deletions, row);
    else if (row.eventType === "sign_in") {
      addCounts(stats.signInTotal, row);
      if (isMethod(row.method)) addCounts(stats.signIns[row.method], row);
      if (isMethod(row.method)) addCounts(healthByMethod.get(row.method)!.completed, row);
    } else if (row.eventType === "feature" && row.detail && featureById.has(row.detail as FeatureId)) {
      const feature = featureById.get(row.detail as FeatureId)!;
      addCounts(feature.counts, row);
      const readers = readerCounts(row);
      addCounts(feature.readers, readers);
    } else if (row.eventType === "sana_opened") addCounts(stats.sana.opened, row);
    else if (row.eventType === "sana_unknown") addCounts(stats.sana.unknown, row);
    else if (row.eventType === "tour_started") addCounts(stats.sana.tourStarted, row);
    else if (row.eventType === "tour_completed") addCounts(stats.sana.tourCompleted, row);
    else if (row.eventType === "sana_refusal") addCounts(stats.sana.refusals, row);
    else if (row.eventType === "sana_command" && row.detail && (SANA_COMMANDS as readonly string[]).includes(row.detail)) {
      const command = row.detail as SanaCommand;
      const current = commands.get(command) ?? { command, counts: emptyCounts(), readers: emptyCounts() };
      addCounts(current.counts, row);
      addCounts(current.readers, readerCounts(row));
      commands.set(command, current);
    } else if (row.eventType === "setting" && row.detail && !isThemeSetting(row.detail)) {
      const current = stats.settings.find((item) => item.setting === row.detail) ?? {
        setting: row.detail,
        counts: emptyCounts(),
      };
      addCounts(current.counts, row);
      if (!stats.settings.includes(current)) stats.settings.push(current);
    } else if (row.eventType === "auth_requested" && isMethod(row.method)) {
      addCounts(healthByMethod.get(row.method)!.requested, row);
    } else if (row.eventType === "auth_code_used" && isMethod(row.method)) {
      addCounts(healthByMethod.get(row.method)!.codeUsed, row);
    } else if (row.eventType === "auth_failed" && row.detail && (AUTH_REASONS as readonly string[]).includes(row.detail)) {
      if (isMethod(row.method)) addCounts(healthByMethod.get(row.method)!.failed, row);
      const method = isMethod(row.method) ? row.method : null;
      const current = stats.authFailures.find((item) => item.method === method && item.reason === row.detail) ?? {
        method,
        reason: row.detail,
        counts: emptyCounts(),
      };
      addCounts(current.counts, row);
      if (!stats.authFailures.includes(current)) stats.authFailures.push(current);
    } else if (!extra.devices && row.eventType === "session_open" && row.detail && (DEVICES as readonly string[]).includes(row.detail)) {
      const device = stats.devices.find((item) => item.device === row.detail);
      if (device) addCounts(device.readers, readerCounts(row).all ? readerCounts(row) : { all: row.all, d30: row.d30, d7: row.d7 });
    }
  }

  stats.sana.commands = [...commands.values()].sort((a, b) => b.counts.all - a.counts.all || a.command.localeCompare(b.command));
  stats.settings.sort((a, b) => b.counts.all - a.counts.all || a.setting.localeCompare(b.setting));
  stats.authFailures.sort((a, b) => b.counts.all - a.counts.all || a.reason.localeCompare(b.reason));

  if (extra.themes) {
    stats.themes = extra.themes
      .map((row) => {
        const theme = row.detail.startsWith("theme:") ? row.detail.slice("theme:".length) : row.detail;
        return { theme, readers: { all: row.all, d30: row.d30, d7: row.d7 } };
      })
      .filter((row) => APPEARANCE_THEME_IDS.has(row.theme));
  }
  if (extra.devices) {
    stats.devices = DEVICES.map((device) => ({ device, readers: detailReaders(extra.devices, device) }));
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

const APPEARANCE_THEME_IDS = new Set([
  "iris",
  "pastels",
  "manuscript",
  "emerald",
  "ottoman",
  "ivory",
  "sepia",
  "contrast",
  "aurora",
  "obsidian",
  "midnight",
  "slate",
  "forest",
  "amethyst",
  "rose",
  "cyan",
  "blush",
]);
