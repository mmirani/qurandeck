import { getSql } from "@/lib/db";

export type StoredPasskey = {
  credentialId: string;
  accountId: string;
  emailSealed: string;
  publicKey: string;
  counter: number;
  transports: string[];
};

export type StoredChallenge = {
  challenge: string;
  accountId: string | null;
  expiresAt: number;
};

export interface PasskeyStore {
  saveChallenge(id: string, challenge: StoredChallenge): Promise<void>;
  takeChallenge(id: string, now: number): Promise<StoredChallenge | null>;
  saveCredential(credential: StoredPasskey): Promise<void>;
  findCredential(credentialId: string): Promise<StoredPasskey | null>;
  listCredentials(accountId: string): Promise<StoredPasskey[]>;
  updateCounter(credentialId: string, counter: number): Promise<void>;
  deleteAccount(accountId: string): Promise<number>;
}

export class MemoryPasskeyStore implements PasskeyStore {
  private challenges = new Map<string, StoredChallenge>();
  private credentials = new Map<string, StoredPasskey>();

  async saveChallenge(id: string, challenge: StoredChallenge) {
    this.challenges.set(id, challenge);
  }

  async takeChallenge(id: string, now: number) {
    const row = this.challenges.get(id);
    this.challenges.delete(id);
    if (!row || now >= row.expiresAt) return null;
    return row;
  }

  async saveCredential(credential: StoredPasskey) {
    this.credentials.set(credential.credentialId, credential);
  }

  async findCredential(credentialId: string) {
    return this.credentials.get(credentialId) ?? null;
  }

  async listCredentials(accountId: string) {
    return [...this.credentials.values()].filter((item) => item.accountId === accountId);
  }

  async updateCounter(credentialId: string, counter: number) {
    const row = this.credentials.get(credentialId);
    if (row) row.counter = counter;
  }

  async deleteAccount(accountId: string) {
    let removed = 0;
    for (const [id, row] of this.credentials) {
      if (row.accountId === accountId) {
        this.credentials.delete(id);
        removed += 1;
      }
    }
    for (const [id, row] of this.challenges) {
      if (row.accountId === accountId) this.challenges.delete(id);
    }
    return removed;
  }
}

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

function rowsOf<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function createNeonPasskeyStore(sql: Sql): PasskeyStore {
  let ready: Promise<void> | null = null;
  const ensure = () => {
    ready ??= (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS passkey_credentials (
          credential_id text PRIMARY KEY,
          account_id text NOT NULL,
          email_sealed text NOT NULL,
          public_key text NOT NULL,
          counter bigint NOT NULL,
          transports text NOT NULL DEFAULT '',
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS passkey_credentials_account_idx
        ON passkey_credentials (account_id)
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS passkey_challenges (
          id text PRIMARY KEY,
          challenge text NOT NULL,
          account_id text,
          expires_at timestamptz NOT NULL
        )
      `;
    })().catch((error: unknown) => {
      ready = null;
      throw error;
    });
    return ready;
  };

  return {
    async saveChallenge(id, challenge) {
      await ensure();
      await sql`DELETE FROM passkey_challenges WHERE expires_at < now()`;
      await sql`
        INSERT INTO passkey_challenges (id, challenge, account_id, expires_at)
        VALUES (${id}, ${challenge.challenge}, ${challenge.accountId}, ${new Date(challenge.expiresAt).toISOString()}::timestamptz)
        ON CONFLICT (id) DO UPDATE
        SET challenge = EXCLUDED.challenge, account_id = EXCLUDED.account_id, expires_at = EXCLUDED.expires_at
      `;
    },
    async takeChallenge(id, now) {
      await ensure();
      const rows = rowsOf<{ challenge: string; account_id: string | null; expires_at: string | Date }>(
        await sql`
          DELETE FROM passkey_challenges
          WHERE id = ${id}
          RETURNING challenge, account_id, expires_at
        `,
      );
      const row = rows[0];
      if (!row) return null;
      const expiresAt = row.expires_at instanceof Date ? row.expires_at.getTime() : Date.parse(String(row.expires_at));
      if (!Number.isFinite(expiresAt) || now >= expiresAt) return null;
      return { challenge: row.challenge, accountId: row.account_id, expiresAt };
    },
    async saveCredential(credential) {
      await ensure();
      await sql`
        INSERT INTO passkey_credentials (credential_id, account_id, email_sealed, public_key, counter, transports)
        VALUES (
          ${credential.credentialId},
          ${credential.accountId},
          ${credential.emailSealed},
          ${credential.publicKey},
          ${credential.counter},
          ${credential.transports.join(",")}
        )
        ON CONFLICT (credential_id) DO NOTHING
      `;
    },
    async findCredential(credentialId) {
      await ensure();
      const rows = rowsOf<{
        credential_id: string;
        account_id: string;
        email_sealed: string;
        public_key: string;
        counter: number | string;
        transports: string;
      }>(
        await sql`
          SELECT credential_id, account_id, email_sealed, public_key, counter, transports
          FROM passkey_credentials
          WHERE credential_id = ${credentialId}
          LIMIT 1
        `,
      );
      const row = rows[0];
      if (!row) return null;
      return {
        credentialId: row.credential_id,
        accountId: row.account_id,
        emailSealed: row.email_sealed,
        publicKey: row.public_key,
        counter: Number(row.counter),
        transports: row.transports ? row.transports.split(",").filter(Boolean) : [],
      };
    },
    async listCredentials(accountId) {
      await ensure();
      const rows = rowsOf<{
        credential_id: string;
        account_id: string;
        email_sealed: string;
        public_key: string;
        counter: number | string;
        transports: string;
      }>(
        await sql`
          SELECT credential_id, account_id, email_sealed, public_key, counter, transports
          FROM passkey_credentials
          WHERE account_id = ${accountId}
        `,
      );
      return rows.map((row) => ({
        credentialId: row.credential_id,
        accountId: row.account_id,
        emailSealed: row.email_sealed,
        publicKey: row.public_key,
        counter: Number(row.counter),
        transports: row.transports ? row.transports.split(",").filter(Boolean) : [],
      }));
    },
    async updateCounter(credentialId, counter) {
      await ensure();
      await sql`UPDATE passkey_credentials SET counter = ${counter} WHERE credential_id = ${credentialId}`;
    },
    async deleteAccount(accountId) {
      await ensure();
      const rows = rowsOf<{ credential_id: string }>(
        await sql`DELETE FROM passkey_credentials WHERE account_id = ${accountId} RETURNING credential_id`,
      );
      await sql`DELETE FROM passkey_challenges WHERE account_id = ${accountId}`;
      return rows.length;
    },
  };
}

type PasskeyGlobals = typeof globalThis & { __qurandeckPasskeys?: PasskeyStore };

export function getPasskeyStore(): PasskeyStore | null {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV) {
    if (!process.env.DATABASE_URL) return null;
  }
  const globals = globalThis as PasskeyGlobals;
  if (!globals.__qurandeckPasskeys) {
    globals.__qurandeckPasskeys = process.env.DATABASE_URL
      ? createNeonPasskeyStore(getSql() as unknown as Sql)
      : new MemoryPasskeyStore();
  }
  return globals.__qurandeckPasskeys;
}
