import { getSql } from "@/lib/db";
import { accountDeletionKeys } from "@/lib/delete-account";
import { MemoryEmailCodeStore, type EmailCodeRecord, type EmailCodeStore } from "@/lib/email-code";

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

function rowsOf<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function createNeonEmailCodeStore(sql: Sql): EmailCodeStore {
  let ready: Promise<void> | null = null;
  const ensure = () => {
    ready ??= sql`
      CREATE TABLE IF NOT EXISTS email_signin_codes (
        email_hash text PRIMARY KEY,
        code_hash text NOT NULL,
        expires_at timestamptz NOT NULL,
        attempts integer NOT NULL DEFAULT 0
      )
    `
      .then(() => undefined)
      .catch((error: unknown) => {
        ready = null;
        throw error;
      });
    return ready;
  };

  return {
    async save(record: EmailCodeRecord) {
      await ensure();
      const emailHash = accountDeletionKeys(record.email).emailHash;
      await sql`
        INSERT INTO email_signin_codes (email_hash, code_hash, expires_at, attempts)
        VALUES (${emailHash}, ${record.codeHash}, ${new Date(record.expiresAt).toISOString()}::timestamptz, 0)
        ON CONFLICT (email_hash) DO UPDATE
        SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0
      `;
    },
    async take(email, codeHash, now, maxAttempts) {
      await ensure();
      const emailHash = accountDeletionKeys(email).emailHash;
      const rows = rowsOf<{ code_hash: string; expires_at: string | Date; attempts: number }>(
        await sql`
          SELECT code_hash, expires_at, attempts
          FROM email_signin_codes
          WHERE email_hash = ${emailHash}
          LIMIT 1
        `,
      );
      const memory = new MemoryEmailCodeStore();
      const row = rows[0];
      if (row) {
        const expiresAt = row.expires_at instanceof Date ? row.expires_at.getTime() : Date.parse(String(row.expires_at));
        await memory.save({
          email,
          codeHash: row.code_hash,
          expiresAt,
          attempts: Number(row.attempts),
        });
      }
      const outcome = await memory.take(email, codeHash, now, maxAttempts);
      if (outcome === "ok" || outcome === "expired" || outcome === "locked") {
        await sql`DELETE FROM email_signin_codes WHERE email_hash = ${emailHash}`;
      } else if (outcome === "mismatch" && row) {
        await sql`
          UPDATE email_signin_codes
          SET attempts = attempts + 1
          WHERE email_hash = ${emailHash}
        `;
      }
      return outcome;
    },
    async deleteHash(emailHash: string) {
      await ensure();
      const rows = rowsOf<{ email_hash: string }>(
        await sql`DELETE FROM email_signin_codes WHERE email_hash = ${emailHash} RETURNING email_hash`,
      );
      return rows.length;
    },
  };
}

type CodeGlobals = typeof globalThis & { __qurandeckEmailCodes?: EmailCodeStore };

export function getEmailCodeStore(): EmailCodeStore | null {
  if ((process.env.NODE_ENV === "production" || process.env.VERCEL_ENV) && !process.env.DATABASE_URL) return null;
  const globals = globalThis as CodeGlobals;
  if (!globals.__qurandeckEmailCodes) {
    globals.__qurandeckEmailCodes = process.env.DATABASE_URL
      ? createNeonEmailCodeStore(getSql() as unknown as Sql)
      : new MemoryEmailCodeStore();
  }
  return globals.__qurandeckEmailCodes;
}
