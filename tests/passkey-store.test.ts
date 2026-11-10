import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MemoryPasskeyStore } from "../src/lib/passkey-store";

describe("passkey challenges", () => {
  it("consumes a challenge once and drops an expired one", async () => {
    const store = new MemoryPasskeyStore();
    const now = 1_700_000_000_000;
    await store.saveChallenge("fresh", { challenge: "abc", accountId: "acct", expiresAt: now + 1_000 });
    assert.equal((await store.takeChallenge("fresh", now))?.challenge, "abc");
    assert.equal(await store.takeChallenge("fresh", now), null);

    await store.saveChallenge("old", { challenge: "gone", accountId: null, expiresAt: now });
    assert.equal(await store.takeChallenge("old", now), null);
  });

  it("removes credentials for an account", async () => {
    const store = new MemoryPasskeyStore();
    await store.saveCredential({
      credentialId: "cred",
      accountId: "acct",
      emailSealed: "sealed",
      publicKey: "pk",
      counter: 1,
      transports: ["internal"],
    });
    await store.saveChallenge("pending", { challenge: "abc", accountId: "acct", expiresAt: Date.now() + 1_000 });
    assert.equal(await store.deleteAccount("acct"), 1);
    assert.equal(await store.findCredential("cred"), null);
    assert.equal(await store.takeChallenge("pending", Date.now()), null);
  });
});
