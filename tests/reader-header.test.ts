import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const mobile = readFileSync(new URL("../src/components/reader/mobile-reader-bar.tsx", import.meta.url), "utf8");
const toolbar = readFileSync(new URL("../src/components/reader/reader-toolbar.tsx", import.meta.url), "utf8");

describe("reader header home control", () => {
  it("uses the logo as the only way home on the phone bar", () => {
    assert.equal(mobile.includes("Back to home"), false);
    assert.equal(mobile.includes("ChevronLeft"), false);
    assert.equal(mobile.includes('aria-label="QuranDeck home"'), true);
    assert.match(mobile, /aria-label="QuranDeck home"[\s\S]*min-h-11 min-w-11/);
  });

  it("keeps the desktop logo at a 44px target and does not add a back arrow", () => {
    assert.equal(toolbar.includes("Back to home"), false);
    assert.equal(toolbar.includes("ChevronLeft"), false);
    assert.equal(toolbar.includes('aria-label="QuranDeck home"'), true);
    assert.match(toolbar, /aria-label="QuranDeck home"[\s\S]*min-h-11 min-w-11/);
  });
});
