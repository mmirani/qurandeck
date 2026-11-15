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
export const ZOOM_MAX = 2.5;
export const ZOOM_STEP = 0.25;

export const YAW_MIN = -98;
export const YAW_MAX = 12;
export const PITCH_MIN = -12;
export const PITCH_MAX = 2;
export const YAW_STEP = 8;

/** Degrees the book turns per pixel of a horizontal drag. */
export const DRAG_YAW_PER_PX = 0.4;
/** Degrees of lean per pixel of a vertical drag. Kept small so the book stays seated. */
export const DRAG_PITCH_PER_PX = 0.08;

export type MushafPose = {
  yaw: number;
  pitch: number;
  zoom: number;
};

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

export function clampPose(pose: MushafPose): MushafPose {
  return {
    yaw: clamp(pose.yaw, YAW_MIN, YAW_MAX),
    pitch: clamp(pose.pitch, PITCH_MIN, PITCH_MAX),
    zoom: roundZoom(clamp(pose.zoom, ZOOM_MIN, ZOOM_MAX)),
  };
}

export function zoomBySteps(pose: MushafPose, steps: number): MushafPose {
  if (!Number.isFinite(steps) || steps === 0) return clampPose(pose);
  return clampPose({ ...pose, zoom: pose.zoom + steps * ZOOM_STEP });
}

/** Scroll down and pinch-out zoom out. Scroll up and pinch-in zoom in. */
export function zoomFromWheel(pose: MushafPose, deltaY: number): MushafPose {
  if (!Number.isFinite(deltaY) || deltaY === 0) return clampPose(pose);
  return clampPose({ ...pose, zoom: pose.zoom * Math.exp(-deltaY / 280) });
}

export function resetZoom(pose: MushafPose): MushafPose {
  return clampPose({ ...pose, zoom: DEFAULT_ZOOM });
}

export function withAngle(pose: MushafPose, angle: MushafAngle): MushafPose {
  const next = angle === "fore-edge" ? FORE_EDGE : THREE_QUARTER;
  return clampPose({ ...pose, yaw: next.yaw, pitch: next.pitch });
}

export function turnBy(pose: MushafPose, direction: -1 | 1): MushafPose {
  return clampPose({ ...pose, yaw: pose.yaw + direction * YAW_STEP });
}

/**
 * Drag right turns the cover with the hand (yaw increases, toward a front-on view).
 * Drag down eases the lean back toward upright.
 */
export function dragPose(pose: MushafPose, dx: number, dy: number): MushafPose {
  const safeX = Number.isFinite(dx) ? dx : 0;
  const safeY = Number.isFinite(dy) ? dy : 0;
  return clampPose({
    ...pose,
    yaw: pose.yaw + safeX * DRAG_YAW_PER_PX,
    pitch: pose.pitch + safeY * DRAG_PITCH_PER_PX,
  });
}

export function angleOf(pose: MushafPose): MushafAngle | "custom" {
  if (near(pose.yaw, THREE_QUARTER.yaw) && near(pose.pitch, THREE_QUARTER.pitch)) return "three-quarter";
  if (near(pose.yaw, FORE_EDGE.yaw) && near(pose.pitch, FORE_EDGE.pitch)) return "fore-edge";
  return "custom";
}

function near(value: number, target: number) {
  return Math.abs(value - target) < 0.05;
}

export function zoomLabel(zoom: number): string {
  return `${Math.round(clamp(zoom, ZOOM_MIN, ZOOM_MAX) * 100)}%`;
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
