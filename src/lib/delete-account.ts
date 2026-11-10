import { createHash } from "node:crypto";
import { accountId } from "@/lib/library-seal";

export function accountDeletionKeys(email: string) {
  const normalized = email.trim().toLowerCase();
  return {
    accountId: accountId(normalized),
    emailHash: createHash("sha256").update(`qurandeck-email:${normalized}`).digest("hex"),
  };
}

export type AccountDeletionResult = {
  libraries: number;
  passkeys: number;
  challenges: number;
  codes: number;
};

export async function deleteStoredAccount(
  store: {
    remove(table: string, column: string, value: string): Promise<number>;
  },
  email: string,
): Promise<AccountDeletionResult & { keys: ReturnType<typeof accountDeletionKeys> }> {
  const keys = accountDeletionKeys(email);
  const [libraries, passkeys, challenges, codes] = await Promise.all([
    store.remove("libraries", "account_id", keys.accountId),
    store.remove("passkey_credentials", "account_id", keys.accountId),
    store.remove("passkey_challenges", "account_id", keys.accountId),
    store.remove("email_signin_codes", "email_hash", keys.emailHash),
  ]);
  return { libraries, passkeys, challenges, codes, keys };
}
