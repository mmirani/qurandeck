import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authEntryHref, authEntryMode } from "../src/lib/auth-entry";

describe("auth entry mode", () => {
  it("treats signup as sign-up and everything else as sign-in", () => {
    assert.equal(authEntryMode("signup"), "signup");
    assert.equal(authEntryMode("signin"), "signin");
    assert.equal(authEntryMode(null), "signin");
    assert.equal(authEntryMode("register"), "signin");
    assert.equal(authEntryMode(""), "signin");
  });

  it("points both modes at the home account sheet", () => {
    assert.equal(authEntryHref("signup"), "/?auth=1&mode=signup");
    assert.equal(authEntryHref("signin"), "/?auth=1&mode=signin");
  });
});
