import { surahById } from "@/lib/guide/surahs";
import { swatchById } from "@/lib/highlights";
import {
  ayahIndex,
  parseVerseKey,
  SURAH_VERSE_COUNTS,
  TOTAL_AYAHS,
  TOTAL_SURAHS,
} from "@/lib/reading";
import type { Bookmark, Highlight, HighlightSwatch, Note } from "@/lib/quran/types";

/** Flags and ribbons closer than this fraction of the fore-edge become one tab. */
export const FLAG_MIN_GAP = 0.07;

export const MAX_NOTE_FLAGS = 8;
export const MAX_RIBBONS = 6;

/** Popover rows, including a final "+N more" row when the list is longer. */
export const MAX_EDGE_CHOICES = 8;

export const NOTE_PREVIEW_WORDS = 8;
const PREVIEW_CHARS = 72;

/** Minimum hit width used to gather thin surahs into one control. */
export const EDGE_MIN_TARGET_PX = 28;

/** Wait before a hover tooltip opens, so a pass across the edge does not flicker. */
export const EDGE_HOVER_DELAY_MS = 180;

/** Keep the open tooltip while the pointer moves to the next tab. */
export const EDGE_HOVER_GRACE_MS = 120;

const HEX = /^#[0-9A-Fa-f]{6}$/;
const SAVED_COLOUR = "Saved colour";
const SAVED_HEX = "#C4B5FD";

export type TooltipCopy = {
  title: string;
  lines: string[];
  /** First words of a single note. Empty when there is nothing short to show. */
  preview: string;
};

export type EdgeItem = {
  id: string;
  kind: "note" | "bookmark";
  verseKey: string;
  endVerseKey?: string;
  chapterId: number;
  verseNumber: number;
  /** 0–1 along the mushaf, from Al-Fatihah toward An-Nas. */
  position: number;
  preview: string;
  label: string;
};

export type EdgeCluster = {
  id: string;
  kind: "note" | "bookmark";
  position: number;
  items: EdgeItem[];
  /** "+N" when several marks share one tab. Empty for a single mark. */
  label: string;
  /** Most-used highlight on these ayahs, for a coloured tab. Null stays cream. */
  accent: string | null;
  tooltip: TooltipCopy;
  /** Set when a click can open one place. Null when the reader should choose. */
  direct: EdgeChoice | null;
  choices: EdgeChoice[];
};

export type ColorShare = {
  id: string;
  name: string;
  color: string;
  count: number;
  share: number;
};

export type SurahBand = {
  chapterId: number;
  name: string;
  ayahCount: number;
  /** Start of this surah, 0–1. */
  start: number;
  span: number;
  readRatio: number;
  highlightCount: number;
  noteCount: number;
  bookmarkCount: number;
  colors: ColorShare[];
};

export type EdgeChoice = {
  id: string;
  verseKey: string;
  chapterId: number;
  verseNumber: number;
  title: string;
  detail: string;
  preview: string;
};

export type SurahBucket = {
  id: string;
  chapterIds: number[];
  name: string;
  ayahCount: number;
  start: number;
  span: number;
  readRatio: number;
  highlightCount: number;
  noteCount: number;
  bookmarkCount: number;
  colors: ColorShare[];
  tooltip: TooltipCopy;
  /** Set when a click can open one place. Null when the reader should choose. */
  direct: EdgeChoice | null;
  choices: EdgeChoice[];
};

export type MushafEdge = {
  bands: SurahBand[];
  buckets: SurahBucket[];
  noteFlags: EdgeCluster[];
  ribbons: EdgeCluster[];
  legend: ColorShare[];
  totals: { highlights: number; notes: number; bookmarks: number; read: number };
  /** No highlights, notes, or bookmarks. Reading shade stays off in that state. */
  empty: boolean;
};

export type MushafEdgeInput = {
  highlights?: readonly Highlight[];
  notes?: readonly Note[];
  bookmarks?: readonly Bookmark[];
  swatches?: readonly HighlightSwatch[];
  versesRead?: readonly string[];
  names?: readonly { id: number; name: string }[];
  /** Gather surahs until each clickable group is at least this share of the edge. */
  minShare?: number;
  maxNoteFlags?: number;
  maxRibbons?: number;
  minFlagGap?: number;
  maxChoices?: number;
};

type VerseMark = {
  verseKey: string;
  chapterId: number;
  verseNumber: number;
  index: number;
  colors: ColorShare[];
  notes: { id: string; preview: string }[];
  bookmarks: { id: string; label: string; endVerseKey?: string }[];
};

type Placed = {
  chapterId: number;
  verseNumber: number;
  index: number;
  verseKey: string;
};

export function notePreview(body: string, words = NOTE_PREVIEW_WORDS): string {
  const cleaned = body.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const parts = cleaned.split(" ");
  const shortened = parts.length > words;
  let text = (shortened ? parts.slice(0, words) : parts).join(" ");
  if (text.length > PREVIEW_CHARS) {
    text = text.slice(0, PREVIEW_CHARS).trimEnd();
    return `${text}…`;
  }
  return shortened ? `${text}…` : text;
}

export function tooltipLabel(copy: TooltipCopy): string {
  return [copy.title, ...copy.lines, copy.preview].filter(Boolean).join(". ");
}

export function minShareForWidth(width: number, minPx = EDGE_MIN_TARGET_PX): number {
  if (!Number.isFinite(width) || width <= 0) return 1 / 30;
  return Math.min(0.25, minPx / width);
}

export type FloatingAnchor = { top: number; left: number; width: number; height: number };
export type FloatingBox = { top: number; left: number; placement: "above" | "below" };

/** Keep a single floating layer inside the viewport, above the anchor when it fits. */
export function placeFloating(
  anchor: FloatingAnchor,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 8,
): FloatingBox {
  const margin = gap;
  const width = Math.min(Math.max(0, size.width), Math.max(0, viewport.width - margin * 2));
  const height = Math.min(Math.max(0, size.height), Math.max(0, viewport.height - margin * 2));
  let left = anchor.left + anchor.width / 2 - width / 2;
  const maxLeft = viewport.width - width - margin;
  left = Math.max(margin, Math.min(left, Math.max(margin, maxLeft)));

  const aboveTop = anchor.top - height - margin;
  const belowTop = anchor.top + anchor.height + margin;
  const spaceAbove = anchor.top - margin;
  const spaceBelow = viewport.height - (anchor.top + anchor.height) - margin;
  const placement: FloatingBox["placement"] = aboveTop >= margin || spaceAbove >= spaceBelow ? "above" : "below";
  let top = placement === "above" ? aboveTop : belowTop;
  const maxTop = viewport.height - height - margin;
  top = Math.max(margin, Math.min(top, Math.max(margin, maxTop)));
  return { top, left, placement };
}

/**
 * Merge marks that would overlap, then keep merging the closest pair until the cap.
 * Every input item stays represented. A tab of several items is the "+N" case.
 */
export function clusterByPosition(
  items: readonly EdgeItem[],
  options?: { maxVisible?: number; minGap?: number },
): EdgeCluster[] {
  const maxVisible = Math.max(1, options?.maxVisible ?? MAX_NOTE_FLAGS);
  const minGap = Math.max(0, options?.minGap ?? FLAG_MIN_GAP);
  const sorted = items
    .filter((item) => Number.isFinite(item.position))
    .slice()
    .sort((a, b) => a.position - b.position || a.verseKey.localeCompare(b.verseKey, "en") || a.id.localeCompare(b.id));
  if (sorted.length === 0) return [];

  const groups: EdgeItem[][] = sorted.map((item) => [item]);
  const closest = () => {
    let index = 0;
    let gap = Number.POSITIVE_INFINITY;
    for (let i = 0; i < groups.length - 1; i += 1) {
      const distance = clusterPosition(groups[i + 1]) - clusterPosition(groups[i]);
      if (distance < gap) {
        gap = distance;
        index = i;
      }
    }
    return { index, gap };
  };

  while (groups.length > 1) {
    const { index, gap } = closest();
    if (groups.length <= maxVisible && gap >= minGap) break;
    const merged = groups[index].concat(groups[index + 1]);
    groups.splice(index, 2, merged);
  }

  return groups.map((group) => ({
    id: `${group[0]?.kind ?? "mark"}:${group[0]?.id ?? "x"}:${group.length}`,
    kind: group[0]?.kind ?? "note",
    position: clusterPosition(group),
    items: group,
    label: group.length > 1 ? `+${group.length}` : "",
    accent: null,
    tooltip: { title: "", lines: [], preview: "" },
    direct: null,
    choices: [],
  }));
}

export function buildMushafEdge(input: MushafEdgeInput = {}): MushafEdge {
  const names = nameLookup(input.names);
  const swatches = input.swatches ?? [];
  const highlights = validHighlights(input.highlights ?? []);
  const notes = validNotes(input.notes ?? []);
  const bookmarks = validBookmarks(input.bookmarks ?? []);
  const read = new Set((input.versesRead ?? []).filter((key) => placed(key)));

  const highlightByChapter = new Map<number, Highlight[]>();
  for (const item of highlights) {
    const place = placed(item.verseKey);
    if (!place) continue;
    const list = highlightByChapter.get(place.chapterId) ?? [];
    list.push(item);
    highlightByChapter.set(place.chapterId, list);
  }
  const notesByChapter = countByChapter(notes.map((item) => item.verseKey));
  const bookmarksByChapter = countByChapter(bookmarks.map((item) => item.verseKey));

  const bands: SurahBand[] = [];
  for (let chapterId = 1; chapterId <= TOTAL_SURAHS; chapterId += 1) {
    const ayahCount = SURAH_VERSE_COUNTS[chapterId - 1] ?? 0;
    const startIndex = ayahIndex(chapterId, 1);
    let readCount = 0;
    for (let verse = 1; verse <= ayahCount; verse += 1) {
      if (read.has(`${chapterId}:${verse}`)) readCount += 1;
    }
    const chapterHighlights = highlightByChapter.get(chapterId) ?? [];
    bands.push({
      chapterId,
      name: names(chapterId),
      ayahCount,
      start: startIndex < 0 ? 0 : startIndex / TOTAL_AYAHS,
      span: ayahCount / TOTAL_AYAHS,
      readRatio: ayahCount ? readCount / ayahCount : 0,
      highlightCount: chapterHighlights.length,
      noteCount: notesByChapter.get(chapterId) ?? 0,
      bookmarkCount: bookmarksByChapter.get(chapterId) ?? 0,
      colors: colorsFromHighlights(chapterHighlights, swatches),
    });
  }

  const minShare = input.minShare ?? 1 / 30;
  const maxChoices = input.maxChoices ?? MAX_EDGE_CHOICES;
  const buckets = bucketBands(bands, minShare, marksForChapters(highlights, notes, bookmarks, swatches), names, maxChoices);
  const noteItems = notes.map((note) => itemFromNote(note)).filter((item): item is EdgeItem => Boolean(item));
  const ribbonItems = bookmarks
    .map((bookmark) => itemFromBookmark(bookmark))
    .filter((item): item is EdgeItem => Boolean(item));

  const noteFlags = finishClusters(
    clusterByPosition(noteItems, { maxVisible: input.maxNoteFlags ?? MAX_NOTE_FLAGS, minGap: input.minFlagGap ?? FLAG_MIN_GAP }),
    highlights,
    swatches,
    names,
    maxChoices,
  );
  const ribbons = finishClusters(
    clusterByPosition(ribbonItems, { maxVisible: input.maxRibbons ?? MAX_RIBBONS, minGap: input.minFlagGap ?? FLAG_MIN_GAP }),
    highlights,
    swatches,
    names,
    maxChoices,
  );

  const legend = colorsFromHighlights(highlights, swatches);
  return {
    bands,
    buckets,
    noteFlags,
    ribbons,
    legend,
    totals: {
      highlights: highlights.length,
      notes: noteItems.length,
      bookmarks: ribbonItems.length,
      read: read.size,
    },
    empty: highlights.length + noteItems.length + ribbonItems.length === 0,
  };
}

function finishClusters(
  clusters: EdgeCluster[],
  highlights: readonly Highlight[],
  swatches: readonly HighlightSwatch[],
  names: (id: number) => string,
  maxChoices = MAX_EDGE_CHOICES,
): EdgeCluster[] {
  return clusters.map((cluster) => {
    const choices = limitChoices(choicesFromCluster(cluster, names), maxChoices);
    const direct = choices.length <= 1 ? (choices[0] ?? null) : null;
    return {
      ...cluster,
      accent: clusterAccent(cluster, highlights, swatches),
      tooltip: clusterTooltip(cluster, highlights, swatches, names),
      direct,
      choices: direct ? [] : choices,
    };
  });
}

function clusterAccent(
  cluster: EdgeCluster,
  highlights: readonly Highlight[],
  swatches: readonly HighlightSwatch[],
): string | null {
  const keys = new Set(cluster.items.map((item) => item.verseKey));
  const related = highlights.filter((item) => keys.has(item.verseKey));
  return colorsFromHighlights(related, swatches)[0]?.color ?? null;
}

function choicesFromCluster(cluster: EdgeCluster, names: (id: number) => string): EdgeChoice[] {
  return cluster.items.map((item) => ({
    id: item.id,
    verseKey: item.verseKey,
    chapterId: item.chapterId,
    verseNumber: item.verseNumber,
    title: item.endVerseKey
      ? `${names(item.chapterId)} ${item.verseKey} – ${item.endVerseKey}`
      : `${names(item.chapterId)} ${item.verseKey}`,
    detail: item.kind === "bookmark" ? item.label || "Bookmark" : "Note",
    preview: item.kind === "note" ? item.preview : "",
  }));
}

function clusterTooltip(
  cluster: EdgeCluster,
  highlights: readonly Highlight[],
  swatches: readonly HighlightSwatch[],
  names: (id: number) => string,
): TooltipCopy {
  const keys = new Set(cluster.items.map((item) => item.verseKey));
  const related = highlights.filter((item) => keys.has(item.verseKey));
  const colors = colorsFromHighlights(related, swatches);
  const noteCount = cluster.items.filter((item) => item.kind === "note").length;
  const bookmarkCount = cluster.items.filter((item) => item.kind === "bookmark").length;
  const single = cluster.items.length === 1 ? cluster.items[0] : undefined;
  const firstNote = cluster.items.find((item) => item.kind === "note" && item.preview);
  const preview = cluster.kind === "note" ? (firstNote?.preview ?? "") : "";
  const lines = [rangeLabel(cluster.items), colorLine(colors), countLine(noteCount, bookmarkCount)].filter(Boolean);
  if (single?.kind === "bookmark" && single.label) lines.push(single.label);
  return {
    title: spanName(cluster.items, names),
    lines,
    preview,
  };
}

export function bucketBands(
  bands: readonly SurahBand[],
  minShare: number,
  marks: readonly VerseMark[],
  names: (id: number) => string,
  maxChoices = MAX_EDGE_CHOICES,
): SurahBucket[] {
  if (bands.length === 0) return [];
  const groups = groupBands(bands, minShare);
  return groups.map((group) => {
    const first = group[0];
    const last = group[group.length - 1];
    const ids = group.map((band) => band.chapterId);
    const idSet = new Set(ids);
    const ayahCount = group.reduce((sum, band) => sum + band.ayahCount, 0);
    const readAyahs = group.reduce((sum, band) => sum + band.readRatio * band.ayahCount, 0);
    const colors = mergeColors(group.flatMap((band) => band.colors));
    const inBucket = marks.filter((mark) => idSet.has(mark.chapterId));
    const choices = limitChoices(inBucket.map((mark) => choiceFromMark(mark, names)), maxChoices);
    const fallback = first
      ? {
          id: `open-${first.chapterId}`,
          verseKey: `${first.chapterId}:1`,
          chapterId: first.chapterId,
          verseNumber: 1,
          title: `${names(first.chapterId)} ${first.chapterId}:1`,
          detail: "Start of this stretch",
          preview: "",
        }
      : null;
    const direct = choices.length <= 1 ? (choices[0] ?? fallback) : null;
    const noteCount = inBucket.reduce((sum, mark) => sum + mark.notes.length, 0);
    const bookmarkCount = inBucket.reduce((sum, mark) => sum + mark.bookmarks.length, 0);
    const onlyNote = inBucket.filter((mark) => mark.notes.length === 1);
    const preview = noteCount === 1 && onlyNote.length === 1 ? (onlyNote[0]?.notes[0]?.preview ?? "") : "";
    const name = first && last ? (first.chapterId === last.chapterId ? first.name : `${first.name} – ${last.name}`) : "";
    const from = first ? `${first.chapterId}:1` : "";
    const to = last ? `${last.chapterId}:${last.ayahCount}` : "";
    return {
      id: first && last ? (first.chapterId === last.chapterId ? String(first.chapterId) : `${first.chapterId}-${last.chapterId}`) : "empty",
      chapterIds: ids,
      name,
      ayahCount,
      start: first?.start ?? 0,
      span: group.reduce((sum, band) => sum + band.span, 0),
      readRatio: ayahCount ? readAyahs / ayahCount : 0,
      highlightCount: group.reduce((sum, band) => sum + band.highlightCount, 0),
      noteCount,
      bookmarkCount,
      colors,
      tooltip: {
        title: name,
        lines: [from && to ? (from === to ? from : `${from} – ${to}`) : "", colorLine(colors), countLine(noteCount, bookmarkCount)].filter(
          Boolean,
        ),
        preview,
      },
      direct,
      choices: direct ? [] : choices,
    };
  });
}

function groupBands(bands: readonly SurahBand[], minShare: number): SurahBand[][] {
  if (minShare <= 0) return bands.map((band) => [band]);
  const floor = Math.min(minShare, 1);
  const groups: SurahBand[][] = [];
  let current: SurahBand[] = [];
  let span = 0;
  for (const band of bands) {
    if (current.length > 0 && span >= floor) {
      groups.push(current);
      current = [];
      span = 0;
    }
    current.push(band);
    span += band.span;
  }
  if (current.length) groups.push(current);
  if (groups.length >= 2) {
    const last = groups[groups.length - 1] ?? [];
    const lastSpan = last.reduce((sum, band) => sum + band.span, 0);
    if (lastSpan < floor) {
      const previous = groups[groups.length - 2] ?? [];
      groups.splice(groups.length - 2, 2, previous.concat(last));
    }
  }
  return groups;
}

/** Keep the first rows, and fold the rest into one "+N more" choice with no note text. */
export function limitChoices(choices: readonly EdgeChoice[], max = MAX_EDGE_CHOICES): EdgeChoice[] {
  if (choices.length <= max) return choices.slice();
  const keep = Math.max(1, max - 1);
  const head = choices.slice(0, keep);
  const rest = choices.slice(keep);
  const first = rest[0];
  const last = rest[rest.length - 1];
  if (!first || !last) return head;
  head.push({
    id: `more-${first.id}`,
    verseKey: first.verseKey,
    chapterId: first.chapterId,
    verseNumber: first.verseNumber,
    title: `+${rest.length} more`,
    detail: first.verseKey === last.verseKey ? first.verseKey : `${first.verseKey} – ${last.verseKey}`,
    preview: "",
  });
  return head;
}

function choiceFromMark(mark: VerseMark, names: (id: number) => string): EdgeChoice {
  const end = mark.bookmarks.find((item) => item.endVerseKey)?.endVerseKey;
  const title = end ? `${mark.verseKey} – ${end}` : mark.verseKey;
  const parts: string[] = [];
  for (const color of mark.colors) parts.push(`${color.name} ${color.count}`);
  if (mark.notes.length === 1) parts.push("1 note");
  else if (mark.notes.length > 1) parts.push(`${mark.notes.length} notes`);
  if (mark.bookmarks.length === 1) parts.push("1 bookmark");
  else if (mark.bookmarks.length > 1) parts.push(`${mark.bookmarks.length} bookmarks`);
  const label = mark.bookmarks.length === 1 ? mark.bookmarks[0]?.label : "";
  if (label) parts.push(label);
  return {
    id: mark.verseKey,
    verseKey: mark.verseKey,
    chapterId: mark.chapterId,
    verseNumber: mark.verseNumber,
    title: `${names(mark.chapterId)} ${title}`,
    detail: parts.join(" · "),
    preview: mark.notes.length === 1 ? (mark.notes[0]?.preview ?? "") : "",
  };
}

function marksForChapters(
  highlights: readonly Highlight[],
  notes: readonly Note[],
  bookmarks: readonly Bookmark[],
  swatches: readonly HighlightSwatch[],
): VerseMark[] {
  const map = new Map<string, VerseMark>();
  const ensure = (verseKey: string) => {
    const place = placed(verseKey);
    if (!place) return null;
    const current = map.get(verseKey);
    if (current) return current;
    const created: VerseMark = {
      verseKey,
      chapterId: place.chapterId,
      verseNumber: place.verseNumber,
      index: place.index,
      colors: [],
      notes: [],
      bookmarks: [],
    };
    map.set(verseKey, created);
    return created;
  };

  const colorCounts = new Map<string, Map<string, number>>();
  for (const item of highlights) {
    const mark = ensure(item.verseKey);
    if (!mark) continue;
    const counts = colorCounts.get(item.verseKey) ?? new Map<string, number>();
    const pen = penFor(swatches, item.swatchId);
    counts.set(pen.id, (counts.get(pen.id) ?? 0) + 1);
    colorCounts.set(item.verseKey, counts);
  }
  for (const [verseKey, counts] of colorCounts) {
    const mark = map.get(verseKey);
    if (!mark) continue;
    const colors = [...counts.entries()].map(([id, count]) => {
      const pen = penFor(swatches, id);
      return { ...pen, count, share: 0 };
    });
    mark.colors = mergeColors(colors);
  }
  for (const note of notes) {
    const mark = ensure(note.verseKey);
    if (!mark) continue;
    mark.notes.push({ id: note.id, preview: notePreview(note.body) });
  }
  for (const bookmark of bookmarks) {
    const mark = ensure(bookmark.verseKey);
    if (!mark) continue;
    mark.bookmarks.push({
      id: bookmark.id,
      label: notePreview(bookmark.label, 6),
      endVerseKey: bookmark.endVerseKey,
    });
  }
  return [...map.values()].sort((a, b) => a.index - b.index || a.verseKey.localeCompare(b.verseKey));
}

function itemFromNote(note: Note): EdgeItem | null {
  const place = placed(note.verseKey);
  if (!place) return null;
  return {
    id: note.id,
    kind: "note",
    verseKey: note.verseKey,
    chapterId: place.chapterId,
    verseNumber: place.verseNumber,
    position: (place.index + 0.5) / TOTAL_AYAHS,
    preview: notePreview(note.body),
    label: "",
  };
}

function itemFromBookmark(bookmark: Bookmark): EdgeItem | null {
  const place = placed(bookmark.verseKey);
  if (!place) return null;
  return {
    id: bookmark.id,
    kind: "bookmark",
    verseKey: bookmark.verseKey,
    endVerseKey: bookmark.endVerseKey,
    chapterId: place.chapterId,
    verseNumber: place.verseNumber,
    position: (place.index + 0.5) / TOTAL_AYAHS,
    preview: "",
    label: notePreview(bookmark.label, 6),
  };
}

function clusterPosition(items: readonly EdgeItem[]): number {
  if (items.length === 0) return 0;
  return items.reduce((sum, item) => sum + item.position, 0) / items.length;
}

function spanName(items: readonly EdgeItem[], names: (id: number) => string): string {
  const ordered = items.slice().sort((a, b) => a.position - b.position);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  if (!first || !last) return "";
  if (first.chapterId === last.chapterId) return names(first.chapterId);
  return `${names(first.chapterId)} – ${names(last.chapterId)}`;
}

function rangeLabel(items: readonly EdgeItem[]): string {
  const ordered = items.slice().sort((a, b) => a.position - b.position);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  if (!first || !last) return "";
  if (ordered.length === 1 && first.endVerseKey && first.endVerseKey !== first.verseKey) {
    return `${first.verseKey} – ${first.endVerseKey}`;
  }
  if (first.verseKey === last.verseKey) return first.verseKey;
  return `${first.verseKey} – ${last.verseKey}`;
}

function colorLine(colors: readonly ColorShare[]): string {
  return colors.map((color) => `${color.name} ${color.count}`).join(" · ");
}

function countLine(notes: number, bookmarks: number): string {
  const parts: string[] = [];
  if (notes === 1) parts.push("1 note");
  else if (notes > 1) parts.push(`${notes} notes`);
  if (bookmarks === 1) parts.push("1 bookmark");
  else if (bookmarks > 1) parts.push(`${bookmarks} bookmarks`);
  return parts.join(" · ");
}

function colorsFromHighlights(highlights: readonly Highlight[], swatches: readonly HighlightSwatch[]): ColorShare[] {
  const counts = new Map<string, number>();
  for (const item of highlights) {
    const pen = penFor(swatches, item.swatchId);
    counts.set(pen.id, (counts.get(pen.id) ?? 0) + 1);
  }
  const colors = [...counts.entries()].map(([id, count]) => ({ ...penFor(swatches, id), count, share: 0 }));
  return mergeColors(colors);
}

function mergeColors(colors: readonly ColorShare[]): ColorShare[] {
  const map = new Map<string, ColorShare>();
  for (const color of colors) {
    const current = map.get(color.id);
    if (current) current.count += color.count;
    else map.set(color.id, { ...color, share: 0 });
  }
  const list = [...map.values()];
  const total = list.reduce((sum, color) => sum + color.count, 0);
  return list
    .map((color) => ({ ...color, share: total ? color.count / total : 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function penFor(swatches: readonly HighlightSwatch[], id: string): { id: string; name: string; color: string } {
  const found = swatches.find((item) => item.id === id);
  const color = found && HEX.test(found.color) ? found.color.toUpperCase() : "";
  if (found && color && found.name.trim()) return { id: found.id, name: found.name.trim(), color };
  const fallback = swatchById([...swatches], id);
  if (fallback.id === id && HEX.test(fallback.color) && fallback.name.trim()) {
    return { id: fallback.id, name: fallback.name.trim(), color: fallback.color.toUpperCase() };
  }
  return { id, name: SAVED_COLOUR, color: SAVED_HEX };
}

function nameLookup(names?: readonly { id: number; name: string }[]) {
  const map = new Map<number, string>();
  for (const item of names ?? []) {
    if (item.name.trim()) map.set(item.id, item.name.trim());
  }
  return (id: number) => map.get(id) || surahById(id)?.name || `Surah ${id}`;
}

function placed(verseKey: string): Placed | null {
  const parsed = parseVerseKey(verseKey);
  if (!parsed) return null;
  const index = ayahIndex(parsed.chapterId, parsed.verseNumber);
  if (index < 0) return null;
  return { ...parsed, index, verseKey: `${parsed.chapterId}:${parsed.verseNumber}` };
}

function validHighlights(items: readonly Highlight[]): Highlight[] {
  return items.filter((item) => item && placed(item.verseKey) && item.id);
}

function validNotes(items: readonly Note[]): Note[] {
  return items.filter((item) => item && placed(item.verseKey) && item.id);
}

function validBookmarks(items: readonly Bookmark[]): Bookmark[] {
  return items.filter((item) => item && placed(item.verseKey) && item.id);
}

function countByChapter(keys: readonly string[]) {
  const map = new Map<number, number>();
  for (const key of keys) {
    const place = placed(key);
    if (!place) continue;
    map.set(place.chapterId, (map.get(place.chapterId) ?? 0) + 1);
  }
  return map;
}
