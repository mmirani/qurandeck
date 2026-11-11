import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accountId } from "../src/lib/library-seal";
import { MemoryRateLimiter, rateLimitKey } from "../src/lib/rate-limit";
import {
  DELETE_DEDUPE_MS,
  GUEST_EVENT_LIMIT,
  MERGE_EVENT_LIMIT,
  SIGN_IN_DEDUPE_MS,
  USAGE_RETENTION_MONTHS,
  acceptUsagePost,
  accountUsageSubject,
  assembleUsageStats,
  assertUsageInsert,
  createMemoryUsageStore,
  guestUsageSubject,
  isAdminEmail,
  isDuplicateUsage,
  mergeUsageSubject,
  parseUsageRequest,
  recordAccountDeleted,
  recordAuthEvents,
  signInMethod,
  usageChartDays,
  usageSubject,
  type UsageInserter,
} from "../src/lib/usage";

const SECRET = "test-secret-test-secret";
const ANON = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

describe("admin gate", () => {
  const allow = "  Owner@Example.com , second@example.com, ";

  it("allows only the listed emails, ignoring case and spaces", () => {
    assert.equal(isAdminEmail("owner@example.com", allow), true);
    assert.equal(isAdminEmail("OWNER@EXAMPLE.COM", allow), true);
    assert.equal(isAdminEmail("  second@example.com ", allow), true);
  });

  it("hides the page from everyone else, including a partial lookalike", () => {
    assert.equal(isAdminEmail("owner@example.com.evil", allow), false);
    assert.equal(isAdminEmail("second@example.co", allow), false);
    assert.equal(isAdminEmail("not-listed@example.com", allow), false);
    assert.equal(isAdminEmail("", allow), false);
    assert.equal(isAdminEmail(null, allow), false);
    assert.equal(isAdminEmail(undefined, allow), false);
    assert.equal(isAdminEmail("owner@example.com", ""), false);
    assert.equal(isAdminEmail("owner@example.com", ",,,"), false);
  });
});

describe("usage events", () => {
  it("hashes accounts without keeping the email, and not with the library key", () => {
    process.env.AUTH_SECRET = SECRET;
    const email = "Reader.Example@QuranDeck.test";
    const hash = accountUsageSubject(email, SECRET);
    assert.equal(hash, accountUsageSubject("reader.example@qurandeck.test", SECRET));
    assert.equal(hash.includes("@"), false);
    assert.equal(hash.includes("reader"), false);
    assert.equal(hash.length, 64);
    assert.notEqual(hash, accountId(email));
    assert.notEqual(guestUsageSubject(ANON, SECRET), hash);
    assert.throws(() => usageSubject("account:reader@example.com", "short"));
  });

  it("records sign-up once, sign-in by method, and deletion with a short dedupe", async () => {
    let now = new Date("2026-11-11T12:00:00Z");
    const store = createMemoryUsageStore([], () => now);
    const first = await recordAuthEvents(store, "reader@example.com", "magic-link", SECRET);
    assert.equal(first.recorded, true);
    if (!first.recorded) return;
    assert.equal(first.signUp, "inserted");
    assert.equal(first.signIn, "inserted");
    assert.equal(store.events[0]?.method, "email_code");
    assert.equal(store.events[0]?.subjectHash.includes("@"), false);

    const again = await recordAuthEvents(store, "reader@example.com", "google", SECRET);
    assert.equal(again.recorded, true);
    if (!again.recorded) return;
    assert.equal(again.signUp, "duplicate");
    assert.equal(again.signIn, "inserted");

    now = new Date(now.getTime() + 30_000);
    const burst = await recordAuthEvents(store, "reader@example.com", "google", SECRET);
    assert.equal(burst.recorded, true);
    if (!burst.recorded) return;
    assert.equal(burst.signIn, "duplicate");

    now = new Date(now.getTime() + SIGN_IN_DEDUPE_MS);
    const later = await recordAuthEvents(store, "reader@example.com", "google", SECRET);
    assert.equal(later.recorded, true);
    if (!later.recorded) return;
    assert.equal(later.signIn, "inserted");

    const skipped = await recordAuthEvents(store, "reader@example.com", "credentials", SECRET);
    assert.equal(skipped.recorded, false);

    const deleted = await recordAccountDeleted(store, "reader@example.com", SECRET);
    assert.equal(deleted.result, "inserted");
    now = new Date(now.getTime() + 10_000);
    assert.equal((await recordAccountDeleted(store, "reader@example.com", SECRET)).result, "duplicate");
    now = new Date(now.getTime() + DELETE_DEDUPE_MS);
    assert.equal((await recordAccountDeleted(store, "reader@example.com", SECRET)).result, "inserted");
    assert.equal(USAGE_RETENTION_MONTHS, 13);
  });

  it("treats a repeated guest or merge as one event", () => {
    const now = new Date("2026-11-11T12:00:00Z");
    const guest = guestUsageSubject(ANON, SECRET);
    const merge = mergeUsageSubject("reader@example.com", ANON, SECRET);
    const existing = [
      { eventType: "guest_started" as const, method: null, subjectHash: guest, createdAt: now },
      { eventType: "guest_merge" as const, method: null, subjectHash: merge, createdAt: now },
    ];
    assert.equal(
      isDuplicateUsage(existing, { eventType: "guest_started", method: null, subjectHash: guest }, now),
      true,
    );
    assert.equal(
      isDuplicateUsage(existing, { eventType: "guest_merge", method: null, subjectHash: merge }, now),
      true,
    );
    assert.equal(
      isDuplicateUsage(
        existing,
        { eventType: "guest_merge", method: null, subjectHash: mergeUsageSubject("other@example.com", ANON, SECRET) },
        now,
      ),
      false,
    );
  });

  it("refuses to store an email or a sign-in with no method", () => {
    assert.throws(() =>
      assertUsageInsert({ eventType: "guest_started", method: null, subjectHash: "reader@example.com" }),
    );
    assert.throws(() =>
      assertUsageInsert({ eventType: "sign_in", method: null, subjectHash: "ab".repeat(32) }),
    );
    assertUsageInsert({ eventType: "sign_in", method: "email_code", subjectHash: "ab".repeat(32) });
  });

  it("maps the sign-in methods the product actually offers", () => {
    assert.equal(signInMethod("magic-link"), "email_code");
    assert.equal(signInMethod("passkey"), "passkey");
    assert.equal(signInMethod("google"), "google");
    assert.equal(signInMethod("apple"), "apple");
    assert.equal(signInMethod("credentials"), null);
    assert.equal(signInMethod("github"), null);
  });
});

describe("public usage endpoint", () => {
  const ip = "203.0.113.50";

  function endpoint(store: UsageInserter, now = Date.now()) {
    const seen: string[] = [];
    const memory = new MemoryRateLimiter();
    return {
      seen,
      post(body: unknown, email: string | null = null) {
        return acceptUsagePost({
          body,
          signedInEmail: email,
          ip,
          now,
          secret: SECRET,
          store,
          limiter: {
            hit(key, limit, windowMs, at) {
              seen.push(key);
              return memory.hit(key, limit, windowMs, at);
            },
          },
        });
      },
    };
  }

  it("records a guest once and does not keep the address", async () => {
    const store = createMemoryUsageStore();
    const api = endpoint(store);
    const body = { event: "guest_started", anonId: ANON.toUpperCase(), email: "reader@example.com" };
    const first = await api.post(body);
    const second = await api.post(body);
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(store.events.length, 1);
    assert.equal(store.events[0]?.eventType, "guest_started");
    assert.equal(store.events[0]?.subjectHash, guestUsageSubject(ANON, SECRET));
    assert.equal(JSON.stringify(store.events).includes("reader@example.com"), false);
    assert.equal(JSON.stringify(store.events).includes(ip), false);
    assert.equal(api.seen[0], rateLimitKey("ip", `usage-guest:${ip}`));
    assert.equal(api.seen[0]?.includes(ip), false);
  });

  it("rejects forged account events and limits guest spam", async () => {
    const store = createMemoryUsageStore();
    const api = endpoint(store);
    for (const event of ["sign_up", "sign_in", "account_deleted"]) {
      const refused = await api.post({ event, anonId: ANON, email: "reader@example.com" });
      assert.equal(refused.status, 400);
    }
    assert.equal((await api.post({ event: "guest_started", anonId: "not-a-uuid" })).status, 400);
    assert.equal(store.events.length, 0);

    for (let index = 0; index < GUEST_EVENT_LIMIT; index += 1) {
      const anonId = `bbbbbbbb-bbbb-4bbb-8bbb-${index.toString(16).padStart(12, "0")}`;
      const result = await api.post({ event: "guest_started", anonId });
      assert.equal(result.status, 200);
    }
    const blocked = await api.post({ event: "guest_started", anonId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers?.["Retry-After"] !== undefined, true);
    assert.equal(store.events.length, GUEST_EVENT_LIMIT);
  });

  it("records a merge only for a signed-in reader and caps it", async () => {
    const store = createMemoryUsageStore();
    const api = endpoint(store);
    const anonymous = await api.post({ event: "guest_merge", anonId: ANON });
    assert.equal(anonymous.status, 401);
    assert.equal(store.events.length, 0);

    for (let index = 0; index < MERGE_EVENT_LIMIT; index += 1) {
      const anonId = `dddddddd-dddd-4ddd-8ddd-${index.toString(16).padStart(12, "0")}`;
      const result = await api.post({ event: "guest_merge", anonId }, "Reader@Example.com");
      assert.equal(result.status, 200);
    }
    const blocked = await api.post(
      { event: "guest_merge", anonId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" },
      "reader@example.com",
    );
    assert.equal(blocked.status, 429);
    assert.equal(store.events.length, MERGE_EVENT_LIMIT);
    assert.equal(store.events.every((event) => event.eventType === "guest_merge"), true);
    assert.equal(JSON.stringify(store.events).includes("reader@example.com"), false);
    assert.equal(api.seen[0]?.includes("reader@example.com"), false);
    assert.equal(api.seen[0], rateLimitKey("email", "usage-merge:reader@example.com"));
  });

  it("does not write when the store is down", async () => {
    const down: UsageInserter = {
      insert() {
        throw new Error("database offline");
      },
    };
    const api = endpoint(down);
    const result = await api.post({ event: "guest_started", anonId: ANON });
    assert.equal(result.status, 503);
    assert.equal(result.body.error?.includes("database"), false);
  });

  it("ignores a request that is not a guest event", () => {
    assert.equal(parseUsageRequest(null).ok, false);
    assert.equal(parseUsageRequest({ event: "sign_up" }).ok, false);
  });
});

describe("usage stats", () => {
  it("totals the windows, the methods, and guest-to-account conversion", () => {
    const now = new Date("2026-11-11T12:00:00Z");
    const stats = assembleUsageStats(
      [
        { eventType: "guest_started", method: null, all: 40, d30: 10, d7: 0 },
        { eventType: "sign_up", method: "email_code", all: 8, d30: 3, d7: 1 },
        { eventType: "guest_merge", method: null, all: 5, d30: 2, d7: 0 },
        { eventType: "account_deleted", method: null, all: 1, d30: 1, d7: 1 },
        { eventType: "sign_in", method: "email_code", all: 12, d30: 4, d7: 1 },
        { eventType: "sign_in", method: "passkey", all: 3, d30: 1, d7: 0 },
        { eventType: "sign_in", method: "google", all: 6, d30: 2, d7: 1 },
        { eventType: "sign_in", method: "apple", all: 1, d30: 0, d7: 0 },
        { eventType: "note", method: null, all: 99, d30: 99, d7: 99 },
      ],
      [
        { day: "2026-11-11", eventType: "guest_started", count: 2 },
        { day: "2026-11-11", eventType: "sign_up", count: 1 },
        { day: "2026-11-10", eventType: "sign_in", count: 4 },
        { day: "2026-10-01", eventType: "guest_started", count: 9 },
      ],
      now,
    );

    assert.equal(stats.guests.all, 40);
    assert.equal(stats.guests.d30, 10);
    assert.equal(stats.guests.d7, 0);
    assert.equal(stats.signUps.d7, 1);
    assert.equal(stats.merges.all, 5);
    assert.equal(stats.deletions.d30, 1);
    assert.equal(stats.signIns.email_code.all, 12);
    assert.equal(stats.signIns.apple.d30, 0);
    assert.equal(stats.signInTotal.all, 22);
    assert.equal(stats.signInTotal.d7, 2);
    assert.equal(stats.conversion.all.rate, 5 / 40);
    assert.equal(stats.conversion.d30.rate, 2 / 10);
    assert.equal(stats.conversion.d7.rate, null);
    assert.equal(stats.daily.length, 30);
    assert.deepEqual(usageChartDays(now).slice(0, 1), ["2026-10-13"]);
    assert.equal(stats.daily[29]?.day, "2026-11-11");
    assert.equal(stats.daily[29]?.guests, 2);
    assert.equal(stats.daily[29]?.signUps, 1);
    assert.equal(stats.daily[28]?.signIns, 4);
    assert.equal(stats.daily.some((day) => day.day === "2026-10-01"), false);
  });
});
