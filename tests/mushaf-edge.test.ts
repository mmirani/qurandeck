import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Bookmark, Highlight, HighlightSwatch, Note } from "../src/lib/quran/types";
import {
  buildMushafEdge,
  clusterByPosition,
  limitChoices,
  minShareForWidth,
  notePreview,
  placeFloating,
  type EdgeChoice,
  type EdgeItem,
} from "../src/lib/mushaf-edge";
import { TOTAL_SURAHS } from "../src/lib/reading";

const swatches: HighlightSwatch[] = [
  { id: "honey", name: "Honey", color: "#f5d76e" },
  { id: "sky", name: "Sky", color: "#7dd3fc" },
];

function highlight(id: string, verseKey: string, swatchId: string, text = "SECRET-HIGHLIGHT"): Highlight {
  return {
    id,
    verseKey,
    layer: "ayah",
    swatchId,
    text,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function note(id: string, verseKey: string, body: string): Note {
  return {
    id,
    verseKey,
    body,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
}

function bookmark(id: string, verseKey: string, label: string, endVerseKey?: string): Bookmark {
  return {
    id,
    type: "verse",
    verseKey,
    endVerseKey,
    label,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function item(id: string, position: number): EdgeItem {
  return {
    id,
    kind: "note",
    verseKey: "1:1",
    chapterId: 1,
    verseNumber: 1,
    position,
    preview: "",
    label: "",
  };
}

describe("notePreview", () => {
  it("keeps a short note and clips a long one to the first words", () => {
    assert.equal(notePreview("  Cave   light "), "Cave light");
    assert.equal(
      notePreview("one two three four five six seven eight nine SECRET"),
      "one two three four five six seven eight…",
    );
    assert.equal(notePreview("   "), "");
  });
});

describe("buildMushafEdge", () => {
  it("gives every surah a slice and gathers short ones into a hittable group", () => {
    const edge = buildMushafEdge({ minShare: 0.05 });
    assert.equal(edge.bands.length, TOTAL_SURAHS);
    assert.ok(Math.abs(edge.bands.reduce((sum, band) => sum + band.span, 0) - 1) < 1e-9);
    assert.deepEqual(edge.buckets[0]?.chapterIds.slice(0, 3), [1, 2, 3]);
    assert.ok(edge.buckets.every((bucket) => bucket.span >= 0.05 - 1e-9 || edge.buckets.length === 1));
    assert.equal(buildMushafEdge({ minShare: 0 }).buckets.length, TOTAL_SURAHS);
    assert.equal(buildMushafEdge({ minShare: 1 }).buckets.length, 1);
  });

  it("stacks highlight colours by count and drops the marked text", () => {
    const edge = buildMushafEdge({
      swatches,
      highlights: [
        highlight("a", "2:1", "honey"),
        highlight("b", "2:1", "honey"),
        highlight("c", "2:2", "sky"),
        highlight("bad", "2:3", "missing", "SHOULD-NOT-LEAK"),
        highlight("nope", "2:999", "honey"),
      ],
    });
    const baqarah = edge.bands.find((band) => band.chapterId === 2);
    assert.equal(baqarah?.highlightCount, 4);
    assert.equal(baqarah?.colors[0]?.name, "Honey");
    assert.equal(baqarah?.colors[0]?.count, 2);
    assert.equal(baqarah?.colors[0]?.share, 0.5);
    assert.equal(baqarah?.colors.find((color) => color.name === "Sky")?.count, 1);
    assert.equal(baqarah?.colors.find((color) => color.id === "missing")?.name, "Saved colour");
    assert.equal(JSON.stringify(edge).includes("SECRET-HIGHLIGHT"), false);
    assert.equal(JSON.stringify(edge).includes("SHOULD-NOT-LEAK"), false);
  });

  it("merges nearby notes into one +N flag and leaves a far note alone", () => {
    const edge = buildMushafEdge({
      notes: [
        note("near-a", "2:1", "one two three four five six seven eight nine SECRET-A"),
        note("near-b", "2:2", "second note stays private after these extra words SECRET-B"),
        note("far", "36:1", "Ya-Sin note"),
      ],
    });
    assert.equal(edge.noteFlags.length, 2);
    const dense = edge.noteFlags.find((flag) => flag.label === "+2");
    assert.ok(dense);
    assert.equal(dense?.items.length, 2);
    assert.equal(dense?.direct, null);
    assert.equal(dense?.choices.length, 2);
    assert.equal(dense?.tooltip.preview, "one two three four five six seven eight…");
    assert.match(dense?.tooltip.lines.join(" ") ?? "", /2 notes/);
    assert.equal(JSON.stringify(edge).includes("SECRET-A"), false);
    assert.equal(JSON.stringify(edge).includes("SECRET-B"), false);
    const alone = edge.noteFlags.find((flag) => flag.items.some((entry) => entry.verseKey === "36:1"));
    assert.equal(alone?.label, "");
    assert.equal(alone?.direct?.verseKey, "36:1");
  });

  it("keeps notes and bookmarks on separate tabs", () => {
    const edge = buildMushafEdge({
      notes: [note("n", "2:255", "throne")],
      bookmarks: [bookmark("b", "2:255", "Ayat al-Kursi", "2:255")],
    });
    assert.equal(edge.noteFlags.length, 1);
    assert.equal(edge.ribbons.length, 1);
    assert.equal(edge.noteFlags[0]?.items[0]?.kind, "note");
    assert.equal(edge.ribbons[0]?.items[0]?.kind, "bookmark");
    assert.equal(edge.ribbons[0]?.direct?.verseKey, "2:255");
    assert.match(edge.ribbons[0]?.tooltip.lines.join(" ") ?? "", /2:255/);
  });

  it("opens one place directly and lists several", () => {
    const single = buildMushafEdge({ highlights: [highlight("only", "18:10", "honey")], swatches });
    const bucket = single.buckets.find((item) => item.chapterIds.includes(18));
    assert.equal(bucket?.direct?.verseKey, "18:10");
    assert.equal(bucket?.choices.length, 0);
    assert.match(bucket?.tooltip.lines.join(" ") ?? "", /Honey 1/);

    const many = buildMushafEdge({
      highlights: [1, 2, 3, 4].map((ayah) => highlight(`h${ayah}`, `2:${ayah}`, ayah % 2 ? "honey" : "sky")),
      swatches,
    });
    const baqarah = many.buckets.find((item) => item.chapterIds.includes(2));
    assert.equal(baqarah?.direct, null);
    assert.ok((baqarah?.choices.length ?? 0) >= 2);
  });

  it("caps a long list and does not copy hidden note text into +N more", () => {
    const notes = Array.from({ length: 12 }, (_, index) =>
      note(`n${index + 1}`, `2:${index + 1}`, `Remember this ayah number ${index + 1} SECRET-${index + 1}`),
    );
    const edge = buildMushafEdge({ notes, maxNoteFlags: 4, minFlagGap: 1 });
    assert.ok(edge.noteFlags.length <= 4);
    assert.equal(
      edge.noteFlags.reduce((sum, flag) => sum + flag.items.length, 0),
      12,
    );
    const listed = edge.noteFlags.flatMap((flag) => flag.choices);
    const more = listed.find((choice) => choice.title.startsWith("+"));
    assert.ok(more);
    assert.equal(more?.preview, "");
    assert.equal(JSON.stringify(more).includes("SECRET"), false);
  });

  it("treats a reader with no marks as empty even when ayahs were read", () => {
    const edge = buildMushafEdge({ versesRead: ["1:1", "1:2", "1:3", "nope"] });
    assert.equal(edge.empty, true);
    assert.equal(edge.noteFlags.length, 0);
    assert.equal(edge.ribbons.length, 0);
    assert.equal(edge.bands[0]?.readRatio, 3 / 7);
    assert.equal(edge.totals.read, 3);
  });

  it("ignores a swatch colour that is not a hex", () => {
    const edge = buildMushafEdge({
      swatches: [{ id: "x", name: "Bad", color: "red; background: url(evil)" }],
      highlights: [highlight("a", "1:1", "x", "words")],
    });
    assert.equal(edge.legend[0]?.name, "Saved colour");
    assert.equal(edge.legend[0]?.color, "#C4B5FD");
    assert.equal(JSON.stringify(edge).includes("evil"), false);
  });
});

describe("clusterByPosition", () => {
  it("merges the closest pair until the cap, and keeps separated marks apart", () => {
    const spread = [0, 0.2, 0.4, 0.6, 0.8].map((position, index) => item(String(index), position));
    assert.equal(clusterByPosition(spread, { maxVisible: 8, minGap: 0.07 }).length, 5);
    const capped = clusterByPosition(spread, { maxVisible: 2, minGap: 0 });
    assert.equal(capped.length, 2);
    assert.equal(capped.reduce((sum, cluster) => sum + cluster.items.length, 0), 5);
    assert.ok(capped.some((cluster) => cluster.label.startsWith("+")));

    const piled = clusterByPosition([item("a", 0.1), item("b", 0.12), item("c", 0.5)], { maxVisible: 8, minGap: 0.07 });
    assert.equal(piled.length, 2);
    assert.equal(piled[0]?.label, "+2");
    assert.equal(piled[1]?.label, "");
  });
});

describe("placeFloating", () => {
  const viewport = { width: 800, height: 600 };
  const size = { width: 200, height: 80 };

  it("prefers above and flips below when the top is crowded", () => {
    const above = placeFloating({ top: 400, left: 300, width: 40, height: 20 }, size, viewport);
    assert.equal(above.placement, "above");
    assert.ok(above.top < 400);

    const below = placeFloating({ top: 4, left: 300, width: 40, height: 20 }, size, viewport);
    assert.equal(below.placement, "below");
    assert.ok(below.top >= 24);
  });

  it("clamps a wide layer to the viewport margin", () => {
    const placed = placeFloating({ top: 300, left: 0, width: 10, height: 10 }, { width: 900, height: 40 }, viewport);
    assert.equal(placed.left, 8);
    assert.ok(placed.left + Math.min(900, 800 - 16) <= viewport.width);
  });
});

describe("minShareForWidth", () => {
  it("uses a juz-sized default until the edge is measured", () => {
    assert.equal(minShareForWidth(0), 1 / 30);
    assert.equal(minShareForWidth(900), 28 / 900);
    assert.equal(minShareForWidth(10_000), 28 / 10_000);
    assert.equal(minShareForWidth(40), 0.25);
  });
});

describe("limitChoices", () => {
  it("folds the tail into one row without a preview", () => {
    const choices: EdgeChoice[] = Array.from({ length: 10 }, (_, index) => ({
      id: String(index),
      verseKey: `2:${index + 1}`,
      chapterId: 2,
      verseNumber: index + 1,
      title: `Al-Baqarah 2:${index + 1}`,
      detail: "Note",
      preview: `secret ${index}`,
    }));
    const listed = limitChoices(choices, 4);
    assert.equal(listed.length, 4);
    assert.equal(listed[3]?.title, "+7 more");
    assert.equal(listed[3]?.preview, "");
    assert.equal(listed[3]?.detail, "2:4 – 2:10");
  });
});
