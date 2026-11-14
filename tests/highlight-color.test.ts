import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { highlightsNewestFirst, paintAyahHighlight, recolorHighlight } from "../src/lib/highlights";
import type { Highlight } from "../src/lib/quran/types";

function mark(partial: Partial<Highlight> & Pick<Highlight, "id" | "layer">): Highlight {
  return {
    verseKey: "18:18",
    swatchId: "yellow",
    text: "cave",
    createdAt: "2026-11-13T00:00:00.000Z",
    ...partial,
  };
}

describe("recolorHighlight", () => {
  it("changes only the colour of a text mark", () => {
    const original = mark({
      id: "text-1",
      layer: "translation",
      text: "cave",
      startOffset: 2,
      endOffset: 6,
    });
    const next = recolorHighlight([original], "text-1", "pink");
    assert.equal(next[0]?.swatchId, "pink");
    assert.equal(next[0]?.id, "text-1");
    assert.equal(next[0]?.createdAt, original.createdAt);
    assert.equal(next[0]?.startOffset, 2);
    assert.equal(next[0]?.endOffset, 6);
    assert.equal(next[0]?.text, "cave");
    assert.equal(next[0]?.layer, "translation");
    assert.equal(next[0]?.verseKey, "18:18");
  });

  it("recolours a word range in place", () => {
    const original = mark({
      id: "word-1",
      layer: "arabic",
      text: "بِسْمِ",
      startWord: 1,
      endWord: 3,
    });
    const next = recolorHighlight([original, mark({ id: "other", layer: "ayah", verseKey: "1:1" })], "word-1", "blue");
    const word = next.find((item) => item.id === "word-1");
    assert.equal(word?.swatchId, "blue");
    assert.equal(word?.startWord, 1);
    assert.equal(word?.endWord, 3);
    assert.equal(word?.createdAt, original.createdAt);
    assert.equal(next.find((item) => item.id === "other")?.swatchId, "yellow");
  });

  it("returns the same list when the colour is unchanged or the id is missing", () => {
    const original = mark({ id: "a", layer: "ayah" });
    const list = [original];
    assert.equal(recolorHighlight(list, "a", "yellow"), list);
    assert.equal(recolorHighlight(list, "missing", "pink"), list);
  });
});

describe("highlightsNewestFirst", () => {
  it("lists the newest mark first", () => {
    const older = mark({ id: "old", layer: "ayah", createdAt: "2026-11-01T00:00:00.000Z" });
    const newer = mark({ id: "new", layer: "translation", createdAt: "2026-11-13T00:00:00.000Z" });
    assert.deepEqual(
      highlightsNewestFirst([older, newer]).map((item) => item.id),
      ["new", "old"],
    );
  });
});

describe("paintAyahHighlight", () => {
  it("creates an ayah mark and keeps it when the same pen is chosen again", () => {
    const painted = paintAyahHighlight([], "18:18", "green", "The cave");
    assert.equal(painted.length, 1);
    assert.equal(painted[0]?.layer, "ayah");
    assert.equal(painted[0]?.swatchId, "green");
    const again = paintAyahHighlight(painted, "18:18", "green", "The cave");
    assert.equal(again, painted);
    assert.equal(again[0]?.createdAt, painted[0]?.createdAt);
  });

  it("recolours the ayah mark without a new id or createdAt", () => {
    const painted = paintAyahHighlight([], "18:17", "yellow", "story");
    const rose = paintAyahHighlight(painted, "18:17", "pink", "story");
    assert.equal(rose.length, 1);
    assert.equal(rose[0]?.id, painted[0]?.id);
    assert.equal(rose[0]?.createdAt, painted[0]?.createdAt);
    assert.equal(rose[0]?.swatchId, "pink");
    assert.equal(rose[0]?.text, "story");
    assert.equal(rose[0]?.verseKey, "18:17");
  });
});
