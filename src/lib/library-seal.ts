import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "crypto";
import { getSql } from "@/lib/db";
import { normalizeLibrary, type LibrarySnapshot } from "@/lib/library";

function sealKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) throw new Error("AUTH_SECRET is not set");
  return createHash("sha256").update(`qurandeck-library-v1:${secret}`).digest();
}

export function accountId(email: string) {
  return createHmac("sha256", sealKey()).update(email.trim().toLowerCase()).digest("hex");
}

export function sealLibrary(library: LibrarySnapshot) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sealKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(library), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function openLibrary(sealed: string) {
  const buf = Buffer.from(sealed, "base64");
  if (buf.length < 29) throw new Error("Sealed library is incomplete");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", sealKey(), iv);
  decipher.setAuthTag(tag);
  const json = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return JSON.parse(json) as unknown;
}

async function columnNames(table: string) {
  const sql = getSql();
  const rows = (await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
  `) as { column_name: string }[];
  return rows.map((row) => row.column_name);
}

function timestamp(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) return value;
  return new Date().toISOString();
}

async function migrateLegacy() {
  const sql = getSql();
  const rows = (await sql`SELECT email, data, updated_at FROM libraries_legacy`) as {
    email?: string;
    data?: unknown;
    updated_at?: unknown;
  }[];
  let migrated = 0;
  for (const row of rows) {
    const key = String(row.email ?? "").trim().toLowerCase();
    const library = normalizeLibrary(row.data);
    if (!key || !library) continue;
    await sql`
      INSERT INTO libraries (account_id, sealed, updated_at)
      VALUES (${accountId(key)}, ${sealLibrary(library)}, ${timestamp(row.updated_at)}::timestamptz)
      ON CONFLICT (account_id) DO NOTHING
    `;
    migrated += 1;
  }
  const archived = await columnNames("libraries_legacy_archive");
  if (archived.length === 0) {
    await sql`ALTER TABLE libraries_legacy RENAME TO libraries_legacy_archive`;
  }
  return migrated;
}

async function createSealedLibraries() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS libraries (
      account_id text PRIMARY KEY,
      sealed text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}

const MIGRATION_ID = "libraries-sealed-v1";
let ready: Promise<{ migrated: number }> | null = null;

export function prepareLibraryStore() {
  ready ??= runLibraryMigration().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

async function runLibraryMigration() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      status text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  const rows = (await sql`
    SELECT status FROM schema_migrations WHERE id = ${MIGRATION_ID}
  `) as { status?: string }[];
  if (rows[0]?.status === "done") return { migrated: 0 };

  const claimed = (await sql`
    INSERT INTO schema_migrations (id, status)
    VALUES (${MIGRATION_ID}, 'running')
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `) as { id?: string }[];

  if (claimed.length === 0) {
    await sql`
      DELETE FROM schema_migrations
      WHERE id = ${MIGRATION_ID}
        AND status = 'running'
        AND applied_at < now() - interval '2 minutes'
    `;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const current = (await sql`
        SELECT status FROM schema_migrations WHERE id = ${MIGRATION_ID}
      `) as { status?: string }[];
      if (current[0]?.status === "done") return { migrated: 0 };
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    throw new Error("Library migration is still running");
  }

  try {
    const existing = await columnNames("libraries");
    if (existing.includes("email") && !existing.includes("sealed")) {
      await sql`ALTER TABLE libraries RENAME TO libraries_legacy`;
    }
    await createSealedLibraries();
    const legacy = await columnNames("libraries_legacy");
    const migrated = legacy.includes("email") ? await migrateLegacy() : 0;
    await sql`
      UPDATE schema_migrations
      SET status = 'done', applied_at = now()
      WHERE id = ${MIGRATION_ID}
    `;
    return { migrated };
  } catch (error) {
    await sql`DELETE FROM schema_migrations WHERE id = ${MIGRATION_ID} AND status = 'running'`;
    throw error;
  }
}
