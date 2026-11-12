/** Safe gap between the tour card and the viewport edge, before safe-area insets. */
export const TOUR_MARGIN = 16;

/** Widths at or below this use a full-width card. Wider screens keep a floating card. */
export const TOUR_NARROW_MAX = 640;

const DESKTOP_CARD_WIDTH = 360;
const GAP = 12;

export type TourViewport = {
  width: number;
  height: number;
  offsetLeft?: number;
  offsetTop?: number;
  safeTop?: number;
  safeRight?: number;
  safeBottom?: number;
  safeLeft?: number;
};

export type TourHole = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type TourPlacement = "below" | "above" | "sheet" | "center";

export type TourCardBox = {
  left: number;
  top: number;
  width: number;
  height: number;
  placement: TourPlacement;
};

export type TourShade = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

function inset(value: number | undefined) {
  return Math.max(TOUR_MARGIN, value ?? 0);
}

function clamp(value: number, min: number, max: number) {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

/** Visible box the card must stay inside, including safe-area insets and the 16px margin. */
export function tourBounds(viewport: TourViewport): Bounds {
  const left = (viewport.offsetLeft ?? 0) + inset(viewport.safeLeft);
  const top = (viewport.offsetTop ?? 0) + inset(viewport.safeTop);
  const right = (viewport.offsetLeft ?? 0) + viewport.width - inset(viewport.safeRight);
  const bottom = (viewport.offsetTop ?? 0) + viewport.height - inset(viewport.safeBottom);
  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

export function isNarrowTour(viewport: TourViewport) {
  return viewport.width <= TOUR_NARROW_MAX;
}

/**
 * Keep a spotlight inside the visible viewport.
 * Coordinates are layout-viewport pixels (client rect plus visualViewport offset).
 */
export function clampTourHole(rect: TourHole, viewport: TourViewport, pad = 8): TourHole | null {
  if (rect.width < 8 || rect.height < 8) return null;
  const minLeft = viewport.offsetLeft ?? 0;
  const minTop = viewport.offsetTop ?? 0;
  const maxRight = minLeft + viewport.width;
  const maxBottom = minTop + viewport.height;
  const left = clamp(rect.left - pad, minLeft, maxRight);
  const top = clamp(rect.top - pad, minTop, maxBottom);
  const right = clamp(rect.left + rect.width + pad, minLeft, maxRight);
  const bottom = clamp(rect.top + rect.height + pad, minTop, maxBottom);
  const width = right - left;
  const height = bottom - top;
  if (width < 8 || height < 8) return null;
  return { left, top, width, height };
}

function place(bounds: Bounds, left: number, top: number, width: number, height: number, placement: TourPlacement): TourCardBox {
  const clampedLeft = clamp(left, bounds.left, Math.max(bounds.left, bounds.right - width));
  const clampedTop = clamp(top, bounds.top, Math.max(bounds.top, bounds.bottom - height));
  return { left: clampedLeft, top: clampedTop, width, height, placement };
}

/**
 * Position the tour card so it stays inside the viewport.
 * Narrow screens prefer a full-width card above or below the target, or a bottom sheet.
 * The result never uses a percentage left plus a CSS transform (motion overwrites transforms).
 */
export function placeTourCard(viewport: TourViewport, hole: TourHole | null, cardHeight: number): TourCardBox {
  const bounds = tourBounds(viewport);
  const narrow = isNarrowTour(viewport);
  const width = narrow ? bounds.width : Math.min(DESKTOP_CARD_WIDTH, bounds.width);
  const height = Math.min(Math.max(cardHeight, 0), bounds.height);
  const sheet = () => place(bounds, bounds.left, bounds.bottom - height, width, height, "sheet");

  if (!hole) {
    if (narrow) return sheet();
    const left = bounds.left + Math.max(0, (bounds.width - width) / 2);
    const slack = Math.max(0, bounds.height - height);
    const top = bounds.top + Math.min(96, Math.round(slack * 0.16));
    return place(bounds, left, top, width, height, "center");
  }

  const spaceAbove = hole.top - GAP - bounds.top;
  const spaceBelow = bounds.bottom - (hole.top + hole.height) - GAP;
  const left = narrow ? bounds.left : hole.left;

  if (spaceBelow >= height) {
    return place(bounds, left, hole.top + hole.height + GAP, width, height, "below");
  }
  if (spaceAbove >= height) {
    return place(bounds, left, hole.top - GAP - height, width, height, "above");
  }
  if (narrow || spaceBelow >= spaceAbove) return sheet();
  return place(bounds, left, bounds.top, width, height, "above");
}

/** Dim panes around a spotlight. A missing hole dims the whole visual viewport. */
export function tourShadePanes(hole: TourHole | null, viewport: TourViewport): TourShade[] {
  const left = viewport.offsetLeft ?? 0;
  const top = viewport.offsetTop ?? 0;
  const width = Math.max(0, viewport.width);
  const height = Math.max(0, viewport.height);
  if (!hole) return [{ left, top, width, height }];
  const holeRight = hole.left + hole.width;
  const holeBottom = hole.top + hole.height;
  return [
    { left, top, width, height: Math.max(0, hole.top - top) },
    { left, top: hole.top, width: Math.max(0, hole.left - left), height: Math.max(0, hole.height) },
    { left: holeRight, top: hole.top, width: Math.max(0, left + width - holeRight), height: Math.max(0, hole.height) },
    { left, top: holeBottom, width, height: Math.max(0, top + height - holeBottom) },
  ];
}

export type TourStepCopy = {
  target?: string;
  mobileTarget?: string;
  title: string;
  body: string;
  mobileBody?: string;
};

/** Use the on-screen control. When the desktop target is hidden, switch to the mobile one. */
export function presentTourStep(
  step: TourStepCopy,
  flags: { primaryVisible: boolean; mobileVisible: boolean; narrow: boolean },
): { target?: string; title: string; body: string } {
  if (!step.target || flags.primaryVisible) {
    return { target: step.target, title: step.title, body: step.body };
  }
  if (step.mobileTarget && flags.mobileVisible) {
    return { target: step.mobileTarget, title: step.title, body: step.mobileBody ?? step.body };
  }
  if (flags.narrow && step.mobileBody) {
    return { target: undefined, title: step.title, body: step.mobileBody };
  }
  return { target: undefined, title: step.title, body: step.body };
}
