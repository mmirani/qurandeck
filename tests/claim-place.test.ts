import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { claimReadingPlace, defaultReadingProgress, saveReadingPlace } from "../src/lib/reading";

describe("claiming this screen's place over another device's", () => {
  const desktopAt = 1_000_000; // the desktop's clock runs ahead
  const phoneNow = desktopAt - 5 * 60_000;

  it("'Stay here' stamps after the declined place even when this clock is behind", () => {
    const local = { ...defaultReadingProgress, lastVerseKey: "73:10", lastActiveAt: desktopAt };
    const claimed = claimReadingPlace(local, "15:1", { now: phoneNow, over: desktopAt });
    assert.equal(claimed.lastVerseKey, "15:1");
    assert.ok((claimed.lastActiveAt ?? 0) > desktopAt);
  });

  it("uses now when this clock is ahead", () => {
    const claimed = claimReadingPlace(defaultReadingProgress, "15:1", { now: desktopAt, over: phoneNow });
    assert.equal(claimed.lastActiveAt, desktopAt);
  });

  it("ignores bad keys", () => {
    assert.equal(claimReadingPlace(defaultReadingProgress, "nope", { now: 1 }), defaultReadingProgress);
  });

  it("a reading move never stamps before the place this screen holds", () => {
    const local = { ...defaultReadingProgress, lastVerseKey: "73:10", lastActiveAt: desktopAt };
    const moved = saveReadingPlace(local, "15:2", { now: phoneNow });
    assert.ok((moved.lastActiveAt ?? 0) > desktopAt);
  });
});
