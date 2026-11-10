import { getSql } from "@/lib/db";

export type MagicLinkClaim = {
  jti: string;
  expiresAt: number;
};

export interface MagicLinkStore {
  /** Returns true the first time this jti is seen, and false once it has been consumed. */
  consume(claim: MagicLinkClaim): Promise<boolean>;
}

export class MemoryMagicLinkStore implements MagicLinkStore {
  private used = new Set<string>();

  async consume(claim: MagicLinkClaim) {
    if (this.used.has(claim.jti)) return false;
    this.used.add(claim.jti);
    return true;
  }
}

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

export function createNeonMagicLinkStore(sql: Sql): MagicLinkStore {
  let ready: Promise<void> | null = null;

  const ensure = () => {
    ready ??= (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS magic_link_tokens (
          jti text PRIMARY KEY,
          expires_at timestamptz NOT NULL
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS magic_link_tokens_expires_at_idx
        ON magic_link_tokens (expires_at)
      `;
    })().catch((error: unknown) => {
      ready = null;
      throw error;
    });
    return ready;
  };

  return {
    async consume({ jti, expiresAt }) {
      await ensure();
      await sql`DELETE FROM magic_link_tokens WHERE expires_at < now()`;
      const rows = (await sql`
        INSERT INTO magic_link_tokens (jti, expires_at)
        VALUES (${jti}, ${new Date(expiresAt).toISOString()}::timestamptz)
        ON CONFLICT (jti) DO NOTHING
        RETURNING jti
      `) as { jti: string }[];
      return rows.length > 0;
    },
  };
}

type AuthGlobals = typeof globalThis & {
  __qurandeckMagicLinkStore?: MagicLinkStore;
};

let warnedMissingDatabase = false;

export function getMagicLinkStore(): MagicLinkStore {
  const globals = globalThis as AuthGlobals;
  if (globals.__qurandeckMagicLinkStore) return globals.__qurandeckMagicLinkStore;

  let store: MagicLinkStore;
  if (process.env.DATABASE_URL) {
    store = createNeonMagicLinkStore(getSql() as unknown as Sql);
  } else if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV) {
    store = {
      async consume() {
        if (!warnedMissingDatabase) {
          warnedMissingDatabase = true;
          console.error("DATABASE_URL is not set; refusing magic-link sign-in.");
        }
        return false;
      },
    };
  } else {
    store = new MemoryMagicLinkStore();
  }

  globals.__qurandeckMagicLinkStore = store;
  return store;
}
