import { getSql } from "@/lib/db";
import type { FeedbackMessage } from "@/lib/feedback";

export type FeedbackSql = ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>) & {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
};

export type FeedbackStore = {
  prepare(): Promise<void>;
  save(entry: { name: string | null; email: string | null; message: string }): Promise<void>;
  list(options?: { limit?: number; offset?: number }): Promise<{ messages: FeedbackMessage[]; total: number }>;
  countUnread(): Promise<number>;
  setRead(id: number, read: boolean): Promise<boolean>;
  remove(id: number): Promise<boolean>;
};

export function feedbackSchemaStatements() {
  return [
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      status text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS feedback (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name text,
      email text,
      message text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `INSERT INTO schema_migrations (id, status) VALUES ('feedback-v1', 'done') ON CONFLICT (id) DO NOTHING`,
    `ALTER TABLE feedback ADD COLUMN IF NOT EXISTS read_at timestamptz`,
    `CREATE INDEX IF NOT EXISTS feedback_created_idx ON feedback (created_at DESC, id DESC)`,
    `INSERT INTO schema_migrations (id, status) VALUES ('feedback-v2', 'done') ON CONFLICT (id) DO NOTHING`,
  ];
}

export function createFeedbackStore(sql: FeedbackSql): FeedbackStore {
  let ready: Promise<void> | null = null;

  function prepare() {
    ready ??= migrate(sql).catch((error) => {
      ready = null;
      throw error;
    });
    return ready;
  }

  return {
    prepare,
    async save(entry) {
      await prepare();
      await sql`
        INSERT INTO feedback (name, email, message)
        VALUES (${entry.name}, ${entry.email}, ${entry.message})
      `;
    },
    async list(options) {
      await prepare();
      const limit = clampLimit(options?.limit);
      const offset = clampOffset(options?.offset);
      const [rows, totals] = await Promise.all([
        sql`
          SELECT id, name, email, message, created_at, read_at
          FROM feedback
          ORDER BY created_at DESC, id DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        sql`SELECT count(*)::int AS total FROM feedback`,
      ]);
      return {
        messages: rows.map((row) => mapFeedbackRow(row)),
        total: asCount(totals[0]?.total),
      };
    },
    async countUnread() {
      await prepare();
      const rows = await sql`SELECT count(*)::int AS unread FROM feedback WHERE read_at IS NULL`;
      return asCount(rows[0]?.unread);
    },
    async setRead(id, read) {
      await prepare();
      const rows = read
        ? await sql`
            UPDATE feedback
            SET read_at = COALESCE(read_at, now())
            WHERE id = ${id}
            RETURNING id
          `
        : await sql`
            UPDATE feedback
            SET read_at = NULL
            WHERE id = ${id}
            RETURNING id
          `;
      return rows.length > 0;
    },
    async remove(id) {
      await prepare();
      const rows = await sql`
        DELETE FROM feedback
        WHERE id = ${id}
        RETURNING id
      `;
      return rows.length > 0;
    },
  };
}

let production: FeedbackStore | null = null;

function store() {
  production ??= createFeedbackStore(getSql() as unknown as FeedbackSql);
  return production;
}

async function migrate(sql: FeedbackSql) {
  for (const statement of feedbackSchemaStatements()) {
    await sql.query(statement);
  }
}

export function prepareFeedbackStore() {
  return store().prepare();
}

export async function saveFeedback(entry: { name: string | null; email: string | null; message: string }) {
  await store().save(entry);
}

export async function listFeedback(options?: { limit?: number; offset?: number }) {
  return store().list(options);
}

export async function countUnreadFeedback() {
  return store().countUnread();
}

export async function setFeedbackRead(id: number, read: boolean) {
  return store().setRead(id, read);
}

export async function deleteFeedback(id: number) {
  return store().remove(id);
}

function asId(value: unknown): number {
  const id = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isSafeInteger(id)) throw new Error("Feedback id is missing");
  return id;
}

function asText(value: unknown): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : null;
}

function asIso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function asCount(value: unknown): number {
  const count = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(count) || count < 0) return 0;
  return count;
}

export function mapFeedbackRow(row: Record<string, unknown>): FeedbackMessage {
  const createdAt = asIso(row.created_at);
  if (!createdAt) throw new Error("Feedback time is missing");
  const message = asText(row.message);
  if (message == null) throw new Error("Feedback message is missing");
  return {
    id: asId(row.id),
    name: asText(row.name),
    email: asText(row.email),
    message,
    createdAt,
    readAt: asIso(row.read_at),
  };
}

function clampLimit(value: number | undefined) {
  if (value == null || !Number.isFinite(value)) return 50;
  return Math.min(2000, Math.max(1, Math.floor(value)));
}

function clampOffset(value: number | undefined) {
  if (value == null || !Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}
