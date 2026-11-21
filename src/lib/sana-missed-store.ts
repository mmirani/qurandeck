import "server-only";
import { getSql } from "@/lib/db";
import {
  MISSED_RETENTION_DAYS,
  MISSED_WINDOW_DAYS,
  missedSchemaStatements,
  onceWithRetry,
  topMissedShapes,
  type MissedStore,
  type MissedTop,
} from "@/lib/sana-missed";

/**
 * Daily counts of Sana missed-command shapes in `sana_missed_daily`.
 * The table is created with CREATE TABLE IF NOT EXISTS once per server instance, like the usage tables.
 * If that fails, every call is a quiet no-op and setup is tried again later.
 */

type Sql = ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>) & {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
};

const MISSING_RETRY_MS = 10 * 60 * 1000;
const PURGE_EVERY_MS = 60 * 60 * 1000;

let missingUntil = 0;
let lastPurge = 0;

const ensureTable = onceWithRetry(async () => {
  const sql = sqlOrNull();
  if (!sql) throw new Error("No database");
  for (const statement of missedSchemaStatements()) await sql.query(statement);
}, MISSING_RETRY_MS);

function sqlOrNull(): Sql | null {
  if (!process.env.DATABASE_URL) return null;
  try {
    return getSql() as unknown as Sql;
  } catch {
    return null;
  }
}

/** Postgres "undefined_table". */
function isMissingTable(error: unknown) {
  return Boolean(error && typeof error === "object" && (error as { code?: unknown }).code === "42P01");
}

async function guarded<T>(fallback: T, run: (sql: Sql) => Promise<T>): Promise<T> {
  if (Date.now() < missingUntil) return fallback;
  const sql = sqlOrNull();
  if (!sql) return fallback;
  if (!(await ensureTable())) return fallback;
  try {
    return await run(sql);
  } catch (error) {
    if (isMissingTable(error)) {
      missingUntil = Date.now() + MISSING_RETRY_MS;
      return fallback;
    }
    throw error;
  }
}

/** Deletes rows older than 90 days. At most once an hour per server instance. */
export async function purgeOldMissed(force = false) {
  if (!force && Date.now() - lastPurge < PURGE_EVERY_MS) return false;
  return guarded(false, async (sql) => {
    await sql`
      DELETE FROM sana_missed_daily
      WHERE day < (timezone('UTC', now()))::date - ${MISSED_RETENTION_DAYS}::int
    `;
    lastPurge = Date.now();
    return true;
  });
}

export function getMissedStore(): MissedStore {
  return {
    record: (shape) =>
      guarded(false, async (sql) => {
        await sql`
          INSERT INTO sana_missed_daily (shape, day, count)
          VALUES (${shape}, (timezone('UTC', now()))::date, 1)
          ON CONFLICT (shape, day) DO UPDATE SET count = sana_missed_daily.count + 1
        `;
        await purgeOldMissed().catch(() => false);
        return true;
      }),
  };
}

/** Admin view: null when the table is not there yet. */
export async function loadTopMissed(): Promise<MissedTop[] | null> {
  await purgeOldMissed(true).catch(() => false);
  return guarded<MissedTop[] | null>(null, async (sql) => {
    const rows = (await sql`
      SELECT shape, to_char(day, 'YYYY-MM-DD') AS day, count
      FROM sana_missed_daily
      WHERE day >= (timezone('UTC', now()))::date - ${MISSED_WINDOW_DAYS - 1}::int
    `) as { shape: string; day: string; count: number }[];
    return topMissedShapes(rows);
  });
}
