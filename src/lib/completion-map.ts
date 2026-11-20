import {
  COMPLETION_PIECES,
  SURAH_VERSE_COUNTS,
  TOTAL_AYAHS,
  TOTAL_SURAHS,
  ayahAtIndex,
  ayahIndex,
  parseVerseKey,
} from "@/lib/reading";

/**
 * Geometry and counts for the zoomable completion map.
 *
 * The map lives on one axis: ayah index 0 … TOTAL_AYAHS (Al-Fatihah 1:1 to An-Nas 114:6).
 * A view is `{ start, ppa }` — the first ayah index on the left edge and pixels per ayah.
 * The zoom level decides what one sliver is: a slice of the whole Quran, one surah, or one ayah.
 */

export type CompletionLevel = "quran" | "surah" | "ayah";

export type CompletionView = { start: number; ppa: number };

/** One sliver: ayah indices [start, end). */
export type CompletionUnit = { level: CompletionLevel; index: number; start: number; end: number };

/** Below this many pixels per ayah the bar shows the 160 whole-Quran slices. */
export const SURAH_LEVEL_PPA = 0.9;
/** From here up each ayah is its own sliver. */
export const AYAH_LEVEL_PPA = 10;
/** Deepest zoom: an ayah cell is 48 px wide, comfortably over the 44 px touch target. */
export const MAX_PPA = 48;
/** One + or − press. */
export const ZOOM_STEP = 2;
/** Preset zoom for the "Surahs" and "Ayahs" level buttons. */
export const SURAH_PRESET_PPA = 2.4;
export const AYAH_PRESET_PPA = 28;

export const SURAH_OFFSETS: readonly number[] = (() => {
  const out = [0];
  for (const count of SURAH_VERSE_COUNTS) out.push(out[out.length - 1] + count);
  return out;
})();

export const SLICE_STARTS: readonly number[] = (() => {
  const out: number[] = [];
  for (let piece = 0; piece <= COMPLETION_PIECES; piece += 1) {
    // Same split as quranPieceMap(): ayah i belongs to slice floor(i × pieces / total).
    out.push(piece === COMPLETION_PIECES ? TOTAL_AYAHS : Math.ceil((piece * TOTAL_AYAHS) / COMPLETION_PIECES));
  }
  return out;
})();

export function levelForPpa(ppa: number): CompletionLevel {
  if (ppa >= AYAH_LEVEL_PPA) return "ayah";
  if (ppa >= SURAH_LEVEL_PPA) return "surah";
  return "quran";
}

export function unitCount(level: CompletionLevel) {
  if (level === "quran") return COMPLETION_PIECES;
  if (level === "surah") return TOTAL_SURAHS;
  return TOTAL_AYAHS;
}

export function unitAt(level: CompletionLevel, index: number): CompletionUnit {
  const count = unitCount(level);
  const i = Math.max(0, Math.min(count - 1, Math.floor(index)));
  if (level === "quran") return { level, index: i, start: SLICE_STARTS[i], end: SLICE_STARTS[i + 1] };
  if (level === "surah") return { level, index: i, start: SURAH_OFFSETS[i], end: SURAH_OFFSETS[i + 1] };
  return { level, index: i, start: i, end: i + 1 };
}

/** Largest i with starts[i] <= value. */
function floorSearch(starts: readonly number[], value: number) {
  let low = 0;
  let high = starts.length - 2;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (starts[mid] <= value) low = mid;
    else high = mid - 1;
  }
  return low;
}

/** The sliver that holds an ayah index at this level. */
export function unitIndexForAyah(level: CompletionLevel, ayah: number) {
  const value = Math.max(0, Math.min(TOTAL_AYAHS - 1, Math.floor(ayah)));
  if (level === "quran") return floorSearch(SLICE_STARTS, value);
  if (level === "surah") return floorSearch(SURAH_OFFSETS, value);
  return value;
}

/** Slivers that touch the ayah span [from, to). */
export function unitsInSpan(level: CompletionLevel, from: number, to: number): CompletionUnit[] {
  const lo = Math.max(0, from);
  const hi = Math.min(TOTAL_AYAHS, to);
  if (hi <= lo) return [];
  const first = unitIndexForAyah(level, lo);
  const last = unitIndexForAyah(level, hi - 1e-6);
  const out: CompletionUnit[] = [];
  for (let index = first; index <= last; index += 1) out.push(unitAt(level, index));
  return out;
}

/** Which ayahs are lit, as a flag per index plus prefix sums for O(1) range counts. */
export type ReadIndex = { lit: Uint8Array; prefix: Uint32Array; total: number };

export function buildReadIndex(versesRead: readonly string[]): ReadIndex {
  const lit = new Uint8Array(TOTAL_AYAHS);
  for (const key of versesRead) {
    const place = parseVerseKey(key);
    if (!place) continue;
    const index = ayahIndex(place.chapterId, place.verseNumber);
    if (index >= 0) lit[index] = 1;
  }
  const prefix = new Uint32Array(TOTAL_AYAHS + 1);
  for (let index = 0; index < TOTAL_AYAHS; index += 1) prefix[index + 1] = prefix[index] + lit[index];
  return { lit, prefix, total: prefix[TOTAL_AYAHS] };
}

export function readInSpan(read: ReadIndex, start: number, end: number) {
  const lo = Math.max(0, Math.min(TOTAL_AYAHS, start));
  const hi = Math.max(lo, Math.min(TOTAL_AYAHS, end));
  return read.prefix[hi] - read.prefix[lo];
}

export function unitFill(read: ReadIndex, unit: Pick<CompletionUnit, "start" | "end">) {
  const size = unit.end - unit.start;
  return size > 0 ? readInSpan(read, unit.start, unit.end) / size : 0;
}

export function surahFinished(read: ReadIndex, chapterId: number) {
  if (!Number.isInteger(chapterId) || chapterId < 1 || chapterId > TOTAL_SURAHS) return false;
  const start = SURAH_OFFSETS[chapterId - 1];
  const end = SURAH_OFFSETS[chapterId];
  return readInSpan(read, start, end) === end - start;
}

/** First unread ayah index in [start, end), or -1 when every ayah there is lit. */
export function firstUnreadIn(read: ReadIndex, start: number, end: number) {
  for (let index = Math.max(0, start); index < Math.min(TOTAL_AYAHS, end); index += 1) {
    if (!read.lit[index]) return index;
  }
  return -1;
}

export function verseKeyAt(index: number) {
  const place = ayahAtIndex(index);
  return place ? `${place.chapterId}:${place.verseNumber}` : null;
}

export type SurahName = (chapterId: number) => string;

/** Spoken and visible summary of a sliver, e.g. "Al-Baqarah, ayahs 71 to 109, 23% read". */
export function unitLabel(unit: CompletionUnit, read: ReadIndex, name: SurahName) {
  const percent = Math.round(unitFill(read, unit) * 100);
  const from = ayahAtIndex(unit.start);
  const to = ayahAtIndex(unit.end - 1);
  if (!from || !to) return "";
  if (unit.level === "ayah") {
    return `${name(from.chapterId)} ${from.chapterId}:${from.verseNumber}, ${percent ? "read" : "unread"}`;
  }
  if (unit.level === "surah") {
    const done = surahFinished(read, from.chapterId);
    return `${name(from.chapterId)}, ${to.verseNumber} ayahs, ${percent}% read${done ? ", finished" : ""}`;
  }
  if (from.chapterId === to.chapterId) {
    return `${name(from.chapterId)}, ayahs ${from.verseNumber} to ${to.verseNumber}, ${percent}% read`;
  }
  return `${name(from.chapterId)} ${from.chapterId}:${from.verseNumber} to ${name(to.chapterId)} ${to.chapterId}:${to.verseNumber}, ${percent}% read`;
}

export type UnitDetails = {
  title: string;
  /** e.g. "9 of 39 ayahs in this slice read" */
  detail: string | null;
  /** e.g. "Al-Baqarah · 40 of 286 read" */
  surahLine: string;
  /** Where the main button goes. */
  target: string;
  /** e.g. "Read the 29 left" or "Open 2:255" */
  action: string;
  finished: boolean;
};

/**
 * What the popover says for a sliver. `surahReadCount` is ayahsReadInSurah() for the
 * sliver's first surah, so the line matches the rest of the site.
 */
export function unitDetails(
  unit: CompletionUnit,
  read: ReadIndex,
  name: SurahName,
  surahReadCount: number,
): UnitDetails {
  const from = ayahAtIndex(unit.start) ?? { chapterId: 1, verseNumber: 1 };
  const to = ayahAtIndex(unit.end - 1) ?? from;
  const surahTotal = SURAH_VERSE_COUNTS[from.chapterId - 1];
  const surahLine = `${name(from.chapterId)} · ${Math.min(surahReadCount, surahTotal)} of ${surahTotal} read`;
  const finished = surahFinished(read, from.chapterId);
  const startKey = `${from.chapterId}:${from.verseNumber}`;

  if (unit.level === "ayah") {
    const lit = Boolean(read.lit[unit.start]);
    return {
      title: `${name(from.chapterId)} ${startKey}`,
      detail: lit ? "Read" : "Not read yet",
      surahLine,
      target: startKey,
      action: `Open ${startKey}`,
      finished,
    };
  }

  const size = unit.end - unit.start;
  const lit = readInSpan(read, unit.start, unit.end);
  const left = size - lit;
  const unread = firstUnreadIn(read, unit.start, unit.end);
  const target = unread >= 0 ? (verseKeyAt(unread) ?? startKey) : startKey;
  const action = left === 0 ? (unit.level === "surah" ? "Read it again" : `Open ${startKey}`) : `Read the ${left} left`;

  if (unit.level === "surah") {
    return {
      title: name(from.chapterId),
      detail: finished ? "Finished — every ayah is lit" : null,
      surahLine: `Surah ${from.chapterId} · ${Math.min(surahReadCount, surahTotal)} of ${surahTotal} read`,
      target,
      action,
      finished,
    };
  }

  const endKey = `${to.chapterId}:${to.verseNumber}`;
  const title =
    from.chapterId === to.chapterId
      ? `${name(from.chapterId)} ${startKey}–${to.verseNumber}`
      : `${name(from.chapterId)} ${startKey} – ${name(to.chapterId)} ${endKey}`;
  return {
    title,
    detail: `${lit} of ${size} ayahs in this slice read`,
    surahLine,
    target,
    action,
    finished,
  };
}

/* ---------- view math ---------- */

export function minPpa(width: number) {
  return width > 0 ? width / TOTAL_AYAHS : 0.1;
}

export function clampPpa(ppa: number, width: number) {
  const low = minPpa(width);
  return Math.min(Math.max(ppa, low), Math.max(low, MAX_PPA));
}

export function clampView(view: CompletionView, width: number): CompletionView {
  const ppa = clampPpa(view.ppa, width);
  const span = width / ppa;
  const maxStart = Math.max(0, TOTAL_AYAHS - span);
  const start = Math.min(Math.max(view.start, 0), maxStart);
  return { start: Number.isFinite(start) ? start : 0, ppa };
}

export function wholeView(width: number): CompletionView {
  return { start: 0, ppa: minPpa(width) };
}

/** Zoom so the ayah under `anchorX` (pixels from the left edge) stays under it. */
export function zoomAt(view: CompletionView, nextPpa: number, anchorX: number, width: number): CompletionView {
  const ppa = clampPpa(nextPpa, width);
  const ayah = view.start + anchorX / view.ppa;
  return clampView({ start: ayah - anchorX / ppa, ppa }, width);
}

/** Wheel or trackpad pinch delta to a zoom factor. Smooth and bounded per event. */
export function wheelZoomFactor(deltaY: number, deltaMode = 0) {
  const pixels = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY;
  const clamped = Math.max(-120, Math.min(120, pixels));
  return Math.exp(-clamped * 0.006);
}

export function panBy(view: CompletionView, dx: number, width: number): CompletionView {
  return clampView({ start: view.start - dx / view.ppa, ppa: view.ppa }, width);
}

/** Centre the view on an ayah index (used by keyboard and the overview strip). */
export function centreOn(view: CompletionView, ayah: number, width: number): CompletionView {
  return clampView({ start: ayah - width / view.ppa / 2, ppa: view.ppa }, width);
}

/** Pan the least needed so [start, end) is on screen, with a small margin. */
export function revealSpan(view: CompletionView, start: number, end: number, width: number, margin = 24): CompletionView {
  const left = view.start + margin / view.ppa;
  const right = view.start + (width - margin) / view.ppa;
  if (start >= left && end <= right) return view;
  if (end - start > (width - margin * 2) / view.ppa || start < left) {
    return clampView({ start: start - margin / view.ppa, ppa: view.ppa }, width);
  }
  return clampView({ start: end - (width - margin) / view.ppa, ppa: view.ppa }, width);
}

export function isZoomed(view: CompletionView, width: number) {
  return view.ppa > minPpa(width) * 1.001;
}

/** Ayah number marks for the ruler at ayah level: every ayah when wide, else every 5 or 10. */
export function ayahTickEvery(ppa: number) {
  if (ppa >= 26) return 1;
  if (ppa >= 14) return 5;
  return 10;
}

/** How warm the whole bar looks: 0 (nothing read) to 1 (khatm). Eased so early reading shows. */
export function barWarmth(read: ReadIndex) {
  const fraction = read.total / TOTAL_AYAHS;
  return Math.round(Math.sqrt(Math.max(0, Math.min(1, fraction))) * 1000) / 1000;
}

/**
 * Noor bloom behind a sliver: how far the light reaches past its edges (px, before blur) and how
 * bright it is. Grows with fill; a finished surah is brightest and reaches furthest.
 * The bloom is painted once in a single blurred layer, never as a filter per cell.
 */
export function noorGlow(fill: number, finished: boolean) {
  if (fill <= 0) return null;
  const value = Math.max(0, Math.min(1, fill));
  if (finished) return { spread: 12, opacity: 1 };
  const spread = Math.round((3 + value * 7) * 10) / 10;
  const opacity = Math.round((0.38 + value * 0.42) * 100) / 100;
  return { spread, opacity };
}

/** Backdrop bloom percentages for the bar: top, bottom, and the halo around it. */
export function barGlow(warmth: number) {
  const w = Math.max(0, Math.min(1, warmth));
  return {
    top: Math.round(8 + w * 42),
    bottom: Math.round(3 + w * 22),
    halo: Math.round(w * 55),
    haloBlur: Math.round(10 + w * 26),
  };
}

/**
 * Read runs inside [start, end) as fractions 0–1, merged, at most `limit` runs.
 * Used to paint where in a surah the light is, not only how much.
 */
export function litRuns(read: ReadIndex, start: number, end: number, limit = 48): [number, number][] | null {
  const size = end - start;
  if (size <= 0) return [];
  const runs: [number, number][] = [];
  let open = -1;
  for (let index = start; index <= end; index += 1) {
    const lit = index < end && read.lit[index] === 1;
    if (lit && open < 0) open = index;
    if (!lit && open >= 0) {
      runs.push([(open - start) / size, (index - start) / size]);
      open = -1;
      if (runs.length > limit) return null;
    }
  }
  return runs;
}

/** Quiet unread cell. Color means only how much is read, never which surah. */
export const MAP_UNREAD = "var(--map-unread)";

/**
 * Emerald heat color for a 0–1 fill. The ramp is the same on every theme
 * (tokens change only between Day/Paper, Night, and High Contrast).
 * Unread and finished are not part of this ramp.
 */
export function heatColor(fill: number): string {
  if (fill <= 0) return MAP_UNREAD;
  const value = Math.max(0, Math.min(1, fill));
  if (value < 0.5) {
    return `color-mix(in srgb, var(--map-mid) ${Math.round((value / 0.5) * 100)}%, var(--map-low))`;
  }
  return `color-mix(in srgb, var(--map-high) ${Math.round(((value - 0.5) / 0.5) * 100)}%, var(--map-mid))`;
}

function litSheen(fill: number, finished: boolean): string {
  if (finished) {
    return `linear-gradient(to bottom, color-mix(in srgb, var(--map-sheen) 70%, transparent), transparent 55%)`;
  }
  return `linear-gradient(to bottom, color-mix(in srgb, var(--map-bloom) ${Math.round(18 + fill * 36)}%, transparent), transparent 60%)`;
}

/** CSS background for a slice, an ayah, or a fully filled surah. */
export function sliverPaint(fill: number, finished: boolean): string {
  if (fill <= 0) return MAP_UNREAD;
  if (finished) return `${litSheen(1, true)}, var(--map-done)`;
  return `${litSheen(fill, false)}, ${heatColor(fill)}`;
}

/**
 * Surah sliver: paint the lit runs in place so the reader sees where in the
 * surah they have read, not only how much.
 */
export function surahPaint(fill: number, runs: [number, number][] | null): string {
  if (fill <= 0) return MAP_UNREAD;
  if (!runs || fill >= 1) return sliverPaint(fill, fill >= 1);
  const lit = heatColor(fill);
  const stops: string[] = [];
  for (const [from, to] of runs) {
    const a = (from * 100).toFixed(2);
    const b = (to * 100).toFixed(2);
    stops.push(`${MAP_UNREAD} ${a}%`, `${lit} ${a}%`, `${lit} ${b}%`, `${MAP_UNREAD} ${b}%`);
  }
  return `${litSheen(fill, false)}, linear-gradient(to right, ${MAP_UNREAD} 0%, ${stops.join(", ")}, ${MAP_UNREAD} 100%)`;
}

/** Inset rim and sheen. High Contrast adds a crisp edge via --map-edge. */
export function sliverRing(fill: number, finished: boolean): string {
  const edge = "inset 0 0 0 1px var(--map-edge)";
  if (fill <= 0) return edge;
  const ring = finished
    ? "inset 0 0 0 1px color-mix(in srgb, var(--map-sheen) 85%, transparent), inset 0 1px 0 var(--map-sheen)"
    : "inset 0 1px 0 color-mix(in srgb, var(--map-bloom) 45%, transparent)";
  return `${ring}, ${edge}`;
}

/** Solid fill for the zoomed overview hairline (no sheen). */
export function overviewFill(fill: number): string {
  if (fill <= 0) return MAP_UNREAD;
  if (fill >= 1) return "var(--map-done)";
  return heatColor(fill);
}
