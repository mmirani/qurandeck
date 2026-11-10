import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  QF_CONTENT_SCOPES,
  QURAN_CACHE_CONTROL,
  backoffDelayMs,
  cacheWindowSeconds,
  foundationUrl,
  qfApiBase,
  qfAuthBase,
  qfConfigFrom,
  tokenExpiresAt,
  tokenIsFresh,
} from "../src/lib/quran/qf";

describe("Quran Foundation config", () => {
  it("stays off until id, secret, and env are all set", () => {
    assert.equal(qfConfigFrom({}), null);
    assert.equal(qfConfigFrom({ QF_CLIENT_ID: "id", QF_CLIENT_SECRET: "secret" }), null);
    assert.equal(qfConfigFrom({ QF_CLIENT_ID: "id", QF_CLIENT_SECRET: "secret", QF_ENV: "staging" }), null);
    const config = qfConfigFrom({ QF_CLIENT_ID: "id", QF_CLIENT_SECRET: "secret", QF_ENV: "prelive" });
    assert.equal(config?.env, "prelive");
  });

  it("points prelive and production at different hosts", () => {
    assert.match(qfAuthBase("prelive"), /prelive-oauth2\.quran\.foundation$/);
    assert.match(qfApiBase("production"), /apis\.quran\.foundation\/content\/api\/v4$/);
    assert.match(foundationUrl("/chapters?language=en", null), /^https:\/\/api\.quran\.com\/api\/v4\/chapters/);
    assert.match(
      foundationUrl("/chapters", { clientId: "id", clientSecret: "secret", env: "production" }),
      /^https:\/\/apis\.quran\.foundation\/content\/api\/v4\/chapters$/,
    );
  });

  it("requests granular content scopes and not the legacy content scope alone", () => {
    assert.match(QF_CONTENT_SCOPES, /content\.quran\.read/);
    assert.match(QF_CONTENT_SCOPES, /content\.audio\.read/);
    assert.equal(QF_CONTENT_SCOPES.split(" ").includes("content"), false);
  });

  it("refreshes a token before the last five minutes", () => {
    const now = 1_000_000;
    const expiresAt = tokenExpiresAt(3600, now);
    assert.equal(tokenIsFresh(expiresAt, now + 50 * 60 * 1000), true);
    assert.equal(tokenIsFresh(expiresAt, now + 56 * 60 * 1000), false);
  });

  it("backs off and keeps the cache window under a week", () => {
    assert.ok(backoffDelayMs(0, 0) < backoffDelayMs(2, 0));
    assert.ok(backoffDelayMs(5, 1) <= 4000);
    const window = cacheWindowSeconds(QURAN_CACHE_CONTROL);
    assert.equal(window.withinWeek, true);
    assert.equal(window.fresh, 86400);
    assert.equal(window.stale, 172800);
  });
});
