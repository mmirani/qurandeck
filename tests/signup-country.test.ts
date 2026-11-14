import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { adminStatsHref, countWindow, parseAdminRange } from "../src/lib/admin-range";
import { geoRangeStart } from "../src/lib/geo";
import {
  SIGNUP_COUNTRY_UNKNOWN,
  applySignupCount,
  buildDemoSignups,
  recordSignupCountrySafely,
  shouldCountSignupCountry,
  signupCountingNote,
  signupCountryFromHeader,
  signupCountrySchemaStatements,
  signupShare,
  summarizeSignups,
} from "../src/lib/signup-country";
import { incrementSignupCountry } from "../src/lib/signup-country-store";

const NOW = new Date("2026-11-14T12:00:00Z");
const EMAIL = "reader@example.com";
const IP = "203.0.113.50";
const USER_AGENT = "Mozilla/5.0 (test)";

describe("signup country header", () => {
  it("keeps an ISO code and uses unknown when the header is missing or not a country", () => {
    assert.equal(signupCountryFromHeader(null), SIGNUP_COUNTRY_UNKNOWN);
    assert.equal(signupCountryFromHeader(undefined), SIGNUP_COUNTRY_UNKNOWN);
    assert.equal(signupCountryFromHeader(""), SIGNUP_COUNTRY_UNKNOWN);
    assert.equal(signupCountryFromHeader("  "), SIGNUP_COUNTRY_UNKNOWN);
    assert.equal(signupCountryFromHeader("XX"), SIGNUP_COUNTRY_UNKNOWN);
    assert.equal(signupCountryFromHeader("USA"), SIGNUP_COUNTRY_UNKNOWN);
    assert.equal(signupCountryFromHeader(IP), SIGNUP_COUNTRY_UNKNOWN);
    assert.equal(signupCountryFromHeader(USER_AGENT), SIGNUP_COUNTRY_UNKNOWN);
    assert.equal(signupCountryFromHeader(EMAIL), SIGNUP_COUNTRY_UNKNOWN);
    assert.equal(signupCountryFromHeader("us"), "US");
    assert.equal(signupCountryFromHeader("  sa "), "SA");
  });
});

describe("signup country counter", () => {
  it("upserts the same day and country and leaves a different country on its own row", () => {
    let rows = applySignupCount([], { day: "2026-11-14", country: "US" });
    rows = applySignupCount(rows, { day: "2026-11-14", country: "US" });
    rows = applySignupCount(rows, { day: "2026-11-14", country: SIGNUP_COUNTRY_UNKNOWN });
    rows = applySignupCount(rows, { day: "2026-11-13", country: "US" });
    assert.equal(rows.length, 3);
    assert.equal(rows.find((row) => row.day === "2026-11-14" && row.country === "US")?.count, 2);
    assert.equal(rows.find((row) => row.country === SIGNUP_COUNTRY_UNKNOWN)?.count, 1);
    assert.equal(JSON.stringify(rows).includes(EMAIL), false);
    assert.equal(JSON.stringify(rows).includes(IP), false);
  });

  it("writes an increment statement and refuses a value that is not a country code", async () => {
    const calls: { text: string; values: unknown[] }[] = [];
    const sql = (strings: TemplateStringsArray, ...values: unknown[]) => {
      calls.push({ text: strings.join("?"), values });
      return Promise.resolve([]);
    };
    await incrementSignupCountry(sql, { day: "2026-11-14", country: "US" });
    await incrementSignupCountry(sql, { day: "2026-11-14", country: SIGNUP_COUNTRY_UNKNOWN });
    assert.match(calls[0]?.text ?? "", /INSERT INTO signup_country_daily/);
    assert.match(calls[0]?.text ?? "", /ON CONFLICT \(day, country_code\) DO UPDATE/);
    assert.match(calls[0]?.text ?? "", /signup_country_daily\.count \+ EXCLUDED\.count/);
    assert.deepEqual(calls[0]?.values, ["2026-11-14", "US"]);
    assert.equal(calls[1]?.values[1], SIGNUP_COUNTRY_UNKNOWN);
    await assert.rejects(() => incrementSignupCountry(sql, { day: "2026-11-14", country: "California" }));
    await assert.rejects(() => incrementSignupCountry(sql, { day: "2026-11-14", country: EMAIL }));
    await assert.rejects(() => incrementSignupCountry(sql, { day: "14-11-2026", country: "US" }));
    assert.equal(calls.length, 2);
  });

  it("does not reject sign-up when the write fails, and the log has no user data", async () => {
    const logs: string[] = [];
    await assert.doesNotReject(() =>
      recordSignupCountrySafely(
        "US",
        async () => {
          throw new Error(`insert failed for ${EMAIL} from ${IP} ${USER_AGENT}`);
        },
        NOW,
        (message) => logs.push(message),
      ),
    );
    assert.deepEqual(logs, ["Signup country counter failed"]);
    const logged = logs.join("\n");
    assert.equal(logged.includes(EMAIL), false);
    assert.equal(logged.includes(IP), false);
    assert.equal(logged.includes("Mozilla"), false);
    assert.equal(logged.includes("US"), false);

    const written: { day: string; country: string }[] = [];
    await recordSignupCountrySafely(null, async (row) => {
      written.push(row);
    }, NOW);
    assert.deepEqual(written, [{ day: "2026-11-14", country: SIGNUP_COUNTRY_UNKNOWN }]);
  });

  it("counts a new account once, including credentials, and skips a second count after the adapter", () => {
    assert.equal(shouldCountSignupCountry({ source: "createUser" }), true);
    assert.equal(shouldCountSignupCountry({ source: "jwt", signUp: "inserted", isNewUser: false, trigger: "signIn" }), true);
    assert.equal(shouldCountSignupCountry({ source: "jwt", signUp: "inserted" }), true);
    assert.equal(shouldCountSignupCountry({ source: "jwt", signUp: "duplicate", trigger: "signIn" }), false);
    assert.equal(shouldCountSignupCountry({ source: "jwt", signUp: null }), false);
    assert.equal(shouldCountSignupCountry({ source: "jwt", signUp: "inserted", isNewUser: true, trigger: "signUp" }), false);
    assert.equal(shouldCountSignupCountry({ source: "jwt", signUp: "inserted", trigger: "signUp" }), false);
  });
});

describe("signup country range", () => {
  const rows = [
    { day: "2026-11-08", country: "US", count: 2 },
    { day: "2026-11-07", country: "SA", count: 5 },
    { day: "2026-11-14", country: SIGNUP_COUNTRY_UNKNOWN, count: 1 },
    { day: "2026-10-01", country: "EG", count: 4 },
  ];

  it("uses the same window as the country map", () => {
    assert.equal(geoRangeStart("7", NOW), "2026-11-08");
    const week = summarizeSignups(rows, "7", NOW);
    assert.equal(week.rangeLabel, "the last 7 days");
    assert.equal(week.total, 3);
    assert.equal(week.countries[0]?.country, "US");
    assert.equal(week.countries[0]?.name, "United States");
    assert.equal(week.countries[0]?.flag, "🇺🇸");
    assert.equal(week.countries[0]?.count, 2);
    assert.equal(signupShare(week.countries[0]?.share ?? 0), "66.7%");
    assert.equal(week.countries.find((row) => row.country === SIGNUP_COUNTRY_UNKNOWN)?.name, "Unknown");
    assert.equal(week.countries.find((row) => row.country === SIGNUP_COUNTRY_UNKNOWN)?.count, 1);
    assert.equal(signupShare(week.countries.find((row) => row.country === SIGNUP_COUNTRY_UNKNOWN)?.share ?? 0), "33.3%");
    assert.equal(week.countries.some((row) => row.country === "SA" || row.country === "EG"), false);

    const month = summarizeSignups(rows, "28", NOW);
    assert.equal(month.countries.some((row) => row.country === "SA"), true);
    assert.equal(month.countries.some((row) => row.country === "EG"), false);

    const all = summarizeSignups(rows, "all", NOW);
    assert.equal(all.total, 12);
    assert.equal(all.countries[0]?.country, "SA");
    assert.equal(all.countries.find((row) => row.country === "EG")?.count, 4);
    assert.equal(signupShare(1), "100.0%");
  });

  it("follows 7 days, 30 days, this year, all time, and a custom range", () => {
    const week = parseAdminRange({ range: "7d" }, NOW);
    assert.equal(week.start, geoRangeStart("7", NOW));
    assert.equal(week.label, "the last 7 days");
    assert.equal(adminStatsHref(week, "visitors", "desc").includes("range=7d"), true);

    const month = parseAdminRange({}, NOW);
    assert.equal(month.id, "30d");
    assert.equal(month.start, "2026-10-16");
    assert.equal(adminStatsHref(month, "visitors", "desc"), "/admin/stats");

    const year = parseAdminRange({ range: "year" }, NOW);
    assert.equal(year.start, "2026-01-01");
    assert.equal(year.label, "this year");

    const all = parseAdminRange({ range: "all" }, NOW);
    assert.equal(all.start, null);
    assert.equal(all.label, "all time");

    const swapped = parseAdminRange({ range: "custom", from: "2026-11-14", to: "2026-11-01" }, NOW);
    assert.equal(swapped.start, "2026-11-01");
    assert.equal(swapped.end, "2026-11-14");
    const future = parseAdminRange({ range: "custom", from: "2026-11-01", to: "2026-12-01" }, NOW);
    assert.equal(future.end, "2026-11-14");
    const missing = parseAdminRange({ range: "custom" }, NOW);
    assert.equal(missing.label, "this custom range");
    assert.equal(missing.start !== null && missing.end !== null && missing.start > missing.end, true);

    const legacy = parseAdminRange({ range: "28" }, NOW);
    assert.equal(legacy.start, geoRangeStart("28", NOW));

    const rows = [
      { day: "2026-10-16", country: "US", count: 1 },
      { day: "2026-10-15", country: "SA", count: 9 },
    ];
    const summary = summarizeSignups(rows, "all", NOW, countWindow(month));
    assert.equal(summary.total, 1);
    assert.equal(summary.rangeLabel, "the last 30 days");
    assert.equal(summary.countries.some((row) => row.country === "SA"), false);
    assert.equal(summary.countries.find((row) => row.country === SIGNUP_COUNTRY_UNKNOWN)?.count, 0);
  });

  it("keeps an Unknown row when every sign-up has a country", () => {
    const summary = summarizeSignups([{ day: "2026-11-14", country: "US", count: 4 }], "7", NOW);
    assert.equal(summary.total, 4);
    assert.equal(summary.countries.at(-1)?.country, SIGNUP_COUNTRY_UNKNOWN);
    assert.equal(summary.countries.at(-1)?.count, 0);
    assert.equal(summary.countries.at(-1)?.flag, "");
  });

  it("folds a non-country value into Unknown", () => {
    const summary = summarizeSignups([{ day: "2026-11-14", country: "California", count: 2 }], "all", NOW);
    assert.equal(summary.total, 2);
    assert.equal(summary.countries.length, 1);
    assert.equal(summary.countries[0]?.country, SIGNUP_COUNTRY_UNKNOWN);
  });
});

describe("signup country schema", () => {
  it("stores a day, a country code, and a count, and nothing that identifies a person", () => {
    const sql = signupCountrySchemaStatements().join("\n");
    assert.equal(sql.includes("signup_country_daily"), true);
    assert.equal(sql.includes("country_code"), true);
    assert.equal(sql.includes("signup-country-v1"), true);
    assert.match(sql, /count integer/);
    for (const token of ["email", "ip_address", "user_agent", "user-agent", "anon_id", "city", "region"]) {
      assert.equal(sql.toLowerCase().includes(token), false, token);
    }
    const store = readFileSync("src/lib/usage-store.ts", "utf8");
    assert.equal(store.includes("signupCountrySchemaStatements"), true);
    assert.equal(store.includes("DELETE FROM signup_country_daily"), true);
    const demo = JSON.stringify(buildDemoSignups(NOW));
    assert.equal(demo.includes(EMAIL), false);
    assert.equal(demo.includes(IP), false);
    assert.equal(demo.includes(SIGNUP_COUNTRY_UNKNOWN), true);
  });

  it("hooks every new account and tells readers the counting start date", () => {
    assert.equal(signupCountingNote(), "Counting started November 14, 2026; earlier sign-ups have no country.");
    const auth = readFileSync("src/auth.ts", "utf8");
    const createUser = auth.slice(auth.indexOf("async createUser"), auth.indexOf("pages:"));
    assert.equal(createUser.includes('source: "createUser"'), true);
    assert.equal(createUser.includes("user.email"), false);
    assert.equal(auth.includes("shouldCountSignupCountry"), true);
    assert.equal(auth.includes("x-vercel-ip-country"), true);
    assert.equal(auth.includes("Signup country counter failed"), true);
    assert.equal(auth.includes("x-vercel-ip-city"), false);
    assert.equal(auth.includes("x-vercel-ip-country-region"), false);
    const page = readFileSync("src/app/admin/stats/page.tsx", "utf8");
    assert.equal(page.includes("loadSignupCountries"), true);
    assert.equal(page.includes("summarizeSignups"), true);
    const ui = readFileSync("src/components/admin/signup-countries.tsx", "utf8");
    assert.equal(ui.includes("Sign-ups by country"), true);
    assert.equal(ui.includes("countingNote"), true);
    assert.equal(ui.includes("Unknown"), true);
    const privacy = readFileSync("src/app/privacy/page.tsx", "utf8");
    assert.match(privacy, /Sign-up counts by country are kept the same aggregate way/);
  });
});
