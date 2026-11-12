import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TOUR_MARGIN,
  clampTourHole,
  placeTourCard,
  presentTourStep,
  tourShadePanes,
  type TourHole,
  type TourViewport,
} from "../src/lib/guide/placement";

function edge(viewport: TourViewport, side: "left" | "right" | "top" | "bottom") {
  const safeLeft = Math.max(TOUR_MARGIN, viewport.safeLeft ?? 0);
  const safeRight = Math.max(TOUR_MARGIN, viewport.safeRight ?? 0);
  const safeTop = Math.max(TOUR_MARGIN, viewport.safeTop ?? 0);
  const safeBottom = Math.max(TOUR_MARGIN, viewport.safeBottom ?? 0);
  const originX = viewport.offsetLeft ?? 0;
  const originY = viewport.offsetTop ?? 0;
  if (side === "left") return originX + safeLeft;
  if (side === "right") return originX + viewport.width - safeRight;
  if (side === "top") return originY + safeTop;
  return originY + viewport.height - safeBottom;
}

function assertInside(viewport: TourViewport, hole: TourHole | null, cardHeight: number) {
  const box = placeTourCard(viewport, hole, cardHeight);
  assert.ok(box.width > 0, "width");
  assert.ok(box.height > 0, "height");
  assert.ok(box.left >= edge(viewport, "left") - 0.01, `left ${box.left}`);
  assert.ok(box.left + box.width <= edge(viewport, "right") + 0.01, `right ${box.left + box.width}`);
  assert.ok(box.top >= edge(viewport, "top") - 0.01, `top ${box.top}`);
  assert.ok(box.top + box.height <= edge(viewport, "bottom") + 0.01, `bottom ${box.top + box.height}`);
  return box;
}

describe("tour card clamp", () => {
  it("pins a targetless card inside a 390px phone instead of starting at 50%", () => {
    const viewport = { width: 390, height: 844 };
    const box = assertInside(viewport, null, 240);
    assert.equal(box.placement, "sheet");
    assert.equal(box.left, TOUR_MARGIN);
    assert.equal(box.width, 390 - TOUR_MARGIN * 2);
    assert.equal(box.top + box.height, 844 - TOUR_MARGIN);
    assert.ok(box.left < viewport.width / 2, "left edge stays left of center");
  });

  it("keeps the card inside 320, 390, and 430 widths for holes on every edge", () => {
    const holes: Array<TourHole | null> = [
      null,
      { left: -40, top: -20, width: 80, height: 36 },
      { left: 360, top: 120, width: 90, height: 44 },
      { left: 24, top: 760, width: 140, height: 48 },
      { left: 80, top: 280, width: 64, height: 40 },
    ];
    for (const width of [320, 390, 430]) {
      for (const hole of holes) {
        assertInside({ width, height: 844, safeTop: 47, safeBottom: 34 }, hole, 260);
      }
    }
  });

  it("clears the safe area and the 16px margin", () => {
    const viewport = { width: 390, height: 844, safeTop: 47, safeRight: 0, safeBottom: 34, safeLeft: 12 };
    const box = assertInside(viewport, null, 200);
    assert.equal(box.left, 16);
    assert.equal(box.top + box.height, 844 - 34);
    assert.ok(box.top >= 47);
  });

  it("shifts with the visual viewport so the iOS toolbar does not cover the card", () => {
    const viewport = { width: 390, height: 560, offsetTop: 120, offsetLeft: 0 };
    const box = assertInside(viewport, null, 200);
    assert.ok(box.top >= 120 + TOUR_MARGIN);
    assert.ok(box.top + box.height <= 120 + 560 - TOUR_MARGIN);
  });

  it("places a desktop card below a top target and above a bottom target", () => {
    const viewport = { width: 1280, height: 800 };
    const below = assertInside(viewport, { left: 420, top: 72, width: 220, height: 48 }, 200);
    assert.equal(below.placement, "below");
    assert.equal(below.width, 360);
    assert.ok(below.top >= 72 + 48);
    assert.ok(below.left >= TOUR_MARGIN);
    assert.ok(below.left + below.width <= 1280 - TOUR_MARGIN);

    const above = assertInside(viewport, { left: 180, top: 680, width: 160, height: 48 }, 200);
    assert.equal(above.placement, "above");
    assert.ok(above.top + above.height <= 680);
  });

  it("centers a targetless desktop card inside the margins", () => {
    const box = assertInside({ width: 1280, height: 800 }, null, 220);
    assert.equal(box.placement, "center");
    assert.equal(box.left, TOUR_MARGIN + (1280 - TOUR_MARGIN * 2 - 360) / 2);
  });

  it("shrinks a card that is taller than the visible area", () => {
    const box = assertInside({ width: 390, height: 500, safeBottom: 40 }, null, 900);
    assert.equal(box.height, 500 - Math.max(TOUR_MARGIN, 40) - TOUR_MARGIN);
    assert.equal(box.top, TOUR_MARGIN);
  });

  it("clamps a spotlight that starts off the right edge", () => {
    const hole = clampTourHole({ left: 370, top: 40, width: 80, height: 36 }, { width: 390, height: 844 });
    assert.ok(hole);
    assert.ok(hole.left + hole.width <= 390);
    assert.ok(hole.width >= 8);
  });

  it("covers the visual viewport when there is no spotlight", () => {
    const panes = tourShadePanes(null, { width: 390, height: 700, offsetTop: 80 });
    assert.equal(panes.length, 1);
    assert.equal(panes[0].top, 80);
    assert.equal(panes[0].height, 700);
    assert.equal(panes[0].width, 390);
  });
});

describe("tour step adaptation", () => {
  const step = {
    target: "ayah",
    mobileTarget: "ayah-mobile",
    title: "Each ayah can do more",
    body: "Desktop actions.",
    mobileBody: "Tap an ayah, then the action button.",
  };

  it("keeps the desktop target when it is on screen", () => {
    const shown = presentTourStep(step, { primaryVisible: true, mobileVisible: true, narrow: false });
    assert.equal(shown.target, "ayah");
    assert.equal(shown.body, "Desktop actions.");
  });

  it("points at the mobile control when the desktop target is hidden", () => {
    const shown = presentTourStep(step, { primaryVisible: false, mobileVisible: true, narrow: true });
    assert.equal(shown.target, "ayah-mobile");
    assert.equal(shown.body, "Tap an ayah, then the action button.");
  });

  it("drops the spotlight on a phone when neither control is visible", () => {
    const shown = presentTourStep(step, { primaryVisible: false, mobileVisible: false, narrow: true });
    assert.equal(shown.target, undefined);
    assert.match(shown.body, /action button/);
  });
});
