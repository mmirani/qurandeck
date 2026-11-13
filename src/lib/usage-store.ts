import { getSql } from "@/lib/db";
import { geoSchemaStatements } from "@/lib/geo";
import {
  USAGE_RETENTION_MONTHS,
  accountUsageSubject,
  assertUsageInsert,
  assembleUsageStats,
  recordAccountDeleted as recordDeleted,
  recordAuthEvents,
  recordGuestMerge as recordMerge,
  recordGuestStarted as recordGuest,
  usageInsertWindow,
  usageRange,
  usageRecordingEnabled,
  usageSchemaStatements,
  type AuthReason,
  type SignInMethod,
  type UsageActivity,
  type UsageDailyRow,
  type UsageDetailRow,
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

type Sql = ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>) & {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
};

async function run() {
  const sql = getSql() as unknown as Sql;
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
      detail text,
      created_at timestamptz NOT NULL DEFAULT now()
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
  for (const statement of usageSchemaStatements()) {
    await sql.query(statement);
  }
  for (const statement of geoSchemaStatements()) {
    await sql.query(statement);
  }
  // Raw rows are kept for about 13 months, then removed on the next cold start.
  await sql`
    DELETE FROM usage_events
    WHERE created_at < now() - make_interval(months => ${USAGE_RETENTION_MONTHS}::int)
  `;
  await sql`
    DELETE FROM usage_geo_visitors
    WHERE day < (timezone('UTC', now()))::date - make_interval(months => ${USAGE_RETENTION_MONTHS}::int)
  `;
  await sql`
    DELETE FROM usage_geo_daily
    WHERE day < (timezone('UTC', now()))::date - make_interval(months => ${USAGE_RETENTION_MONTHS}::int)
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

async function insertReturning(sql: Sql, event: UsageInsert) {
  const detail = event.detail ?? null;
  const window = usageInsertWindow(event);
  if (window === "once") {
    return sql`
      INSERT INTO usage_events (event_type, method, subject_hash, detail)
      SELECT ${event.eventType}, ${event.method}, ${event.subjectHash}, ${detail}
      WHERE NOT EXISTS (
        SELECT 1 FROM usage_events existing
        WHERE existing.event_type = ${event.eventType}
          AND existing.subject_hash = ${event.subjectHash}
      )
      RETURNING id
    `;
  }
  if (window === "day") {
    return sql`
      INSERT INTO usage_events (event_type, method, subject_hash, detail)
      SELECT ${event.eventType}, ${event.method}, ${event.subjectHash}, ${detail}
      WHERE NOT EXISTS (
        SELECT 1 FROM usage_events existing
        WHERE existing.event_type = 'session_open'
          AND existing.subject_hash = ${event.subjectHash}
          AND existing.created_at >= date_trunc('day', (now() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC'
      )
      RETURNING id
    `;
  }
  return sql`
    INSERT INTO usage_events (event_type, method, subject_hash, detail)
    SELECT ${event.eventType}, ${event.method}, ${event.subjectHash}, ${detail}
    WHERE NOT EXISTS (
      SELECT 1 FROM usage_events existing
      WHERE existing.event_type = ${event.eventType}
        AND existing.subject_hash = ${event.subjectHash}
        AND existing.method IS NOT DISTINCT FROM ${event.method}
        AND existing.detail IS NOT DISTINCT FROM ${detail}
        AND existing.created_at > now() - make_interval(secs => ${window}::int)
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

function accountEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return normalized;
}

export function recordAuthRequested(email: string, method: SignInMethod) {
  const normalized = accountEmail(email);
  if (!normalized) return Promise.resolve();
  return withStore((store) =>
    store.insert({
      eventType: "auth_requested",
      method,
      detail: null,
      subjectHash: accountUsageSubject(normalized),
    }),
  );
}

export function recordAuthCodeUsed(email: string) {
  const normalized = accountEmail(email);
  if (!normalized) return Promise.resolve();
  return withStore((store) =>
    store.insert({
      eventType: "auth_code_used",
      method: "email_code",
      detail: null,
      subjectHash: accountUsageSubject(normalized),
    }),
  );
}

export function recordAuthFailed(email: string, method: SignInMethod, reason: AuthReason) {
  const normalized = accountEmail(email);
  if (!normalized) return Promise.resolve();
  return withStore((store) =>
    store.insert({
      eventType: "auth_failed",
      method,
      detail: reason,
      subjectHash: accountUsageSubject(normalized),
    }),
  );
}

function count(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export async function loadUsageStats(now = new Date()): Promise<UsageStats> {
  await prepareUsageStore();
  const sql = getSql();
  const range = usageRange(now);
  const [totals, daily, dailyActive, activityRows, retentionRows, themes, devices] = await Promise.all([
    sql`
      SELECT event_type,
             method,
             detail,
             count(*)::int AS all_count,
             count(*) FILTER (WHERE created_at >= ${range.d30}::timestamptz)::int AS d30,
             count(*) FILTER (WHERE created_at >= ${range.d7}::timestamptz)::int AS d7,
             count(DISTINCT subject_hash)::int AS readers_all,
             count(DISTINCT subject_hash) FILTER (WHERE created_at >= ${range.d30}::timestamptz)::int AS readers_30,
             count(DISTINCT subject_hash) FILTER (WHERE created_at >= ${range.d7}::timestamptz)::int AS readers_7
      FROM usage_events
      GROUP BY event_type, method, detail
    ` as Promise<Record<string, unknown>[]>,
    sql`
      SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
             event_type,
             count(*)::int AS n
      FROM usage_events
      WHERE created_at >= ${range.d30}::timestamptz
      GROUP BY 1, 2
    ` as Promise<Record<string, unknown>[]>,
    sql`
      SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
             count(DISTINCT subject_hash)::int AS n
      FROM usage_events
      WHERE created_at >= ${range.d30}::timestamptz
      GROUP BY 1
    ` as Promise<Record<string, unknown>[]>,
    sql`
      SELECT
        count(DISTINCT subject_hash) FILTER (WHERE created_at >= ${range.day}::timestamptz)::int AS day_count,
        count(DISTINCT subject_hash) FILTER (WHERE created_at >= ${range.d7}::timestamptz)::int AS d7,
        count(DISTINCT subject_hash) FILTER (WHERE created_at >= ${range.d30}::timestamptz)::int AS d30,
        count(DISTINCT subject_hash)::int AS all_count
      FROM usage_events
    ` as Promise<Record<string, unknown>[]>,
    sql`
      WITH firsts AS (
        SELECT subject_hash, min(created_at) AS first_seen
        FROM usage_events
        GROUP BY subject_hash
      ),
      eligible AS (
        SELECT f.subject_hash,
               f.first_seen,
               EXISTS (
                 SELECT 1 FROM usage_events later
                 WHERE later.subject_hash = f.subject_hash
                   AND later.created_at >= f.first_seen + interval '7 days'
               ) AS returned
        FROM firsts f
        WHERE f.first_seen <= ${range.week}::timestamptz
      )
      SELECT count(*)::int AS eligible,
             count(*) FILTER (WHERE returned)::int AS returned,
             count(*) FILTER (WHERE first_seen >= ${range.d30}::timestamptz)::int AS recent_eligible,
             count(*) FILTER (WHERE returned AND first_seen >= ${range.d30}::timestamptz)::int AS recent_returned
      FROM eligible
    ` as Promise<Record<string, unknown>[]>,
    latestDetails(sql, "setting", "theme:%", range),
    latestDetails(sql, "session_open", null, range),
  ]);

  const totalRows: UsageTotalRow[] = totals.map((row) => ({
    eventType: String(row.event_type ?? ""),
    method: (row.method as string | null) ?? null,
    detail: (row.detail as string | null) ?? null,
    all: count(row.all_count),
    d30: count(row.d30),
    d7: count(row.d7),
    readersAll: count(row.readers_all),
    readers30: count(row.readers_30),
    readers7: count(row.readers_7),
  }));
  const dailyRows: UsageDailyRow[] = daily.map((row) => ({
    day: String(row.day ?? ""),
    eventType: String(row.event_type ?? ""),
    count: count(row.n),
  }));
  const activity: UsageActivity = {
    day: count(activityRows[0]?.day_count),
    d7: count(activityRows[0]?.d7),
    d30: count(activityRows[0]?.d30),
    all: count(activityRows[0]?.all_count),
  };
  const retention = retentionRows[0] ?? {};
  return assembleUsageStats(totalRows, dailyRows, now, {
    activity,
    retention: {
      eligible: count(retention.eligible),
      returned: count(retention.returned),
      recentEligible: count(retention.recent_eligible),
      recentReturned: count(retention.recent_returned),
    },
    themes,
    devices,
    dailyActive: dailyActive.map((row) => ({ day: String(row.day ?? ""), readers: count(row.n) })),
  });
}

async function latestDetails(
  sql: ReturnType<typeof getSql>,
  eventType: string,
  detailLike: string | null,
  range: { d30: string; d7: string },
): Promise<UsageDetailRow[]> {
  const rows = detailLike
    ? await sql`
        WITH matched AS (
          SELECT subject_hash, detail, created_at
          FROM usage_events
          WHERE event_type = ${eventType} AND detail LIKE ${detailLike}
        ),
        latest AS (
          SELECT DISTINCT ON (subject_hash) detail
          FROM matched
          ORDER BY subject_hash, created_at DESC
        ),
        latest30 AS (
          SELECT DISTINCT ON (subject_hash) detail
          FROM matched
          WHERE created_at >= ${range.d30}::timestamptz
          ORDER BY subject_hash, created_at DESC
        ),
        latest7 AS (
          SELECT DISTINCT ON (subject_hash) detail
          FROM matched
          WHERE created_at >= ${range.d7}::timestamptz
          ORDER BY subject_hash, created_at DESC
        )
        SELECT detail,
               (SELECT count(*)::int FROM latest l WHERE l.detail = options.detail) AS all_count,
               (SELECT count(*)::int FROM latest30 l WHERE l.detail = options.detail) AS d30,
               (SELECT count(*)::int FROM latest7 l WHERE l.detail = options.detail) AS d7
        FROM (SELECT DISTINCT detail FROM matched) options
      `
    : await sql`
        WITH matched AS (
          SELECT subject_hash, detail, created_at
          FROM usage_events
          WHERE event_type = ${eventType} AND detail IS NOT NULL
        ),
        latest AS (
          SELECT DISTINCT ON (subject_hash) detail
          FROM matched
          ORDER BY subject_hash, created_at DESC
        ),
        latest30 AS (
          SELECT DISTINCT ON (subject_hash) detail
          FROM matched
          WHERE created_at >= ${range.d30}::timestamptz
          ORDER BY subject_hash, created_at DESC
        ),
        latest7 AS (
          SELECT DISTINCT ON (subject_hash) detail
          FROM matched
          WHERE created_at >= ${range.d7}::timestamptz
          ORDER BY subject_hash, created_at DESC
        )
        SELECT detail,
               (SELECT count(*)::int FROM latest l WHERE l.detail = options.detail) AS all_count,
               (SELECT count(*)::int FROM latest30 l WHERE l.detail = options.detail) AS d30,
               (SELECT count(*)::int FROM latest7 l WHERE l.detail = options.detail) AS d7
        FROM (SELECT DISTINCT detail FROM matched) options
      `;
  return (rows as Record<string, unknown>[]).map((row) => ({
    detail: String(row.detail ?? ""),
    all: count(row.all_count),
    d30: count(row.d30),
    d7: count(row.d7),
  }));
}
