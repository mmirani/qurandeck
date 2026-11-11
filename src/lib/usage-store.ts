import { getSql } from "@/lib/db";
import {
  USAGE_RETENTION_MONTHS,
  assertUsageInsert,
  assembleUsageStats,
  recordAccountDeleted as recordDeleted,
  recordAuthEvents,
  recordGuestMerge as recordMerge,
  recordGuestStarted as recordGuest,
  usageRange,
  usageRecordingEnabled,
  type UsageDailyRow,
  type UsageInserter,
  type UsageInsert,
  type UsageInsertResult,
  type UsageStats,
  type UsageTotalRow,
} from "@/lib/usage";

let ready: Promise<void> | null = null;

export function prepareUsageStore() {
  ready ??= run().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

async function run() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      status text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS usage_events (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      event_type text NOT NULL,
      method text,
      subject_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT usage_events_type_chk CHECK (
        event_type IN ('guest_started', 'sign_up', 'sign_in', 'guest_merge', 'account_deleted')
      ),
      CONSTRAINT usage_events_method_chk CHECK (
        method IS NULL OR method IN ('email_code', 'passkey', 'google', 'apple')
      )
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS usage_events_once_idx
      ON usage_events (event_type, subject_hash)
      WHERE event_type IN ('guest_started', 'sign_up', 'guest_merge')
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS usage_events_created_idx
      ON usage_events (created_at)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS usage_events_lookup_idx
      ON usage_events (event_type, subject_hash, created_at DESC)
  `;
  await sql`
    INSERT INTO schema_migrations (id, status)
    VALUES ('usage-events-v1', 'done')
    ON CONFLICT (id) DO NOTHING
  `;
  // Raw rows are kept for about 13 months, then removed on the next cold start.
  await sql`
    DELETE FROM usage_events
    WHERE created_at < now() - make_interval(months => ${USAGE_RETENTION_MONTHS}::int)
  `;
}

function isUniqueViolation(error: unknown) {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const record = current as { code?: unknown; message?: unknown; cause?: unknown };
    if (record.code === "23505") return true;
    if (typeof record.message === "string" && record.message.includes("usage_events_once_idx")) return true;
    current = record.cause;
  }
  return false;
}

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

async function insertReturning(sql: Sql, event: UsageInsert) {
  if (event.eventType === "sign_in") {
    return sql`
      INSERT INTO usage_events (event_type, method, subject_hash)
      SELECT ${event.eventType}, ${event.method}, ${event.subjectHash}
      WHERE NOT EXISTS (
        SELECT 1 FROM usage_events existing
        WHERE existing.event_type = 'sign_in'
          AND existing.subject_hash = ${event.subjectHash}
          AND existing.method IS NOT DISTINCT FROM ${event.method}
          AND existing.created_at > now() - interval '2 minutes'
      )
      RETURNING id
    `;
  }
  if (event.eventType === "account_deleted") {
    return sql`
      INSERT INTO usage_events (event_type, method, subject_hash)
      SELECT ${event.eventType}, ${event.method}, ${event.subjectHash}
      WHERE NOT EXISTS (
        SELECT 1 FROM usage_events existing
        WHERE existing.event_type = 'account_deleted'
          AND existing.subject_hash = ${event.subjectHash}
          AND existing.created_at > now() - interval '1 minute'
      )
      RETURNING id
    `;
  }
  return sql`
    INSERT INTO usage_events (event_type, method, subject_hash)
    SELECT ${event.eventType}, ${event.method}, ${event.subjectHash}
    WHERE NOT EXISTS (
      SELECT 1 FROM usage_events existing
      WHERE existing.event_type = ${event.eventType}
        AND existing.subject_hash = ${event.subjectHash}
    )
    RETURNING id
  `;
}

const sqlInserter: UsageInserter = {
  async insert(event: UsageInsert): Promise<UsageInsertResult> {
    assertUsageInsert(event);
    await prepareUsageStore();
    const sql = getSql() as unknown as Sql;
    try {
      const rows = await insertReturning(sql, event);
      return Array.isArray(rows) && rows.length > 0 ? "inserted" : "duplicate";
    } catch (error) {
      if (isUniqueViolation(error)) return "duplicate";
      throw error;
    }
  },
};

export function getUsageInserter(): UsageInserter {
  return sqlInserter;
}

async function withStore(runInsert: (store: UsageInserter) => Promise<unknown>) {
  if (!usageRecordingEnabled()) return;
  await prepareUsageStore();
  await runInsert(sqlInserter);
}

export function recordSignIn(email: string, provider: string | null | undefined) {
  return withStore((store) => recordAuthEvents(store, email, provider));
}

export function recordGuestStarted(anonId: string) {
  return withStore((store) => recordGuest(store, anonId));
}

export function recordGuestMerge(email: string, anonId: string) {
  return withStore((store) => recordMerge(store, email, anonId));
}

export function recordAccountDeleted(email: string) {
  return withStore((store) => recordDeleted(store, email));
}

function count(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export async function loadUsageStats(now = new Date()): Promise<UsageStats> {
  await prepareUsageStore();
  const sql = getSql();
  const range = usageRange(now);
  const totals = (await sql`
    SELECT event_type,
           method,
           count(*)::int AS all_count,
           count(*) FILTER (WHERE created_at >= ${range.d30}::timestamptz)::int AS d30,
           count(*) FILTER (WHERE created_at >= ${range.d7}::timestamptz)::int AS d7
    FROM usage_events
    GROUP BY event_type, method
  `) as { event_type?: string; method?: string | null; all_count?: unknown; d30?: unknown; d7?: unknown }[];
  const daily = (await sql`
    SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
           event_type,
           count(*)::int AS n
    FROM usage_events
    WHERE created_at >= ${range.d30}::timestamptz
    GROUP BY 1, 2
  `) as { day?: unknown; event_type?: string; n?: unknown }[];

  const totalRows: UsageTotalRow[] = totals.map((row) => ({
    eventType: String(row.event_type ?? ""),
    method: row.method ?? null,
    all: count(row.all_count),
    d30: count(row.d30),
    d7: count(row.d7),
  }));
  const dailyRows: UsageDailyRow[] = daily.map((row) => ({
    day: String(row.day ?? ""),
    eventType: String(row.event_type ?? ""),
    count: count(row.n),
  }));
  return assembleUsageStats(totalRows, dailyRows, now);
}
