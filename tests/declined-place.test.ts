import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDeclinedPlace, shouldOfferPlace } from "../src/lib/reading";

describe("declined other-device place", () => {
  it("offers a place when nothing was turned down", () => {
    assert.equal(shouldOfferPlace(null, "73:10", 1000), true);
    assert.equal(shouldOfferPlace(null, null, 1000), false);
  });

  it("never offers the same place again after Stay here or close", () => {
    const declined = { key: "73:10", at: 1000 };
    assert.equal(shouldOfferPlace(declined, "73:10", 1000), false);
    assert.equal(shouldOfferPlace(declined, "73:10", 999), false);
    assert.equal(shouldOfferPlace(declined, "2:5", 900), false);
  });

  it("offers again once the other device moves on to a newer place", () => {
    const declined = { key: "73:10", at: 1000 };
    assert.equal(shouldOfferPlace(declined, "73:11", 1001), true);
    assert.equal(shouldOfferPlace(declined, "73:10", 2000), true);
  });

  it("reads only a well-formed stored value", () => {
    assert.deepEqual(parseDeclinedPlace('{"key":"73:10","at":1000}'), { key: "73:10", at: 1000 });
    assert.equal(parseDeclinedPlace(null), null);
    assert.equal(parseDeclinedPlace("not json"), null);
    assert.equal(parseDeclinedPlace('{"key":"x","at":1}'), null);
    assert.equal(parseDeclinedPlace('{"key":"73:10","at":"soon"}'), null);
  });
});
