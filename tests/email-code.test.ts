import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMAIL_CODE_LIMIT,
  EMAIL_CODE_TTL_MS,
  issueEmailCode,
  MemoryEmailCodeStore,
  verifyEmailCode,
  type IssueEmailCodeBody,
} from "../src/lib/email-code";
import { verifyMagicToken } from "../src/lib/magic-link";
import { MemoryMagicLinkStore } from "../src/lib/magic-link-store";
import { MemoryRateLimiter } from "../src/lib/rate-limit";

const SECRET = "test-secret-test-secret";
const NOW = 1_700_000_000_000;

function harness(overrides: Partial<Parameters<typeof issueEmailCode>[0]> = {}) {
  const sent: { to: string; code: string }[] = [];
  const store = overrides.store ?? new MemoryEmailCodeStore();
  const limiter = overrides.limiter ?? new MemoryRateLimiter();
  const input: Parameters<typeof issueEmailCode>[0] = {
    email: "reader@example.com",
    ip: "203.0.113.8",
    allowed: true,
    secret: SECRET,
    hosted: true,
    hasEmailProvider: true,
    durableTokens: true,
    limiter,
    store,
    sendEmail: async (to, code) => {
      sent.push({ to, code });
      return true;
    },
    now: NOW,
    random: () => 123456,
    ...overrides,
  };
  return { input, sent, store, limiter };
}

function assertNoCode(body: IssueEmailCodeBody, code?: string) {
  assert.equal("devCode" in body, false);
  const packed = JSON.stringify(body);
  assert.equal(packed.includes("123456"), false);
  if (code) assert.equal(packed.includes(code), false);
}

describe("email sign-in codes", () => {
  it("does not return the code in production when mail succeeds", async () => {
    const { input, sent } = harness();
    const issued = await issueEmailCode(input);
    assert.equal(issued.status, 200);
    assert.deepEqual(issued.body, { ok: true, emailed: true });
    assertNoCode(issued.body, sent[0]?.code);
    assert.equal(sent[0]?.code, "123456");
    assert.equal(sent[0]?.to, "reader@example.com");
  });

  it("fails closed in production without a mail provider", async () => {
    let called = false;
    const issued = await issueEmailCode(
      harness({
        hasEmailProvider: false,
        sendEmail: async () => {
          called = true;
          return true;
        },
      }).input,
    );
    assert.equal(issued.status, 503);
    assert.equal(called, false);
    assertNoCode(issued.body);
  });

  it("shows a code only for local development without a provider", async () => {
    const { input, store } = harness({ hosted: false, hasEmailProvider: false });
    const issued = await issueEmailCode(input);
    assert.equal(issued.body.devCode, "123456");
    const verified = await verifyEmailCode({
      email: "reader@example.com",
      code: "123456",
      secret: SECRET,
      store,
      now: NOW,
    });
    assert.equal(verified.status, 200);
    assert.ok(verified.body.token);
    const session = new MemoryMagicLinkStore();
    assert.equal(await verifyMagicToken(verified.body.token, SECRET, session, NOW), "reader@example.com");
    assert.equal(await verifyMagicToken(verified.body.token, SECRET, session, NOW), null);
  });

  it("accepts a code once and rejects it after expiry or a wrong guess limit", async () => {
    const store = new MemoryEmailCodeStore();
    await issueEmailCode(harness({ store, hosted: false, hasEmailProvider: false }).input);
    assert.equal((await verifyEmailCode({ email: "reader@example.com", code: "000000", secret: SECRET, store, now: NOW })).status, 401);
    const ok = await verifyEmailCode({ email: "reader@example.com", code: "123456", secret: SECRET, store, now: NOW });
    assert.equal(ok.status, 200);
    const again = await verifyEmailCode({ email: "reader@example.com", code: "123456", secret: SECRET, store, now: NOW });
    assert.equal(again.status, 401);
    assert.equal(again.body.token, undefined);

    await issueEmailCode(harness({ store, hosted: false, hasEmailProvider: false, now: NOW }).input);
    const expired = await verifyEmailCode({
      email: "reader@example.com",
      code: "123456",
      secret: SECRET,
      store,
      now: NOW + EMAIL_CODE_TTL_MS,
    });
    assert.equal(expired.status, 401);
    assert.equal(expired.body.token, undefined);
  });

  it("rate limits code requests per email", async () => {
    const limiter = new MemoryRateLimiter();
    for (let i = 0; i < EMAIL_CODE_LIMIT; i += 1) {
      const issued = await issueEmailCode(harness({ limiter, now: NOW + i }).input);
      assert.equal(issued.status, 200);
      assertNoCode(issued.body);
    }
    const blocked = await issueEmailCode(
      harness({
        limiter,
        now: NOW + EMAIL_CODE_LIMIT,
        sendEmail: async () => {
          throw new Error("should not send");
        },
      }).input,
    );
    assert.equal(blocked.status, 429);
    assertNoCode(blocked.body);
  });
});
