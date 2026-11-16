import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_MUSHAF_TITLE,
  MUSHAF_COVER_OWNER_MAX,
  mushafCoverOwner,
  mushafOwnerTitle,
} from "../src/lib/mushaf-title";

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

  it("falls back to Your Mushaf when the first cover line is too long", () => {
    assert.equal("Muhammad's".length, MUSHAF_COVER_OWNER_MAX);
    assert.equal(mushafOwnerTitle("Muhammad"), "Muhammad's Mushaf");
    assert.equal(mushafOwnerTitle("Elizabeth"), "Your Mushaf");
    assert.equal(mushafOwnerTitle("Christopher Wren"), "Your Mushaf");
  });
});

describe("mushafCoverOwner", () => {
  it("takes the first cover line from the one-line title", () => {
    assert.equal(mushafCoverOwner("Mansur's Mushaf"), "Mansur's");
    assert.equal(mushafCoverOwner("James's Mushaf"), "James's");
    assert.equal(mushafCoverOwner("Your Mushaf"), "Your");
  });
});
