import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMushafEdge } from "../src/lib/mushaf-edge";
import {
  FORE_EDGE,
  THREE_QUARTER,
  ZOOM_FULLSCREEN_MAX,
  ZOOM_MAX,
  ZOOM_MIN,
  PAN_BOUNDS_NONE,
  PAN_MIN_VISIBLE_PX,
  PAN_ORIGIN,
  canPan,
  clampPan,
  keyboardPanDelta,
  maxZoomForView,
  panBoundsFromRects,
  panBy,
  shouldResetPan,
  YAW_GIVE,
  YAW_MAX,
  YAW_MIN,
  PITCH_GIVE,
  PITCH_MAX,
  PITCH_MIN,
  FIT_MAX,
  FIT_SHARE,
  dragTurn,
  fitScale,
  heldPose,
  softLimit,
  angleOf,
  clampPose,
  colourShown,
  defaultPose,
  dragPose,
  filterMushafInput,
  ignoresMushafKeys,
  keyboardTurnDirection,
  keyboardZoomSteps,
  resetZoom,
  scrubberLabel,
  surahAtShare,
  tableShadowSpan,
  toggleBookmarks,
  toggleColour,
  toggleNotes,
  turnBy,
  withAngle,
  zoomBySteps,
  zoomFromWheel,
  zoomLabel,
  type ExploreFilter,
} from "../src/lib/mushaf-explore";
import { TOTAL_AYAHS } from "../src/lib/reading";
import type { Bookmark, Highlight, HighlightSwatch, Note } from "../src/lib/quran/types";

const swatches: HighlightSwatch[] = [
  { id: "honey", name: "Honey", color: "#f5d76e" },
  { id: "sky", name: "Sky", color: "#7dd3fc" },
];

function highlight(id: string, verseKey: string, swatchId: string): Highlight {
  return { id, verseKey, layer: "ayah", swatchId, text: "SECRET", createdAt: "2026-01-01T00:00:00.000Z" };
}

function note(id: string, verseKey: string, body: string): Note {
  return { id, verseKey, body, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
}

function bookmark(id: string, verseKey: string, label: string): Bookmark {
  return { id, type: "verse", verseKey, label, createdAt: "2026-01-01T00:00:00.000Z" };
}

const openFilter: ExploreFilter = { hiddenColourIds: [], showNotes: true, showBookmarks: true };

describe("mushaf pose", () => {
  it("starts at the three-quarter angle, seated, at full size", () => {
    const pose = defaultPose();
    assert.equal(pose.yaw, THREE_QUARTER.yaw);
    assert.equal(pose.pitch, THREE_QUARTER.pitch);
    assert.equal(pose.zoom, 1);
    assert.equal(angleOf(pose), "three-quarter");
  });

  it("looks straight at the fore-edge without changing zoom", () => {
    const zoomed = zoomBySteps(defaultPose(), 2);
    const edge = withAngle(zoomed, "fore-edge");
    assert.equal(edge.yaw, FORE_EDGE.yaw);
    assert.equal(edge.pitch, FORE_EDGE.pitch);
    assert.equal(edge.zoom, zoomed.zoom);
    assert.equal(angleOf(edge), "fore-edge");
    assert.equal(angleOf(withAngle(edge, "three-quarter")), "three-quarter");
  });

  it("zooms by a quarter turn of the buttons and clamps at the stops", () => {
    assert.equal(zoomBySteps(defaultPose(), 1).zoom, 1.25);
    assert.equal(zoomBySteps(defaultPose(), -1).zoom, ZOOM_MIN);
    const topped = zoomBySteps({ ...defaultPose(), zoom: ZOOM_MAX }, 4);
    assert.equal(topped.zoom, ZOOM_MAX);
    assert.equal(zoomLabel(1.25), "125%");
    assert.equal(resetZoom(topped).zoom, 1);
    assert.equal(resetZoom(topped).yaw, THREE_QUARTER.yaw);
  });

  it("treats scroll-down as zoom out and scroll-up as zoom in", () => {
    const close = { ...defaultPose(), zoom: 2 };
    const out = zoomFromWheel(close, 120);
    const inn = zoomFromWheel(close, -120);
    assert.ok(out.zoom < close.zoom);
    assert.ok(inn.zoom > close.zoom);
    assert.equal(zoomFromWheel(defaultPose(), 400).zoom, ZOOM_MIN);
    assert.equal(zoomFromWheel({ ...defaultPose(), zoom: ZOOM_MAX }, -800).zoom, ZOOM_MAX);
    assert.equal(zoomFromWheel(close, 0).zoom, 2);
  });

  it("turns with the drag and will not tip off the table", () => {
    const right = dragPose(defaultPose(), 100, 0);
    assert.ok(right.yaw > THREE_QUARTER.yaw);
    const left = dragPose(defaultPose(), -200, 0);
    assert.ok(left.yaw < THREE_QUARTER.yaw);
    assert.ok(left.yaw >= YAW_MIN);
    const shoved = dragPose(defaultPose(), 10_000, 10_000);
    assert.equal(shoved.yaw, YAW_MAX);
    assert.equal(shoved.pitch, PITCH_MAX);
    const dropped = dragPose(defaultPose(), 0, -10_000);
    assert.equal(dropped.pitch, PITCH_MIN);
    assert.equal(dragPose(defaultPose(), Number.NaN, Number.NaN).yaw, THREE_QUARTER.yaw);
  });

  it("keeps the turn to a believable range: never the back board or the underside", () => {
    assert.ok(YAW_MIN >= FORE_EDGE.yaw, "no further than the fore-edge seen square on");
    assert.ok(YAW_MAX <= 10, "only a touch toward the spine");
    assert.ok(PITCH_MAX <= 0, "never tilted up to show the underside");
    assert.ok(PITCH_MIN >= -10);
    for (const preset of [THREE_QUARTER, FORE_EDGE]) {
      assert.ok(preset.yaw >= YAW_MIN && preset.yaw <= YAW_MAX);
      assert.ok(preset.pitch >= PITCH_MIN && preset.pitch <= PITCH_MAX);
    }
  });

  it("gives a little past a limit while held, then settles back", () => {
    assert.equal(softLimit(-40, YAW_MIN, YAW_MAX, YAW_GIVE), -40);
    const pushed = softLimit(YAW_MIN - 5, YAW_MIN, YAW_MAX, YAW_GIVE);
    const shoved = softLimit(YAW_MIN - 500, YAW_MIN, YAW_MAX, YAW_GIVE);
    assert.ok(pushed < YAW_MIN && pushed > YAW_MIN - YAW_GIVE);
    assert.ok(shoved < pushed && shoved >= YAW_MIN - YAW_GIVE);
    let turn: { yaw: number; pitch: number } = { yaw: THREE_QUARTER.yaw, pitch: THREE_QUARTER.pitch };
    for (let i = 0; i < 50; i += 1) turn = dragTurn(turn, 200, 40);
    const held = heldPose(turn, 1);
    assert.ok(held.yaw > YAW_MAX && held.yaw <= YAW_MAX + YAW_GIVE);
    assert.ok(held.pitch > PITCH_MAX && held.pitch <= PITCH_MAX + PITCH_GIVE);
    const settled = clampPose(held);
    assert.equal(settled.yaw, YAW_MAX);
    assert.equal(settled.pitch, PITCH_MAX);
  });

  it("fits the whole book into the stage along its tighter side", () => {
    const natural = { width: 300, height: 380 };
    const wide = fitScale({ width: 1440, height: 600 }, natural);
    assert.ok(Math.abs(wide - (600 * FIT_SHARE) / 380) < 0.002);
    const tall = fitScale({ width: 400, height: 1200 }, natural);
    assert.ok(Math.abs(tall - (400 * FIT_SHARE) / 300) < 0.002);
    assert.equal(fitScale({ width: 0, height: 0 }, natural), 1);
    assert.equal(fitScale({ width: 100_000, height: 100_000 }, natural), FIT_MAX);
  });

  it("steps yaw from the arrow keys and stops at the fore-edge side", () => {
    assert.equal(keyboardTurnDirection("ArrowLeft"), -1);
    assert.equal(keyboardTurnDirection("ArrowRight"), 1);
    assert.equal(keyboardTurnDirection("ArrowUp"), null);
    assert.equal(keyboardZoomSteps("+"), 1);
    assert.equal(keyboardZoomSteps("="), 1);
    assert.equal(keyboardZoomSteps("-"), -1);
    assert.equal(keyboardZoomSteps("_"), -1);
    assert.equal(keyboardZoomSteps("ArrowLeft"), null);
    const towardEdge = turnBy(defaultPose(), -1);
    assert.equal(towardEdge.yaw, THREE_QUARTER.yaw - 8);
    assert.equal(turnBy({ ...defaultPose(), yaw: YAW_MIN }, -1).yaw, YAW_MIN);
  });

  it("keeps the contact shadow under the book at both presets", () => {
    const threeQuarter = tableShadowSpan(THREE_QUARTER.yaw);
    const fore = tableShadowSpan(FORE_EDGE.yaw);
    assert.ok(Math.abs(threeQuarter - 0.92) < 0.01);
    assert.ok(Math.abs(fore - 0.24) < 0.001);
    assert.ok(fore < threeQuarter);
    assert.equal(tableShadowSpan(0), 1);
  });

  it("repairs a pose that would float or flip", () => {
    const fixed = clampPose({ yaw: -400, pitch: 80, zoom: 9 });
    assert.equal(fixed.yaw, YAW_MIN);
    assert.equal(fixed.pitch, PITCH_MAX);
    assert.equal(fixed.zoom, ZOOM_MAX);
    assert.equal(clampPose({ yaw: 0, pitch: -8, zoom: Number.NaN }).zoom, ZOOM_MIN);
  });

  it("lets the close-up go to 260% and full screen go further", () => {
    assert.equal(ZOOM_MAX, 2.6);
    assert.equal(zoomLabel(2.6), "260%");
    assert.equal(maxZoomForView(false), ZOOM_MAX);
    assert.equal(maxZoomForView(true), ZOOM_FULLSCREEN_MAX);
    assert.equal(zoomBySteps({ ...defaultPose(), zoom: 2.5 }, 1).zoom, ZOOM_MAX);
    assert.equal(zoomBySteps({ ...defaultPose(), zoom: 2.5 }, 4, ZOOM_FULLSCREEN_MAX).zoom, 3.5);
    assert.equal(clampPose({ ...defaultPose(), zoom: 4 }, ZOOM_FULLSCREEN_MAX).zoom, 4);
    assert.equal(clampPose({ ...defaultPose(), zoom: 4 }).zoom, ZOOM_MAX);
  });
});

describe("mushaf pan", () => {
  const stage = { left: 0, right: 800, top: 0, bottom: 500 };
  const zoomedBook = { left: -100, right: 900, top: -80, bottom: 620 };

  it("only pans once the book is zoomed in", () => {
    assert.equal(canPan(1), false);
    assert.equal(canPan(2.6), true);
  });

  it("clamps so the book cannot leave the stage", () => {
    const bounds = panBoundsFromRects(stage, zoomedBook, PAN_ORIGIN, 2.6);
    assert.ok(bounds.minX < 0);
    assert.ok(bounds.maxX > 0);
    const corner = clampPan({ x: -10_000, y: -10_000 }, bounds);
    const restBook = {
      left: zoomedBook.left + corner.x,
      right: zoomedBook.right + corner.x,
      top: zoomedBook.top + corner.y,
      bottom: zoomedBook.bottom + corner.y,
    };
    assert.ok(restBook.right >= stage.left + PAN_MIN_VISIBLE_PX - 0.5);
    assert.ok(restBook.bottom >= stage.top + PAN_MIN_VISIBLE_PX - 0.5);
    const other = clampPan({ x: 10_000, y: 10_000 }, bounds);
    assert.equal(other.x, bounds.maxX);
    assert.equal(other.y, bounds.maxY);
    assert.deepEqual(panBy(PAN_ORIGIN, 40, -20, { minX: -50, maxX: 50, minY: -50, maxY: 50 }), { x: 40, y: -20 });
    assert.deepEqual(panBy(PAN_ORIGIN, 80, 0, { minX: -10, maxX: 10, minY: 0, maxY: 0 }), { x: 10, y: 0 });
  });

  it("gives no room to pan at rest zoom", () => {
    assert.deepEqual(panBoundsFromRects(stage, zoomedBook, PAN_ORIGIN, 1), PAN_BOUNDS_NONE);
    assert.deepEqual(clampPan({ x: 20, y: -15 }, PAN_BOUNDS_NONE), PAN_ORIGIN);
  });

  it("moves with the arrow keys and resets when the angle changes or zoom returns to rest", () => {
    assert.deepEqual(keyboardPanDelta("ArrowLeft"), { x: -48, y: 0 });
    assert.deepEqual(keyboardPanDelta("ArrowRight"), { x: 48, y: 0 });
    assert.deepEqual(keyboardPanDelta("ArrowUp"), { x: 0, y: -48 });
    assert.deepEqual(keyboardPanDelta("ArrowDown"), { x: 0, y: 48 });
    assert.equal(keyboardPanDelta("+"), null);
    assert.equal(shouldResetPan(2.6, 2.7, false), false);
    assert.equal(shouldResetPan(2.6, 1, false), true);
    assert.equal(shouldResetPan(2.6, 2.6, true), true);
    assert.equal(shouldResetPan(1, 1, false), false);
  });
});

describe("explore filter", () => {
  const input = {
    swatches,
    highlights: [highlight("a", "2:1", "honey"), highlight("b", "2:2", "sky"), highlight("c", "36:1", "honey")],
    notes: [note("n", "2:10", "remember the throne verse SECRET")],
    bookmarks: [bookmark("m", "36:1", "Ya-Sin")],
    names: [
      { id: 2, name: "Al-Baqarah" },
      { id: 36, name: "Ya-Sin" },
    ],
  };

  it("hides one named colour and leaves the other stripes", () => {
    const hidden = toggleColour(openFilter, "honey");
    assert.equal(colourShown(hidden, "honey"), false);
    assert.equal(colourShown(hidden, "sky"), true);
    const edge = buildMushafEdge(filterMushafInput(input, hidden));
    const baqarah = edge.bands.find((band) => band.chapterId === 2);
    assert.equal(baqarah?.colors.some((color) => color.name === "Honey"), false);
    assert.equal(baqarah?.colors.find((color) => color.name === "Sky")?.count, 1);
    assert.equal(edge.noteFlags.length, 1);
    assert.equal(edge.ribbons.length, 1);
    assert.deepEqual(toggleColour(hidden, "honey").hiddenColourIds, []);
  });

  it("hides notes and bookmarks without moving surahs", () => {
    const marksOff = toggleBookmarks(toggleNotes(openFilter));
    assert.equal(marksOff.showNotes, false);
    assert.equal(marksOff.showBookmarks, false);
    const full = buildMushafEdge(input);
    const edge = buildMushafEdge(filterMushafInput(input, marksOff));
    assert.equal(edge.noteFlags.length, 0);
    assert.equal(edge.ribbons.length, 0);
    assert.equal(edge.bands.length, full.bands.length);
    assert.equal(edge.bands[1]?.start, full.bands[1]?.start);
    assert.equal(JSON.stringify(edge).includes("SECRET"), false);
  });
});

describe("page scrubber", () => {
  const bands = buildMushafEdge().bands;

  it("reads Al-Fatihah at the front cover and An-Nas at the back", () => {
    const first = surahAtShare(bands, 0);
    const last = surahAtShare(bands, 1);
    assert.equal(first?.chapterId, 1);
    assert.equal(last?.chapterId, 114);
    assert.equal(scrubberLabel(first), "Al-Fatihah · 1:1 – 1:7");
    assert.equal(scrubberLabel(last), "An-Nas · 114:1 – 114:6");
    const baqarah = surahAtShare(bands, 7 / TOTAL_AYAHS + 0.001);
    assert.equal(baqarah?.chapterId, 2);
    assert.match(scrubberLabel(baqarah), /^Al-Baqarah · 2:1 – 2:286$/);
  });

  it("clamps a share that falls outside the book", () => {
    assert.equal(surahAtShare(bands, -3)?.chapterId, 1);
    assert.equal(surahAtShare(bands, 4)?.chapterId, 114);
    assert.equal(surahAtShare(bands, Number.NaN)?.chapterId, 1);
    assert.equal(surahAtShare([], 0.4), null);
    assert.equal(scrubberLabel(null), "Pages");
  });
});

describe("ignoresMushafKeys", () => {
  it("does not treat a missing target as a text field", () => {
    assert.equal(ignoresMushafKeys(null), false);
  });
});
