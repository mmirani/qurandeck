import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accountDeletionKeys, deleteStoredAccount } from "../src/lib/delete-account";

describe("account deletion", () => {
  it("deletes library, passkey, and email-code rows without sending the raw email", async () => {
    process.env.AUTH_SECRET = "test-secret-test-secret";
    const email = "Reader.Example@QuranDeck.test";
    const calls: { table: string; column: string; value: string }[] = [];
    const removed = await deleteStoredAccount(
      {
        async remove(table, column, value) {
          calls.push({ table, column, value });
          return table === "libraries" ? 1 : 0;
        },
      },
      email,
    );

    assert.equal(removed.libraries, 1);
    assert.equal(calls.length, 4);
    const keys = accountDeletionKeys(email);
    assert.equal(keys.accountId, accountDeletionKeys("reader.example@qurandeck.test").accountId);
    for (const call of calls) {
      assert.equal(call.value.includes("Reader"), false);
      assert.equal(call.value.includes("@"), false);
      assert.equal(call.value, call.column === "email_hash" ? keys.emailHash : keys.accountId);
    }
    assert.deepEqual(
      calls.map((call) => call.table),
      ["libraries", "passkey_credentials", "passkey_challenges", "email_signin_codes"],
    );
  });
});
