import { getSql } from "@/lib/db";

export type AccountColumn = { table_name: string; column_name: string };

/**
 * Allowlisted lookups. Only these table and column names are ever queried.
 * NextAuth JWT sessions on QuranDeck do not create a users row; this returns
 * a date only when a users or accounts table already has one.
 */
export type AccountCreatedKind =
  | "users_created_at"
  | "users_createdAt"
  | "User_created_at"
  | "User_createdAt"
  | "accounts_created_at"
  | "accounts_createdAt";

const PLANS: { kind: AccountCreatedKind; table: string; time: string }[] = [
  { kind: "users_created_at", table: "users", time: "created_at" },
  { kind: "users_createdAt", table: "users", time: "createdAt" },
  { kind: "User_created_at", table: "User", time: "created_at" },
  { kind: "User_createdAt", table: "User", time: "createdAt" },
  { kind: "accounts_created_at", table: "accounts", time: "created_at" },
  { kind: "accounts_createdAt", table: "accounts", time: "createdAt" },
];

export function accountCreatedKinds(columns: AccountColumn[]): AccountCreatedKind[] {
  const present = new Set(columns.map((column) => `${column.table_name}.${column.column_name}`));
  return PLANS.filter((plan) => present.has(`${plan.table}.email`) && present.has(`${plan.table}.${plan.time}`)).map(
    (plan) => plan.kind,
  );
}

function asIso(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "string" && value && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  return null;
}

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

async function readKind(sql: Sql, kind: AccountCreatedKind, email: string) {
  let rows: { created?: unknown }[] = [];
  if (kind === "users_created_at") {
    rows = (await sql`SELECT created_at AS created FROM users WHERE lower(email) = ${email} ORDER BY created_at ASC LIMIT 1`) as {
      created?: unknown;
    }[];
  } else if (kind === "users_createdAt") {
    rows = (await sql`SELECT "createdAt" AS created FROM users WHERE lower(email) = ${email} ORDER BY "createdAt" ASC LIMIT 1`) as {
      created?: unknown;
    }[];
  } else if (kind === "User_created_at") {
    rows = (await sql`SELECT created_at AS created FROM "User" WHERE lower(email) = ${email} ORDER BY created_at ASC LIMIT 1`) as {
      created?: unknown;
    }[];
  } else if (kind === "User_createdAt") {
    rows = (await sql`SELECT "createdAt" AS created FROM "User" WHERE lower(email) = ${email} ORDER BY "createdAt" ASC LIMIT 1`) as {
      created?: unknown;
    }[];
  } else if (kind === "accounts_created_at") {
    rows = (await sql`SELECT created_at AS created FROM accounts WHERE lower(email) = ${email} ORDER BY created_at ASC LIMIT 1`) as {
      created?: unknown;
    }[];
  } else {
    rows = (await sql`SELECT "createdAt" AS created FROM accounts WHERE lower(email) = ${email} ORDER BY "createdAt" ASC LIMIT 1`) as {
      created?: unknown;
    }[];
  }
  return asIso(rows[0]?.created);
}

export async function lookupAccountCreatedAt(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const sql = getSql() as unknown as Sql;
  const columns = (await sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('users', 'User', 'accounts')
  `) as AccountColumn[];
  const kinds = accountCreatedKinds(columns);
  let earliest: string | null = null;
  for (const kind of kinds) {
    try {
      const iso = await readKind(sql, kind, normalized);
      if (!iso) continue;
      if (!earliest || iso < earliest) earliest = iso;
    } catch {
      // A listed column can still be unreadable. Try the next allowlisted shape.
    }
  }
  return earliest;
}
