import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createMemoryUsageStore, acceptUsagePost, adminStatsStatus, guestUsageSubject } from "../src/lib/usage";
import { MemoryRateLimiter } from "../src/lib/rate-limit";
import { isoNumeric, isoTokens } from "../src/lib/geo-codes";
import { countryShapes } from "../src/lib/geo-map";
import {
  applyGeoEvent,
  buildDemoGeo,
  countryFromHeader,
  countryName,
  emptyGeoState,
  flagEmoji,
  geoFill,
  geoScaleBands,
  geoSchemaStatements,
  geoStep,
  geoSummaryText,
  geoVisitorHash,
  snapshotFromState,
  summarizeGeo,
  type GeoEvent,
} from "../src/lib/geo";

const SECRET = "test-secret-test-secret";
const ANON = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const IP = "203.0.113.50";
const USER_AGENT = "Mozilla/5.0 (test) AppleWebKit/537.36";

function hash(anonId: string, day: string) {
  return geoVisitorHash(anonId, day, SECRET);
}

describe("country header", () => {
  it("uses a two-letter ISO code and ZZ when the header is missing or not a country", () => {
    assert.equal(countryFromHeader(null), "ZZ");
    assert.equal(countryFromHeader(undefined), "ZZ");
    assert.equal(countryFromHeader(""), "ZZ");
    assert.equal(countryFromHeader("  "), "ZZ");
    assert.equal(countryFromHeader("us"), "US");
    assert.equal(countryFromHeader(" SA "), "SA");
    assert.equal(countryFromHeader("USA"), "ZZ");
    assert.equal(countryFromHeader("U1"), "ZZ");
    assert.equal(countryFromHeader("XX"), "ZZ");
    assert.equal(countryFromHeader("T1"), "ZZ");
    assert.equal(countryFromHeader(IP), "ZZ");
    assert.equal(countryFromHeader(USER_AGENT), "ZZ");
    assert.equal(countryName("US"), "United States");
    assert.equal(countryName("ZZ"), "Unknown");
    assert.equal(flagEmoji("ZZ"), "");
    assert.equal(flagEmoji("US"), "🇺🇸");
  });
});

describe("daily visitor hash", () => {
  it("rotates with the day and does not match the long-term subject", () => {
    const today = hash(ANON, "2026-11-13");
    const tomorrow = hash(ANON, "2026-11-14");
    assert.equal(today, hash(ANON, "2026-11-13"));
    assert.notEqual(today, tomorrow);
    assert.equal(today.length, 64);
    assert.equal(today.includes(ANON), false);
    assert.notEqual(today, guestUsageSubject(ANON, SECRET));
    assert.throws(() => geoVisitorHash(ANON, "2026-11-13", "short"));
  });
});

describe("geo aggregation", () => {
  it("counts a visit once per day, keeps the first country, and sums page views", () => {
    const day = "2026-11-13";
    const visitorHash = hash(ANON, day);
    let state = emptyGeoState();
    state = applyGeoEvent(state, { day, country: "US", visitorHash, kind: "visit" });
    state = applyGeoEvent(state, { day, country: "CA", visitorHash, kind: "visit" });
    state = applyGeoEvent(state, { day, country: "CA", visitorHash, kind: "page_view" });
    state = applyGeoEvent(state, { day, country: "CA", visitorHash, kind: "page_view" });

    assert.equal(state.visitors.length, 1);
    assert.equal(state.visitors[0]?.country, "US");
    assert.equal(state.visitors[0]?.visitCounted, true);
    assert.equal(state.daily.length, 1);
    assert.equal(state.daily[0]?.country, "US");
    assert.equal(state.daily[0]?.visits, 1);
    assert.equal(state.daily[0]?.pageViews, 2);
    assert.equal(JSON.stringify(state).includes(ANON), false);
    assert.equal(JSON.stringify(state).includes(IP), false);
    assert.equal(JSON.stringify(state).includes("Mozilla"), false);
  });

  it("counts the same reader again on the next day and rolls a range up from daily hashes", () => {
    const first = hash(ANON, "2026-11-12");
    const second = hash(ANON, "2026-11-13");
    let state = emptyGeoState();
    state = applyGeoEvent(state, { day: "2026-11-12", country: "SA", visitorHash: first, kind: "visit" });
    state = applyGeoEvent(state, { day: "2026-11-12", country: "SA", visitorHash: first, kind: "page_view" });
    state = applyGeoEvent(state, { day: "2026-11-13", country: "SA", visitorHash: second, kind: "visit" });
    state = applyGeoEvent(state, { day: "2026-11-13", country: "SA", visitorHash: second, kind: "page_view" });
    state = applyGeoEvent(state, { day: "2026-10-01", country: "EG", visitorHash: hash("other", "2026-10-01"), kind: "visit" });

    const summary = summarizeGeo(snapshotFromState(state), "7", "visitors", "desc", new Date("2026-11-13T12:00:00Z"));
    assert.equal(summary.uniqueVisitors, 2);
    assert.equal(summary.visits, 2);
    assert.equal(summary.pageViews, 2);
    assert.equal(summary.countries[0]?.country, "SA");
    assert.equal(summary.countries.some((row) => row.country === "EG"), false);
    assert.equal(summary.trend.length, 7);
    assert.equal(summary.trend[5]?.visitors, 1);
    assert.equal(summary.trend[6]?.visitors, 1);

    const all = summarizeGeo(snapshotFromState(state), "all", "visitors", "desc", new Date("2026-11-13T12:00:00Z"));
    assert.equal(all.uniqueVisitors, 3);
    assert.equal(all.countries.find((row) => row.country === "EG")?.visitors, 1);
  });

  it("refuses a city, an address, or the raw id on a geo row", () => {
    const visitorHash = hash(ANON, "2026-11-13");
    assert.throws(() =>
      applyGeoEvent(emptyGeoState(), {
        day: "2026-11-13",
        country: "US",
        visitorHash,
        kind: "visit",
        ip: IP,
      } as GeoEvent),
    );
    assert.throws(() =>
      applyGeoEvent(emptyGeoState(), {
        day: "2026-11-13",
        country: "California",
        visitorHash,
        kind: "visit",
      }),
    );
    const sql = geoSchemaStatements().join("\n");
    for (const token of ["ip_address", "user_agent", "user-agent", "x-forwarded-for", "city", "region", "email", "anon_id", "request_path"]) {
      assert.equal(sql.toLowerCase().includes(token), false);
    }
    assert.equal(sql.includes("usage-geo-v1"), true);
    assert.equal(sql.includes("page_views"), true);
  });
});

describe("owner gate", () => {
  const allow = "owner@example.com, second@example.com";

  it("returns 404 for everyone who is not an owner", () => {
    assert.equal(adminStatsStatus("owner@example.com", allow), 200);
    assert.equal(adminStatsStatus("OWNER@EXAMPLE.COM", allow), 200);
    assert.equal(adminStatsStatus("other@example.com", allow), 404);
    assert.equal(adminStatsStatus("owner@example.com.evil", allow), 404);
    assert.equal(adminStatsStatus(null, allow), 404);
    assert.equal(adminStatsStatus(undefined, allow), 404);
    assert.equal(adminStatsStatus("owner@example.com", ""), 404);
    const page = readFileSync("src/app/admin/stats/page.tsx", "utf8");
    assert.equal(page.includes("adminStatsStatus"), true);
    assert.equal(page.includes("notFound()"), true);
    assert.equal(page.includes("OWNER_EMAILS"), false);
    assert.equal(page.includes("/admin/analytics"), false);
  });
});

describe("usage post geo", () => {
  it("records a visit and a page view without the IP, user agent, or raw id", async () => {
    const store = createMemoryUsageStore();
    const recorded: GeoEvent[] = [];
    const result = await acceptUsagePost({
      body: {
        anonId: ANON,
        events: [
          { name: "session_open", device: "phone_browser" },
          { name: "page_view" },
        ],
        userAgent: USER_AGENT,
        ip: IP,
      },
      signedInEmail: null,
      ip: IP,
      now: Date.parse("2026-11-13T15:00:00Z"),
      secret: SECRET,
      countryHeader: null,
      store,
      limiter: new MemoryRateLimiter(),
      recordGeo: async (event) => {
        recorded.push(event);
      },
    });

    assert.equal(result.status, 400);
    assert.equal(recorded.length, 0);
    assert.equal(store.events.length, 0);

    const allowed = await acceptUsagePost({
      body: {
        anonId: ANON,
        events: [
          { name: "session_open", device: "phone_browser" },
          { name: "page_view" },
        ],
      },
      signedInEmail: "reader@example.com",
      ip: IP,
      now: Date.parse("2026-11-13T15:00:00Z"),
      secret: SECRET,
      countryHeader: undefined,
      store,
      limiter: new MemoryRateLimiter(),
      recordGeo: async (event) => {
        recorded.push(event);
      },
    });
    assert.equal(allowed.status, 200);
    assert.equal(store.events.length, 1);
    assert.equal(store.events[0]?.eventType, "session_open");
    assert.equal(store.events[0]?.detail, "phone_browser");
    assert.equal(store.events.some((event) => event.eventType === ("page_view" as never)), false);
    assert.equal(recorded.length, 2);
    assert.equal(recorded[0]?.kind, "visit");
    assert.equal(recorded[1]?.kind, "page_view");
    assert.equal(recorded[0]?.country, "ZZ");
    assert.equal(recorded[0]?.visitorHash, hash(ANON, "2026-11-13"));
    const saved = JSON.stringify({ usage: store.events, geo: recorded });
    assert.equal(saved.includes(IP), false);
    assert.equal(saved.includes(USER_AGENT), false);
    assert.equal(saved.includes(ANON), false);
    assert.equal(saved.includes("reader@example.com"), false);
    assert.deepEqual(Object.keys(recorded[0] ?? {}).sort(), ["country", "day", "kind", "visitorHash"]);
  });

  it("rejects a page view that names a path or a user agent", async () => {
    const store = createMemoryUsageStore();
    const recorded: GeoEvent[] = [];
    const result = await acceptUsagePost({
      body: { anonId: ANON, events: [{ name: "page_view", path: "/surah/2", userAgent: USER_AGENT }] },
      signedInEmail: null,
      ip: IP,
      secret: SECRET,
      countryHeader: "US",
      store,
      limiter: new MemoryRateLimiter(),
      recordGeo: async (event) => {
        recorded.push(event);
      },
    });
    assert.equal(result.status, 400);
    assert.equal(recorded.length, 0);
    assert.equal(store.events.length, 0);
  });
});

describe("map", () => {
  it("draws bundled countries and does not call a tile server", () => {
    const shapes = countryShapes();
    assert.equal(shapes.length > 150, true);
    assert.equal(shapes.some((shape) => shape.id === "840" && shape.d.startsWith("M")), true);
    assert.equal(shapes.some((shape) => shape.id === "010"), false);
    assert.equal(isoNumeric("US"), "840");
    assert.equal(isoNumeric("SA"), "682");
    const tokens = isoTokens();
    assert.equal(new Set(tokens).size, tokens.length);
    assert.equal(tokens.every((token) => /^[A-Z]{2}\d{3}$/.test(token)), true);
    const source = [
      "src/lib/geo-map.ts",
      "src/components/admin/geo-dashboard.tsx",
      "src/lib/geo-store.ts",
      "src/app/api/usage/route.ts",
    ]
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    assert.equal(/mapbox|googleapis|openstreetmap|\{z\}\/\{x\}\/\{y\}/i.test(source), false);
    assert.equal(source.includes("x-vercel-ip-city"), false);
    assert.equal(source.includes("x-vercel-ip-country-region"), false);
    for (let max = 1; max <= 40; max += 1) {
      const bands = geoScaleBands(max);
      for (let value = 1; value <= max; value += 1) {
        const band = bands.find((item) => value >= item.from && value <= item.to);
        assert.equal(band?.step, geoStep(value, max));
        assert.equal(geoFill(value, max).includes("gold"), true);
      }
    }
    const demo = buildDemoGeo();
    assert.equal(JSON.stringify(demo).includes(IP), false);
    const text = geoSummaryText(summarizeGeo(demo, "28", "visitors", "desc", new Date("2026-11-13T12:00:00Z")));
    assert.equal(text.includes("United States"), true);
  });
});

describe("privacy copy", () => {
  it("says the country is worked out from the connection and the IP is not stored", () => {
    const page = readFileSync("src/app/privacy/page.tsx", "utf8");
    assert.match(
      page,
      /We record the country your visit comes from \(worked out from your connection and then discarded; we don&apos;t store IP addresses\)/,
    );
    assert.equal(page.includes("OWNER_EMAILS"), false);
  });
});
