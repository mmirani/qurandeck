import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accountId } from "../src/lib/library-seal";
import { MemoryRateLimiter, rateLimitKey } from "../src/lib/rate-limit";
import { defaultPreferences } from "../src/lib/storage";
import {
  coarseAuthReason,
  deviceBucketFrom,
  preferenceUsageEvents,
  sanaCommandName,
} from "../src/lib/usage-catalog";
import {
  CLIENT_BATCH_LIMIT,
  DELETE_DEDUPE_MS,
  GUEST_EVENT_LIMIT,
  MERGE_EVENT_LIMIT,
  SIGN_IN_DEDUPE_MS,
  SUBJECT_EVENT_LIMIT,
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
  usageSchemaStatements,
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

  it("counts features, commands, themes, readers, and sign-in failures", () => {
    const now = new Date("2026-11-11T12:00:00Z");
    const stats = assembleUsageStats(
      [
        { eventType: "feature", method: null, detail: "audio_play", all: 9, d30: 4, d7: 1, readersAll: 3, readers30: 2, readers7: 1 },
        { eventType: "feature", method: null, detail: "2:255", all: 50, d30: 50, d7: 50, readersAll: 50, readers30: 50, readers7: 50 },
        { eventType: "sana_command", method: null, detail: "play_surah", all: 6, d30: 2, d7: 1, readersAll: 4, readers30: 2, readers7: 1 },
        { eventType: "sana_command", method: null, detail: "what is riba", all: 8, d30: 8, d7: 8 },
        { eventType: "sana_unknown", method: null, detail: null, all: 3, d30: 1, d7: 0 },
        { eventType: "sana_refusal", method: null, detail: null, all: 2, d30: 2, d7: 1 },
        { eventType: "setting", method: null, detail: "text_size:20", all: 5, d30: 1, d7: 0 },
        { eventType: "auth_requested", method: "google", detail: null, all: 7, d30: 3, d7: 1 },
        { eventType: "auth_code_used", method: "email_code", detail: null, all: 4, d30: 1, d7: 1 },
        { eventType: "auth_failed", method: "google", detail: "redirect_uri_mismatch", all: 2, d30: 2, d7: 0 },
        { eventType: "auth_failed", method: null, detail: "reader@example.com", all: 9, d30: 9, d7: 9 },
      ],
      [],
      now,
      {
        activity: { day: 4, d7: 11, d30: 20, all: 30 },
        retention: { eligible: 10, returned: 4, recentEligible: 6, recentReturned: 2 },
        themes: [{ detail: "theme:obsidian", all: 8, d30: 3, d7: 1 }],
        devices: [{ detail: "phone_installed", all: 5, d30: 2, d7: 1 }],
        dailyActive: [{ day: "2026-11-11", readers: 4 }],
      },
    );

    assert.equal(stats.features.find((feature) => feature.id === "audio_play")?.counts.all, 9);
    assert.equal(stats.features.find((feature) => feature.id === "audio_play")?.readers.d7, 1);
    assert.equal(stats.features.some((feature) => String(feature.id) === "2:255"), false);
    assert.equal(stats.sana.commands.length, 1);
    assert.equal(stats.sana.commands[0]?.command, "play_surah");
    assert.equal(stats.sana.commands[0]?.readers.all, 4);
    assert.equal(stats.sana.unknown.all, 3);
    assert.equal(stats.sana.refusals.d7, 1);
    assert.equal(stats.settings[0]?.setting, "text_size:20");
    assert.equal(stats.themes[0]?.theme, "obsidian");
    assert.equal(stats.themes[0]?.readers.d30, 3);
    assert.equal(stats.devices.find((device) => device.device === "phone_installed")?.readers.all, 5);
    assert.equal(stats.devices.find((device) => device.device === "desktop_browser")?.readers.all, 0);
    assert.equal(stats.activity.d7, 11);
    assert.equal(stats.retention.rate, 0.4);
    assert.equal(stats.retention.recentRate, 2 / 6);
    assert.equal(stats.authHealth.find((row) => row.method === "google")?.requested.all, 7);
    assert.equal(stats.authHealth.find((row) => row.method === "google")?.failed.d30, 2);
    assert.equal(stats.authHealth.find((row) => row.method === "email_code")?.codeUsed.d7, 1);
    assert.equal(stats.authFailures.length, 1);
    assert.equal(stats.authFailures[0]?.reason, "redirect_uri_mismatch");
    assert.equal(stats.dailyActive[29]?.readers, 4);
    assert.equal(JSON.stringify(stats).includes("reader@example.com"), false);
    assert.equal(JSON.stringify(stats).includes("what is riba"), false);
    assert.equal(JSON.stringify(stats).includes("2:255"), false);
  });
});

describe("product usage privacy", () => {
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

  it("rejects forged events, unknown properties, and free text", async () => {
    const store = createMemoryUsageStore();
    const api = endpoint(store);
    const forged = [
      { events: [{ name: "sign_in", method: "google" }] },
      { events: [{ name: "sign_up", method: "email_code" }] },
      { events: [{ name: "account_deleted" }] },
      { events: [{ name: "feature", feature: "audio_play", query: "mercy" }] },
      { events: [{ name: "feature", feature: "read_surah" }] },
      { events: [{ name: "sana_unknown", text: "what is the ruling on riba" }] },
      { events: [{ name: "sana_command", command: "play this surah slowly" }] },
      { events: [{ name: "setting", setting: "theme:obsidian", note: "my note" }] },
      { events: [{ name: "setting", setting: "theme:not-a-theme" }] },
      { events: [{ name: "session_open", device: "phone_browser", userAgent: "Mozilla/5.0" }] },
      { events: [{ name: "session_open", device: "watch" }] },
      { events: [{ name: "auth_failed", method: "google", reason: "redirect_uri_mismatch", email: "reader@example.com" }] },
      { events: [{ name: "auth_failed", reason: "something the provider returned verbatim" }] },
      { event: "guest_started", anonId: ANON, events: [{ name: "feature", feature: "share" }] },
      { events: [{ name: "feature", feature: "audio_play" }, { name: "feature", feature: "nope" }] },
      { query: "2:255", events: [{ name: "feature", feature: "search_performed" }] },
      { events: Array.from({ length: CLIENT_BATCH_LIMIT + 1 }, () => ({ name: "sana_opened" })) },
    ];
    for (const body of forged) {
      const result = await api.post(body, "reader@example.com");
      assert.equal(result.status, 400);
    }
    assert.equal(store.events.length, 0);
    assert.equal(parseUsageRequest({ events: [{ name: "sana_unknown", text: "hello" }] }).ok, false);
  });

  it("stores allowlisted product events as hashes, never the payload text", async () => {
    const store = createMemoryUsageStore();
    const api = endpoint(store);
    const anon = ANON;
    const body = {
      anonId: anon,
      events: [
        { name: "feature", feature: "audio_play" },
        { name: "sana_command", command: "bigger_text" },
        { name: "sana_unknown" },
        { name: "setting", setting: "theme:iris" },
        { name: "session_open", device: "phone_installed" },
        { name: "auth_failed", method: "google", reason: "access_denied" },
      ],
    };
    const result = await api.post(body);
    assert.equal(result.status, 200);
    assert.equal(store.events.length, 6);
    assert.equal(store.events.every((event) => event.subjectHash === guestUsageSubject(anon, SECRET)), true);
    const saved = JSON.stringify(store.events);
    assert.equal(saved.includes(anon), false);
    assert.equal(saved.includes(ip), false);
    assert.equal(saved.includes("bigger"), true);
    assert.equal(store.events.find((event) => event.eventType === "sana_unknown")?.detail ?? null, null);
    assert.equal(store.events.find((event) => event.eventType === "feature")?.detail, "audio_play");

    const signedIn = await api.post(body, "Reader@Example.com");
    assert.equal(signedIn.status, 200);
    const accountEvents = store.events.slice(6);
    assert.equal(accountEvents.every((event) => event.subjectHash === accountUsageSubject("reader@example.com", SECRET)), true);
    assert.equal(JSON.stringify(accountEvents).includes("reader@example.com"), false);
    assert.equal((await api.post({ events: [{ name: "feature", feature: "share" }] })).status, 400);
  });

  it("caps client events per reader and does not keep the address", async () => {
    const store = createMemoryUsageStore();
    const api = endpoint(store);
    for (let index = 0; index < SUBJECT_EVENT_LIMIT; index += 1) {
      const result = await api.post({ anonId: ANON, events: [{ name: "sana_opened" }] });
      assert.equal(result.status, 200);
    }
    const blocked = await api.post({ anonId: ANON, events: [{ name: "sana_opened" }] });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers?.["Retry-After"] !== undefined, true);
    assert.equal(api.seen[0], rateLimitKey("ip", `usage-client:${ip}`));
    assert.equal(api.seen[0]?.includes(ip), false);
    assert.equal(store.events.length, 1);
  });

  it("dedupes a daily open and repeats a theme only after a week", async () => {
    let now = new Date("2026-11-11T12:00:00Z");
    const store = createMemoryUsageStore([], () => now);
    const subject = guestUsageSubject(ANON, SECRET);
    const open = { eventType: "session_open" as const, method: null, subjectHash: subject, detail: "phone_browser" };
    assert.equal((await store.insert(open)).toString(), "inserted");
    assert.equal((await store.insert({ ...open, detail: "desktop_browser" })).toString(), "duplicate");
    now = new Date("2026-11-12T00:00:00Z");
    assert.equal((await store.insert(open)).toString(), "inserted");

    const theme = { eventType: "setting" as const, method: null, subjectHash: subject, detail: "theme:obsidian" };
    assert.equal((await store.insert(theme)).toString(), "inserted");
    now = new Date("2026-11-15T12:00:00Z");
    assert.equal((await store.insert(theme)).toString(), "duplicate");
    now = new Date("2026-11-19T12:00:00Z");
    assert.equal((await store.insert(theme)).toString(), "inserted");
  });

  it("records display choices and command names, not what someone typed", () => {
    const next = preferenceUsageEvents(defaultPreferences, {
      ...defaultPreferences,
      theme: "obsidian",
      fontSize: 20,
      showTafsir: true,
      showTranslation: false,
    });
    assert.deepEqual(
      next.map((event) => ("setting" in event ? event.setting : "feature" in event ? event.feature : event.name)).sort(),
      ["tafsir:on", "tafsir_opened", "text_size:20", "theme:obsidian", "translation:off", "translation_toggle"].sort(),
    );
    assert.equal(JSON.stringify(next).includes("2:255"), false);
    assert.equal(sanaCommandName("play-surah"), "play_surah");
    assert.equal(sanaCommandName("bigger"), "bigger_text");
    assert.equal(sanaCommandName("none"), null);
    assert.equal(sanaCommandName("refuse"), null);
    assert.equal(sanaCommandName("what does 2:255 mean"), null);
    assert.equal(coarseAuthReason("redirect_uri_mismatch"), "redirect_uri_mismatch");
    assert.equal(coarseAuthReason("AccessDenied"), "access_denied");
    assert.equal(coarseAuthReason("OAuthCallback"), "oauth_callback");
    assert.equal(coarseAuthReason("reader@example.com could not sign in"), "unknown");
    assert.equal(deviceBucketFrom(390, false), "phone_browser");
    assert.equal(deviceBucketFrom(390, true), "phone_installed");
    assert.equal(deviceBucketFrom(800, false), "tablet_browser");
    assert.equal(deviceBucketFrom(1280, true), "desktop_installed");
  });

  it("builds the database allowlist from the same tokens", () => {
    const sql = usageSchemaStatements().join("\n");
    for (const token of ["audio_play", "play_surah", "bigger_text", "theme:iris", "text_size:18", "phone_installed", "redirect_uri_mismatch", "access_denied"]) {
      assert.equal(sql.includes(`'${token}'`), true);
    }
    assert.equal(sql.includes("userAgent"), false);
    assert.equal(sql.includes("reader@example.com"), false);
    assert.equal(sql.includes("2:255"), false);
  });
});
