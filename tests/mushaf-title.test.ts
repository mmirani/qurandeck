import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_MUSHAF_TITLE, mushafOwnerTitle } from "../src/lib/mushaf-title";

describe("mushafOwnerTitle", () => {
  it("falls back to Your Mushaf when the name is missing", () => {
    assert.equal(mushafOwnerTitle(undefined), DEFAULT_MUSHAF_TITLE);
    assert.equal(mushafOwnerTitle(null), "Your Mushaf");
    assert.equal(mushafOwnerTitle(""), "Your Mushaf");
    assert.equal(mushafOwnerTitle("   "), "Your Mushaf");
  });

  it("uses the first name in the standard possessive", () => {
    assert.equal(mushafOwnerTitle("Mansur"), "Mansur's Mushaf");
    assert.equal(mushafOwnerTitle("  Mansur Mirani  "), "Mansur's Mushaf");
  });

  it("keeps 's after a name that already ends in s", () => {
    assert.equal(mushafOwnerTitle("James"), "James's Mushaf");
    assert.equal(mushafOwnerTitle("James Kirk"), "James's Mushaf");
    assert.equal(mushafOwnerTitle("Chris"), "Chris's Mushaf");
  });
});
