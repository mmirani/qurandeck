import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { redactAnalyticsUrl, redactSpeedInsight } from "../src/lib/analytics-privacy";

describe("analytics redaction", () => {
  it("strips query strings and hashes that can carry a token", () => {
    const magic = redactAnalyticsUrl({
      type: "pageview" as const,
      url: "https://qurandeck.com/auth/magic?token=secret-link&email=reader@example.com#code",
    });
    assert.equal(magic?.url, "https://qurandeck.com/auth/magic");

    const home = redactAnalyticsUrl({
      url: "https://qurandeck.com/?code=123456&callbackUrl=https%3A%2F%2Fqurandeck.com%2Fapi%2Fauth%2Fcallback%2Fgoogle",
    });
    assert.equal(home?.url, "https://qurandeck.com/");

    const reading = redactAnalyticsUrl({ url: "https://qurandeck.com/read?ayah=2%3A255" });
    assert.equal(reading?.url, "https://qurandeck.com/read");
  });

  it("skips auth API routes and auth callbacks", () => {
    assert.equal(
      redactAnalyticsUrl({ url: "https://qurandeck.com/api/auth/callback/google?code=oauth-code&state=abc" }),
      null,
    );
    assert.equal(redactAnalyticsUrl({ url: "https://qurandeck.com/api/auth/session" }), null);
    assert.equal(redactAnalyticsUrl({ url: "https://qurandeck.com/api/auth" }), null);
    assert.equal(redactAnalyticsUrl({ url: "javascript:alert(1)" }), null);
  });

  it("drops a speed sample whose route is an auth callback and strips its query", () => {
    assert.equal(
      redactSpeedInsight({
        type: "vital" as const,
        url: "https://qurandeck.com/api/auth/callback/apple?code=secret",
        route: "/api/auth/callback/apple",
      }),
      null,
    );
    const sample = redactSpeedInsight({
      type: "vital" as const,
      url: "https://qurandeck.com/surah/1?token=secret",
      route: "/surah/1?token=secret",
    });
    assert.equal(sample?.url, "https://qurandeck.com/surah/1");
    assert.equal(sample?.route, "/surah/1");
  });
});
