import type { MushafEdgeInput, SurahBand } from "@/lib/mushaf-edge";

/**
 * Closed-book camera.
 * Yaw matches the card: -40° is the three-quarter view, -90° looks straight at the fore-edge.
 * Pitch stays near the table so the cover never lifts off its shadow.
 * `--d: calc(var(--w) * 0.24)` in the book CSS is the same depth ratio.
 */
export const MUSHAF_DEPTH_RATIO = 0.24;

export const THREE_QUARTER = { yaw: -40, pitch: -8 } as const;
export const FORE_EDGE = { yaw: -90, pitch: 0 } as const;

export const DEFAULT_ZOOM = 1;
export const ZOOM_MIN = 1;
/** Highest zoom in the windowed close-up, including 260%. */
export const ZOOM_MAX = 2.6;
/** Highest zoom when the close-up is full screen. */
export const ZOOM_FULLSCREEN_MAX = 4;
export const ZOOM_STEP = 0.25;

/**
 * A believable turn, as if lifting the book in your hands on the desk: from a touch
 * toward the spine, past the three-quarter view, to the fore-edge seen square on.
 * Any further and the back board comes into view, so that is where it stops; no tilt
 * shows the underside either.
 */
export const YAW_MIN = -90;
export const YAW_MAX = 8;
export const PITCH_MIN = -10;
export const PITCH_MAX = 0;
export const YAW_STEP = 8;
/** While a drag is held past a limit, the book gives at most this much more, then stops. */
export const YAW_GIVE = 1.5;
export const PITCH_GIVE = 1.5;

/** Share of the stage the fitted book fills along its tighter side. */
export const FIT_SHARE = 0.88;
export const FIT_MIN = 0.4;
export const FIT_MAX = 6;

/** Degrees the book turns per pixel of a horizontal drag. */
export const DRAG_YAW_PER_PX = 0.4;
/** Degrees of lean per pixel of a vertical drag. Kept small so the book stays seated. */
export const DRAG_PITCH_PER_PX = 0.08;

/** Ignore jitter smaller than this before a pointer move becomes a pan or a turn. */
export const PAN_DRAG_THRESHOLD_PX = 8;
/** Arrow-key pan distance, in pixels. */
export const PAN_KEYBOARD_STEP = 48;
/** Keep at least this many pixels of the book in the stage. */
export const PAN_MIN_VISIBLE_PX = 96;

export type MushafPose = {
  yaw: number;
  pitch: number;
  zoom: number;
};

export type MushafPan = {
  x: number;
  y: number;
};

export type PanBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export const PAN_ORIGIN: MushafPan = { x: 0, y: 0 };

export const PAN_BOUNDS_NONE: PanBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

export type MushafAngle = "three-quarter" | "fore-edge";

export type ExploreFilter = {
  /** Swatch ids whose stripes are hidden. Empty shows every colour. */
  hiddenColourIds: readonly string[];
  showNotes: boolean;
  showBookmarks: boolean;
};

export const EXPLORE_FILTER_ALL: ExploreFilter = {
  hiddenColourIds: [],
  showNotes: true,
  showBookmarks: true,
};

export function defaultPose(): MushafPose {
  return { yaw: THREE_QUARTER.yaw, pitch: THREE_QUARTER.pitch, zoom: DEFAULT_ZOOM };
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function roundZoom(zoom: number) {
  return Math.round(zoom * 100) / 100;
}

export function maxZoomForView(fullscreen: boolean): number {
  return fullscreen ? ZOOM_FULLSCREEN_MAX : ZOOM_MAX;
}

export function clampPose(pose: MushafPose, maxZoom = ZOOM_MAX): MushafPose {
  return {
    yaw: clamp(pose.yaw, YAW_MIN, YAW_MAX),
    pitch: clamp(pose.pitch, PITCH_MIN, PITCH_MAX),
    zoom: roundZoom(clamp(pose.zoom, ZOOM_MIN, maxZoom)),
  };
}

export function zoomBySteps(pose: MushafPose, steps: number, maxZoom = ZOOM_MAX): MushafPose {
  if (!Number.isFinite(steps) || steps === 0) return clampPose(pose, maxZoom);
  return clampPose({ ...pose, zoom: pose.zoom + steps * ZOOM_STEP }, maxZoom);
}

/** Scroll down and pinch-out zoom out. Scroll up and pinch-in zoom in. */
export function zoomFromWheel(pose: MushafPose, deltaY: number, maxZoom = ZOOM_MAX): MushafPose {
  if (!Number.isFinite(deltaY) || deltaY === 0) return clampPose(pose, maxZoom);
  return clampPose({ ...pose, zoom: pose.zoom * Math.exp(-deltaY / 280) }, maxZoom);
}

export function resetZoom(pose: MushafPose, maxZoom = ZOOM_MAX): MushafPose {
  return clampPose({ ...pose, zoom: DEFAULT_ZOOM }, maxZoom);
}

export function withAngle(pose: MushafPose, angle: MushafAngle, maxZoom = ZOOM_MAX): MushafPose {
  const next = angle === "fore-edge" ? FORE_EDGE : THREE_QUARTER;
  return clampPose({ ...pose, yaw: next.yaw, pitch: next.pitch }, maxZoom);
}

export function turnBy(pose: MushafPose, direction: -1 | 1, maxZoom = ZOOM_MAX): MushafPose {
  return clampPose({ ...pose, yaw: pose.yaw + direction * YAW_STEP }, maxZoom);
}

/**
 * Drag right turns the cover with the hand (yaw increases, toward a front-on view).
 * Drag down eases the lean back toward upright.
 * The result is hard-clamped. During a held drag use `dragTurn` and `heldPose` instead.
 */
export function dragPose(pose: MushafPose, dx: number, dy: number, maxZoom = ZOOM_MAX): MushafPose {
  return clampPose({ ...pose, ...dragTurn(pose, dx, dy) }, maxZoom);
}

export type MushafTurn = { yaw: number; pitch: number };

/** Unclamped turn that follows the hand. The drag keeps this and shows `heldPose`. */
export function dragTurn(turn: MushafTurn, dx: number, dy: number): MushafTurn {
  const safeX = Number.isFinite(dx) ? dx : 0;
  const safeY = Number.isFinite(dy) ? dy : 0;
  const yaw = Number.isFinite(turn.yaw) ? turn.yaw : THREE_QUARTER.yaw;
  const pitch = Number.isFinite(turn.pitch) ? turn.pitch : THREE_QUARTER.pitch;
  return { yaw: yaw + safeX * DRAG_YAW_PER_PX, pitch: pitch + safeY * DRAG_PITCH_PER_PX };
}

/**
 * Past a limit the book resists: it gives a little, easing toward `give`, and never more.
 * Inside the range the value passes through unchanged.
 */
export function softLimit(value: number, min: number, max: number, give: number): number {
  if (!Number.isFinite(value)) return min;
  if (value > max) return max + give * (1 - Math.exp(-(value - max) / (give * 3)));
  if (value < min) return min - give * (1 - Math.exp(-(min - value) / (give * 3)));
  return value;
}

/** Pose shown while a turn is held. Release with `clampPose` and it settles to the limit. */
export function heldPose(turn: MushafTurn, zoom: number, maxZoom = ZOOM_MAX): MushafPose {
  return {
    yaw: softLimit(turn.yaw, YAW_MIN, YAW_MAX, YAW_GIVE),
    pitch: softLimit(turn.pitch, PITCH_MIN, PITCH_MAX, PITCH_GIVE),
    zoom: roundZoom(clamp(zoom, ZOOM_MIN, maxZoom)),
  };
}

/**
 * Scale that fits the whole book, with its tabs and hanging ribbons, into the stage.
 * `natural` is the book's untransformed box. Zoom 100% is this fitted size.
 */
export function fitScale(
  stage: { width: number; height: number },
  natural: { width: number; height: number },
  share = FIT_SHARE,
): number {
  if (!(stage.width > 0 && stage.height > 0 && natural.width > 0 && natural.height > 0)) return 1;
  const scale = Math.min((stage.width * share) / natural.width, (stage.height * share) / natural.height);
  return Math.round(clamp(scale, FIT_MIN, FIT_MAX) * 1000) / 1000;
}

export function canPan(zoom: number): boolean {
  return Number.isFinite(zoom) && zoom > ZOOM_MIN;
}

export function clampPan(pan: MushafPan, bounds: PanBounds): MushafPan {
  let minX = bounds.minX;
  let maxX = bounds.maxX;
  let minY = bounds.minY;
  let maxY = bounds.maxY;
  if (minX > maxX) {
    const mid = (minX + maxX) / 2;
    minX = mid;
    maxX = mid;
  }
  if (minY > maxY) {
    const mid = (minY + maxY) / 2;
    minY = mid;
    maxY = mid;
  }
  return {
    x: clamp(Number.isFinite(pan.x) ? pan.x : 0, minX, maxX),
    y: clamp(Number.isFinite(pan.y) ? pan.y : 0, minY, maxY),
  };
}

export function panBy(pan: MushafPan, dx: number, dy: number, bounds: PanBounds): MushafPan {
  const safeX = Number.isFinite(dx) ? dx : 0;
  const safeY = Number.isFinite(dy) ? dy : 0;
  return clampPan({ x: pan.x + safeX, y: pan.y + safeY }, bounds);
}

/**
 * Pan limits from the stage and book boxes, with the current pan already applied
 * to the book box. The book stays at least PAN_MIN_VISIBLE_PX on screen.
 * At rest zoom there is no pan.
 */
export function panBoundsFromRects(
  stage: { left: number; right: number; top: number; bottom: number },
  book: { left: number; right: number; top: number; bottom: number },
  pan: MushafPan,
  zoom: number,
  minVisible = PAN_MIN_VISIBLE_PX,
): PanBounds {
  if (!canPan(zoom)) return PAN_BOUNDS_NONE;
  const left = book.left - pan.x;
  const right = book.right - pan.x;
  const top = book.top - pan.y;
  const bottom = book.bottom - pan.y;
  return {
    minX: stage.left + minVisible - right,
    maxX: stage.right - minVisible - left,
    minY: stage.top + minVisible - bottom,
    maxY: stage.bottom - minVisible - top,
  };
}

export function keyboardPanDelta(key: string, step = PAN_KEYBOARD_STEP): MushafPan | null {
  if (key === "ArrowLeft") return { x: -step, y: 0 };
  if (key === "ArrowRight") return { x: step, y: 0 };
  if (key === "ArrowUp") return { x: 0, y: -step };
  if (key === "ArrowDown") return { x: 0, y: step };
  return null;
}

export function shouldResetPan(previousZoom: number, nextZoom: number, angleChanged: boolean): boolean {
  if (angleChanged) return true;
  if (canPan(previousZoom) && !canPan(nextZoom)) return true;
  return false;
}

export function angleOf(pose: MushafPose): MushafAngle | "custom" {
  if (near(pose.yaw, THREE_QUARTER.yaw) && near(pose.pitch, THREE_QUARTER.pitch)) return "three-quarter";
  if (near(pose.yaw, FORE_EDGE.yaw) && near(pose.pitch, FORE_EDGE.pitch)) return "fore-edge";
  return "custom";
}

function near(value: number, target: number) {
  return Math.abs(value - target) < 0.05;
}

export function zoomLabel(zoom: number, maxZoom = ZOOM_MAX): string {
  return `${Math.round(clamp(zoom, ZOOM_MIN, maxZoom) * 100)}%`;
}

export function keyboardZoomSteps(key: string): number | null {
  if (key === "+" || key === "=") return 1;
  if (key === "-" || key === "_") return -1;
  return null;
}

export function keyboardTurnDirection(key: string): -1 | 1 | null {
  if (key === "ArrowLeft") return -1;
  if (key === "ArrowRight") return 1;
  return null;
}

export function ignoresMushafKeys(target: EventTarget | null): boolean {
  if (!target || typeof HTMLElement === "undefined") return false;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * How much of the cover's width the book occupies on the table, seen from above.
 * At the three-quarter angle this is about 0.92, which is the card's shadow width.
 */
export function tableShadowSpan(yawDeg: number): number {
  const yaw = (clamp(yawDeg, -180, 180) * Math.PI) / 180;
  const span = Math.abs(Math.cos(yaw)) + Math.abs(Math.sin(yaw)) * MUSHAF_DEPTH_RATIO;
  return Math.min(1, Math.max(MUSHAF_DEPTH_RATIO, span));
}

export function toggleColour(filter: ExploreFilter, id: string): ExploreFilter {
  const hidden = new Set(filter.hiddenColourIds);
  if (hidden.has(id)) hidden.delete(id);
  else hidden.add(id);
  return { ...filter, hiddenColourIds: [...hidden].sort() };
}

export function toggleNotes(filter: ExploreFilter): ExploreFilter {
  return { ...filter, showNotes: !filter.showNotes };
}

export function toggleBookmarks(filter: ExploreFilter): ExploreFilter {
  return { ...filter, showBookmarks: !filter.showBookmarks };
}

export function colourShown(filter: ExploreFilter, id: string): boolean {
  return !filter.hiddenColourIds.includes(id);
}

/** Drop hidden colours, notes, or bookmarks. Surah positions stay put. */
export function filterMushafInput(input: MushafEdgeInput, filter: ExploreFilter): MushafEdgeInput {
  const hidden = new Set(filter.hiddenColourIds);
  const highlights = input.highlights ?? [];
  return {
    ...input,
    highlights: hidden.size === 0 ? highlights : highlights.filter((item) => item && !hidden.has(item.swatchId)),
    notes: filter.showNotes ? input.notes : [],
    bookmarks: filter.showBookmarks ? input.bookmarks : [],
  };
}

export function surahAtShare(bands: readonly SurahBand[], share: number): SurahBand | null {
  if (bands.length === 0) return null;
  const t = clamp(Number.isFinite(share) ? share : 0, 0, 1);
  if (t >= 1) return bands[bands.length - 1] ?? null;
  for (const band of bands) {
    if (t < band.start + band.span) return band;
  }
  return bands[bands.length - 1] ?? null;
}

export function scrubberLabel(band: Pick<SurahBand, "name" | "chapterId" | "ayahCount"> | null): string {
  if (!band) return "Pages";
  if (band.ayahCount <= 1) return `${band.name} · ${band.chapterId}:1`;
  return `${band.name} · ${band.chapterId}:1 – ${band.chapterId}:${band.ayahCount}`;
}
