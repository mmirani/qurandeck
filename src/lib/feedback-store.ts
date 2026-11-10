import { getSql } from "@/lib/db";

let ready: Promise<void> | null = null;

export function prepareFeedbackStore() {
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
    CREATE TABLE IF NOT EXISTS feedback (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name text,
      email text,
      message text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    INSERT INTO schema_migrations (id, status)
    VALUES ('feedback-v1', 'done')
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function saveFeedback(entry: { name: string | null; email: string | null; message: string }) {
  await prepareFeedbackStore();
  const sql = getSql();
  await sql`
    INSERT INTO feedback (name, email, message)
    VALUES (${entry.name}, ${entry.email}, ${entry.message})
  `;
}
