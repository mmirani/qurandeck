import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultSwatches } from "../src/lib/highlights";
import {
  SWATCH_PRESETS,
  applySwatchDeletion,
  cleanSwatches,
  normalizeHex,
  reorderSwatch,
  resolveSwatch,
  swatchNameError,
  swatchesOrDefaults,
  washContrast,
} from "../src/lib/swatch-palette";
import type { Highlight, HighlightSwatch } from "../src/lib/quran/types";

function mark(id: string, swatchId: string): Highlight {
  return {
    id,
    verseKey: "1:1",
    layer: "ayah",
    swatchId,
    text: "opening",
    createdAt: "2026-11-13T00:00:00.000Z",
  };
}

describe("swatch palette", () => {
  it("keeps saved order and drops broken entries", () => {
    const cleaned = cleanSwatches([
      { id: "olive", name: "  Olive  ", color: "#6b8f71" },
      { id: "bad", name: "", color: "#ffffff" },
      { id: "amber", name: "Amber", color: "e8c872" },
      { id: "olive", name: "Duplicate", color: "#112233" },
    ]);
    assert.deepEqual(
      cleaned.map((item) => item.id),
      ["olive", "amber"],
    );
    assert.equal(cleaned[0]?.name, "Olive");
    assert.equal(cleaned[0]?.color, "#6B8F71");
    assert.equal(cleaned[1]?.color, "#E8C872");
  });

  it("rejects a missing, long, or duplicate name", () => {
    const pens: HighlightSwatch[] = [{ id: "yellow", name: "Yellow", color: "#F5D76E" }];
    assert.equal(swatchNameError(pens, "  "), "Name the colour.");
    assert.match(swatchNameError(pens, "x".repeat(25)) ?? "", /24/);
    assert.match(swatchNameError(pens, " yellow ") ?? "", /Yellow/);
    assert.equal(swatchNameError(pens, "Yellow", "yellow"), null);
    assert.equal(swatchNameError(pens, "Olive"), null);
  });

  it("reorders without changing the pens", () => {
    const moved = reorderSwatch(defaultSwatches, "pink", -1);
    assert.deepEqual(
      moved.map((item) => item.id),
      ["yellow", "green", "pink", "blue"],
    );
    assert.equal(reorderSwatch(defaultSwatches, "yellow", -1), defaultSwatches);
  });

  it("recolours highlights that use a deleted pen and keeps createdAt", () => {
    const pens = swatchesOrDefaults([]);
    const highlights = [mark("a", "yellow"), mark("b", "green")];
    const result = applySwatchDeletion(highlights, pens, "yellow", { kind: "recolor", toId: "green" });
    assert.equal(result.swatches.some((item) => item.id === "yellow"), false);
    assert.equal(result.highlights[0]?.swatchId, "green");
    assert.equal(result.highlights[0]?.createdAt, "2026-11-13T00:00:00.000Z");
    assert.equal(result.highlights[0]?.id, "a");
    assert.equal(result.highlights[1]?.swatchId, "green");
  });

  it("removes highlights that used a deleted pen", () => {
    const result = applySwatchDeletion([mark("a", "pink"), mark("b", "yellow")], defaultSwatches, "pink", {
      kind: "remove",
    });
    assert.deepEqual(
      result.highlights.map((item) => item.id),
      ["b"],
    );
    assert.equal(result.swatches.some((item) => item.id === "pink"), false);
  });

  it("restores the default pens when the last colour is removed", () => {
    const only = [{ id: "custom", name: "Olive", color: "#6B8F71" }];
    const result = applySwatchDeletion([], only, "custom", { kind: "remove" });
    assert.deepEqual(
      result.swatches.map((item) => item.id),
      defaultSwatches.map((item) => item.id),
    );
  });

  it("falls back when a highlight names a missing colour", () => {
    const resolved = resolveSwatch(defaultSwatches, "missing");
    assert.equal(resolved.missing, true);
    assert.equal(resolved.swatch.id, "yellow");
    assert.equal(resolveSwatch(defaultSwatches, "pink").missing, false);
  });

  it("accepts the shared presets and warns on a wash that fails 4.5:1", () => {
    for (const preset of SWATCH_PRESETS) {
      assert.equal(washContrast(preset.color).passes, true, preset.name);
    }
    for (const pen of defaultSwatches) {
      assert.equal(washContrast(pen.color).passes, true, pen.name);
    }
    const white = washContrast("#FFFFFF");
    assert.equal(white.passes, false);
    assert.ok(white.ratio < 4.5);
    assert.equal(normalizeHex("fff"), "#FFFFFF");
    assert.equal(normalizeHex("nope"), null);
  });
});
