import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emailDeliveryMode,
  hasEmailProvider,
  issueMagicLink,
  MAGIC_LINK_EMAIL_LIMIT,
  MAGIC_LINK_IP_LIMIT,
  type IssueMagicLinkBody,
  type IssueMagicLinkInput,
} from "../src/lib/email-sign-in";
import { createMagicToken, MAGIC_LINK_TTL_MS, verifyMagicToken } from "../src/lib/magic-link";
import { MemoryMagicLinkStore } from "../src/lib/magic-link-store";
import { MemoryRateLimiter } from "../src/lib/rate-limit";
import { safeEqual } from "../src/lib/safe-equal";

const SECRET = "test-secret-test-secret";
const NOW = 1_700_000_000_000;

function harness(overrides: Partial<IssueMagicLinkInput> = {}) {
  const sent: { to: string; url: string }[] = [];
  const store = new MemoryMagicLinkStore();
  const limiter = overrides.limiter ?? new MemoryRateLimiter();
  const input: IssueMagicLinkInput = {
    email: "reader@example.com",
    ip: "203.0.113.10",
    allowed: true,
    secret: SECRET,
    hosted: true,
    hasEmailProvider: true,
    durableTokens: true,
    limiter,
    sendEmail: async (to, url) => {
      sent.push({ to, url });
      return true;
    },
    now: NOW,
    baseUrl: "https://qurandeck.vercel.app",
    ...overrides,
  };
  return { input, sent, store, limiter };
}

function assertNoLink(body: IssueMagicLinkBody, sentUrl?: string) {
  assert.equal("url" in body, false);
  assert.equal(body.url, undefined);
  const packed = JSON.stringify(body);
  assert.equal(packed.includes("/auth/magic"), false);
  assert.equal(packed.includes("token="), false);
  if (sentUrl) assert.equal(packed.includes(sentUrl), false);
}

describe("email sign-in delivery", () => {
  it("does not return the link in production when mail succeeds", async () => {
    const { input, sent } = harness();
    const issued = await issueMagicLink(input);
    assert.equal(issued.status, 200);
    assert.deepEqual(issued.body, { ok: true, emailed: true });
    assertNoLink(issued.body, sent[0]?.url);
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.to, "reader@example.com");
    assert.match(sent[0]?.url ?? "", /^https:\/\/qurandeck\.vercel\.app\/auth\/magic\?token=/);
  });

  it("fails closed in production when no mail provider is configured", async () => {
    let called = false;
    const { input } = harness({
      hasEmailProvider: false,
      sendEmail: async () => {
        called = true;
        return true;
      },
    });
    const issued = await issueMagicLink(input);
    assert.equal(issued.status, 503);
    assert.equal(issued.body.ok, false);
    assert.match(issued.body.error ?? "", /unavailable/i);
    assert.equal(called, false);
    assertNoLink(issued.body);
  });

  it("fails closed on a hosted deploy that cannot record used tokens", async () => {
    let called = false;
    const { input } = harness({
      durableTokens: false,
      sendEmail: async () => {
        called = true;
        return true;
      },
    });
    const issued = await issueMagicLink(input);
    assert.equal(issued.status, 503);
    assert.equal(called, false);
    assertNoLink(issued.body);
  });

  it("fails closed when the provider is configured but sending fails", async () => {
    const { input, sent } = harness({
      sendEmail: async (to, url) => {
        sent.push({ to, url });
        return false;
      },
    });
    const issued = await issueMagicLink(input);
    assert.equal(issued.status, 502);
    assert.equal(issued.body.ok, false);
    assertNoLink(issued.body, sent[0]?.url);
  });

  it("fails closed on a hosted preview even if NODE_ENV would be development", () => {
    const env = { NODE_ENV: "development", VERCEL_ENV: "preview", AUTH_RESEND_KEY: "" };
    assert.equal(hasEmailProvider(env), false);
    assert.equal(emailDeliveryMode(env), "unavailable");
  });

  it("shows a link only for local development without a provider", async () => {
    const { input, store } = harness({ hosted: false, hasEmailProvider: false });
    const issued = await issueMagicLink(input);
    assert.equal(issued.status, 200);
    assert.equal(issued.body.emailed, false);
    assert.match(issued.body.url ?? "", /^https:\/\/qurandeck\.vercel\.app\/auth\/magic\?token=/);
    const token = new URL(issued.body.url ?? "").searchParams.get("token");
    assert.ok(token);
    assert.equal(await verifyMagicToken(token, SECRET, store, NOW), "reader@example.com");
    assert.equal(await verifyMagicToken(token, SECRET, store, NOW), null);
  });

  it("does not show a link locally once a provider is configured", async () => {
    const { input, sent } = harness({ hosted: false, hasEmailProvider: true });
    const issued = await issueMagicLink(input);
    assert.equal(issued.body.emailed, true);
    assertNoLink(issued.body, sent[0]?.url);
  });

  it("requires a verified sender before treating hosted mail as configured", () => {
    assert.equal(hasEmailProvider({ NODE_ENV: "production", AUTH_RESEND_KEY: "re_test" }), false);
    assert.equal(
      hasEmailProvider({
        NODE_ENV: "production",
        AUTH_RESEND_KEY: "re_test",
        AUTH_EMAIL_FROM: "QuranDeck <sign-in@example.com>",
      }),
      true,
    );
    assert.equal(emailDeliveryMode({ NODE_ENV: "development" }), "dev-link");
    assert.equal(
      emailDeliveryMode({ NODE_ENV: "production", AUTH_RESEND_KEY: "re_test", AUTH_EMAIL_FROM: "QuranDeck <a@b.co>" }),
      "resend",
    );
  });
});

describe("magic link tokens", () => {
  it("expires and is single-use", async () => {
    const store = new MemoryMagicLinkStore();
    const token = createMagicToken("reader@example.com", SECRET, NOW);
    assert.equal(await verifyMagicToken(token, SECRET, store, NOW + MAGIC_LINK_TTL_MS - 1), "reader@example.com");
    assert.equal(await verifyMagicToken(token, SECRET, store, NOW + MAGIC_LINK_TTL_MS - 1), null);

    const expired = createMagicToken("reader@example.com", SECRET, NOW);
    assert.equal(await verifyMagicToken(expired, SECRET, store, NOW + MAGIC_LINK_TTL_MS), null);

    const sibling = createMagicToken("reader@example.com", SECRET, NOW);
    assert.equal(await verifyMagicToken(sibling, SECRET, new MemoryMagicLinkStore(), NOW), "reader@example.com");
  });

  it("rejects a tampered token without consuming another", async () => {
    const store = new MemoryMagicLinkStore();
    const token = createMagicToken("reader@example.com", SECRET, NOW);
    const dot = token.lastIndexOf(".");
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const flipped = `${sig[0] === "a" ? "b" : "a"}${sig.slice(1)}`;
    const tampered = `${payload}.${flipped}`;
    assert.equal(await verifyMagicToken(tampered, SECRET, store, NOW), null);
    assert.equal(await verifyMagicToken(token, "other-secret-other-secret", store, NOW), null);
    assert.equal(await verifyMagicToken(token, SECRET, store, NOW), "reader@example.com");
  });
});

describe("magic link rate limit", () => {
  it("limits requests per email", async () => {
    const limiter = new MemoryRateLimiter();
    const sent: string[] = [];
    for (let i = 0; i < MAGIC_LINK_EMAIL_LIMIT; i += 1) {
      const issued = await issueMagicLink({
        ...harness({ limiter, now: NOW + i }).input,
        sendEmail: async (_to, url) => {
          sent.push(url);
          return true;
        },
      });
      assert.equal(issued.status, 200);
      assertNoLink(issued.body, sent.at(-1));
    }
    const blocked = await issueMagicLink({
      ...harness({ limiter, now: NOW + MAGIC_LINK_EMAIL_LIMIT }).input,
      sendEmail: async () => {
        throw new Error("should not send");
      },
    });
    assert.equal(blocked.status, 429);
    assert.ok((blocked.retryAfterSec ?? 0) > 0);
    assertNoLink(blocked.body);
    assert.equal(sent.length, MAGIC_LINK_EMAIL_LIMIT);
  });

  it("limits requests per IP across emails", async () => {
    const limiter = new MemoryRateLimiter();
    for (let i = 0; i < MAGIC_LINK_IP_LIMIT; i += 1) {
      const issued = await issueMagicLink(harness({
        limiter,
        email: `reader${i}@example.com`,
        now: NOW + i,
      }).input);
      assert.equal(issued.status, 200);
    }
    const blocked = await issueMagicLink(harness({
      limiter,
      email: "overflow@example.com",
      now: NOW + MAGIC_LINK_IP_LIMIT,
    }).input);
    assert.equal(blocked.status, 429);
    assertNoLink(blocked.body);
  });
});

describe("invite code comparison", () => {
  it("matches equal codes and rejects different lengths", () => {
    assert.equal(safeEqual("beta-invite", "beta-invite"), true);
    assert.equal(safeEqual("beta-invite", "beta-invit3"), false);
    assert.equal(safeEqual("beta-invite", "beta-invite-long"), false);
    assert.equal(safeEqual("", "beta-invite"), false);
  });
});
