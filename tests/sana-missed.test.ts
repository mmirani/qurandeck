import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSafeShape, missedShape } from "../src/lib/guide/missed-shape";
import { reportMissedCommand } from "../src/lib/sana-missed-client";
import {
  MISSED_MIN_COUNT,
  acceptMissedPost,
  parseMissedBody,
  topMissedShapes,
  type MissedStore,
} from "../src/lib/sana-missed";

describe("Sana missed-command shape", () => {
  it("keeps command words and replaces numbers, surahs, and themes", () => {
    assert.equal(missedShape("Take me to Al-Kahf tonight"), "take me to [surah] [w]");
    assert.equal(missedShape("go to al kahf verse 10"), "go to [surah] verse [n]");
    assert.equal(missedShape("2:255"), "[n] [n]");
    assert.equal(missedShape("Repeat ayah 3 times!!"), "repeat ayah [n] [w]");
    assert.equal(missedShape("make it ROSE"), "make it [theme]");
    assert.equal(missedShape("go to chapter thirty six"), "go to chapter [n]");
    assert.equal(missedShape("Read the cow"), "read [surah]");
  });

  it("never keeps a personal word", () => {
    for (const raw of ["remind Amina at maghrib", "my son Yahya", "is this Zaynab's"]) {
      const shape = missedShape(raw);
      assert.ok(shape == null || !/amina|maghrib|yahya|zaynab/.test(shape), raw);
    }
    assert.equal(missedShape("show Amina Zaynab Khadija"), "show [w]");
    assert.equal(missedShape("dear Fatima"), null);
  });

  it("drops emails, links, phone numbers, and long text", () => {
    assert.equal(missedShape("my email is a@b.com"), null);
    assert.equal(missedShape("open https://example.com"), null);
    assert.equal(missedShape("go to qurandeck.com"), null);
    assert.equal(missedShape("call 604 555 1234"), null);
    assert.equal(missedShape("where did i leave off yesterday morning ok"), null);
    assert.equal(missedShape("x".repeat(200)), null);
    assert.equal(missedShape("   "), null);
  });

  it("checks shapes on the server", () => {
    assert.ok(isSafeShape("take me to [surah] [w]"));
    assert.ok(isSafeShape("[n] [n]"));
    assert.ok(!isSafeShape("take me to amina"));
    assert.ok(!isSafeShape("[w]"));
    assert.ok(!isSafeShape("[w] [w] open"));
    assert.ok(!isSafeShape("go to page [n] now please open it"));
    assert.ok(!isSafeShape(42));
    assert.ok(!isSafeShape(""));
  });

  it("accepts only a lone safe shape in the body", () => {
    assert.equal(parseMissedBody(JSON.stringify({ shape: "go to page [n]" })), "go to page [n]");
    assert.equal(parseMissedBody(JSON.stringify({ shape: "go to page [n]", text: "go to page 5" })), null);
    assert.equal(parseMissedBody(JSON.stringify({ shape: "remind amina" })), null);
    assert.equal(parseMissedBody("not json"), null);
    assert.equal(parseMissedBody(JSON.stringify(["go"])), null);
  });

  it("records a safe shape and no-ops when storage is missing", async () => {
    const seen: string[] = [];
    const store: MissedStore = { record: async (shape) => (seen.push(shape), true) };
    assert.deepEqual(await acceptMissedPost(JSON.stringify({ shape: "go to page [n]" }), store), { status: 204 });
    assert.deepEqual(await acceptMissedPost(JSON.stringify({ shape: "hello amina" }), store), { status: 400 });
    assert.deepEqual(seen, ["go to page [n]"]);
    const missing: MissedStore = { record: async () => false };
    assert.deepEqual(await acceptMissedPost(JSON.stringify({ shape: "go to page [n]" }), missing), { status: 204 });
    const broken: MissedStore = {
      record: async () => {
        throw new Error("down");
      },
    };
    assert.deepEqual(await acceptMissedPost(JSON.stringify({ shape: "go to page [n]" }), broken), { status: 204 });
  });

  it("lists top shapes over 30 days only once they reach 3", () => {
    const now = new Date("2026-11-21T12:00:00Z");
    const top = topMissedShapes(
      [
        { shape: "go to page [n]", day: "2026-11-21", count: 2 },
        { shape: "go to page [n]", day: "2026-11-20", count: 2 },
        { shape: "repeat ayah", day: "2026-11-21", count: 2 },
        { shape: "repeat ayah", day: "2026-10-01", count: 9 },
        { shape: "open settings", day: "2026-11-01", count: 3 },
        { shape: "remind amina", day: "2026-11-21", count: 50 },
      ],
      now,
    );
    assert.equal(MISSED_MIN_COUNT, 3);
    assert.deepEqual(top, [
      { shape: "go to page [n]", count: 4, days: 2 },
      { shape: "open settings", count: 3, days: 1 },
    ]);
  });

  it("sends only the shape, once per page load, without cookies", () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const post = ((url: string, init: RequestInit) => {
      calls.push({ url, init });
      return Promise.resolve(new Response(null, { status: 204 }));
    }) as unknown as typeof fetch;
    assert.equal(reportMissedCommand("Go to page 5 for Amina", post), "go to page [n] for [w]");
    assert.equal(reportMissedCommand("go to page 9 for Yusra", post), null);
    assert.equal(reportMissedCommand("my email is a@b.com", post), null);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/sana/missed");
    assert.equal(calls[0].init.credentials, "omit");
    assert.equal(calls[0].init.body, JSON.stringify({ shape: "go to page [n] for [w]" }));
    assert.ok(!String(calls[0].init.body).includes("5"));
    assert.ok(!String(calls[0].init.body).toLowerCase().includes("amina"));
  });
});
