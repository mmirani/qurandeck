import type { Highlight, HighlightLayer, HighlightSwatch } from "./quran/types";

export const DEFAULT_SWATCH_ID = "yellow";

export const defaultSwatches: HighlightSwatch[] = [
  { id: DEFAULT_SWATCH_ID, name: "Yellow", color: "#F5D76E" },
  { id: "green", name: "Green", color: "#86EFAC" },
  { id: "blue", name: "Sky", color: "#7DD3FC" },
  { id: "pink", name: "Rose", color: "#F9A8D4" },
];

export function looksArabic(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

export function swatchById(swatches: HighlightSwatch[], id: string) {
  return swatches.find((item) => item.id === id) ?? swatches[0] ?? defaultSwatches[0];
}

export function highlightListCopy(
  item: Highlight,
  extras?: {
    chapterName?: string;
    translation?: string;
    penName?: string;
  },
) {
  const place = extras?.chapterName ? `${extras.chapterName} · ${item.verseKey}` : item.verseKey;
  const title = extras?.penName ? `${place} · ${extras.penName}` : place;
  if (item.layer === "ayah") {
    const english = extras?.translation?.trim() || (looksArabic(item.text) ? "" : item.text.trim());
    return { title, body: english };
  }
  if (item.layer === "arabic" || looksArabic(item.text)) {
    return { title, body: extras?.translation?.trim() ?? "" };
  }
  return { title, body: item.text };
}

export function verseHighlights(highlights: Highlight[], verseKey: string) {
  return highlights.filter((item) => item.verseKey === verseKey);
}

export function ayahHighlight(highlights: Highlight[], verseKey: string) {
  return highlights.find((item) => item.verseKey === verseKey && item.layer === "ayah") ?? null;
}

export function wordHighlight(highlights: Highlight[], verseKey: string, position: number) {
  return highlights.find(
    (item) =>
      item.verseKey === verseKey &&
      item.layer === "arabic" &&
      (item.startWord ?? 0) <= position &&
      position <= (item.endWord ?? 0),
  );
}

export type MarkSpan = { text: string; highlight?: Highlight };

export function markPlainText(text: string, marks: Highlight[]): MarkSpan[] {
  const ranges = marks
    .filter((item) => item.startOffset != null && item.endOffset != null && item.endOffset > item.startOffset)
    .map((item) => ({
      highlight: item,
      start: Math.max(0, item.startOffset ?? 0),
      end: Math.min(text.length, item.endOffset ?? 0),
    }))
    .filter((item) => item.end > item.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  if (ranges.length === 0) return [{ text }];

  const spans: MarkSpan[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) continue;
    if (range.start > cursor) spans.push({ text: text.slice(cursor, range.start) });
    spans.push({ text: text.slice(range.start, range.end), highlight: range.highlight });
    cursor = range.end;
  }
  if (cursor < text.length) spans.push({ text: text.slice(cursor) });
  return spans;
}

export function selectionOffsets(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  const before = document.createRange();
  before.selectNodeContents(root);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  const text = range.toString();
  const end = start + text.length;
  if (!text.trim() || end <= start) return null;
  return { start, end, text: text.trim() };
}

function nextId() {
  return crypto.randomUUID();
}

export function toggleAyahHighlight(
  highlights: Highlight[],
  verseKey: string,
  swatchId: string,
  text: string,
): Highlight[] {
  const existing = ayahHighlight(highlights, verseKey);
  if (existing?.swatchId === swatchId) {
    return highlights.filter((item) => item.id !== existing.id);
  }
  const next: Highlight = {
    id: existing?.id ?? nextId(),
    verseKey,
    layer: "ayah",
    swatchId,
    text,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  if (existing) return highlights.map((item) => (item.id === existing.id ? next : item));
  return [...highlights, next];
}

export function addTextHighlight(
  highlights: Highlight[],
  verseKey: string,
  layer: Exclude<HighlightLayer, "arabic" | "ayah">,
  swatchId: string,
  start: number,
  end: number,
  text: string,
): Highlight[] {
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const overlapping = highlights.filter(
    (item) =>
      item.verseKey === verseKey &&
      item.layer === layer &&
      (item.startOffset ?? 0) < hi &&
      (item.endOffset ?? 0) > lo,
  );
  const without = highlights.filter((item) => !overlapping.some((hit) => hit.id === item.id));
  return [
    ...without,
    {
      id: nextId(),
      verseKey,
      layer,
      swatchId,
      text,
      startOffset: lo,
      endOffset: hi,
      createdAt: new Date().toISOString(),
    },
  ];
}

export function toggleArabicWord(
  highlights: Highlight[],
  verseKey: string,
  position: number,
  swatchId: string,
  text: string,
): Highlight[] {
  const covering = wordHighlight(highlights, verseKey, position);
  if (covering && covering.swatchId === swatchId) {
    return splitArabic(highlights, covering, position);
  }

  let next = covering ? splitArabic(highlights, covering, position) : highlights;
  next = [
    ...next,
    {
      id: nextId(),
      verseKey,
      layer: "arabic",
      swatchId,
      text,
      startWord: position,
      endWord: position,
      createdAt: new Date().toISOString(),
    },
  ];
  return mergeArabic(next, verseKey, swatchId);
}

export function paintArabicRange(
  highlights: Highlight[],
  verseKey: string,
  startWord: number,
  endWord: number,
  swatchId: string,
  text: string,
): Highlight[] {
  const lo = Math.min(startWord, endWord);
  const hi = Math.max(startWord, endWord);
  const overlapping = highlights.filter(
    (item) =>
      item.verseKey === verseKey &&
      item.layer === "arabic" &&
      (item.startWord ?? 0) <= hi &&
      (item.endWord ?? 0) >= lo,
  );
  let next = highlights.filter((item) => !overlapping.some((hit) => hit.id === item.id));
  next = [
    ...next,
    {
      id: nextId(),
      verseKey,
      layer: "arabic",
      swatchId,
      text,
      startWord: lo,
      endWord: hi,
      createdAt: new Date().toISOString(),
    },
  ];
  return mergeArabic(next, verseKey, swatchId);
}

function splitArabic(highlights: Highlight[], covering: Highlight, position: number): Highlight[] {
  const start = covering.startWord ?? position;
  const end = covering.endWord ?? position;
  const rest = highlights.filter((item) => item.id !== covering.id);
  if (start === end) return rest;
  const pieces: Highlight[] = [];
  if (position > start) {
    pieces.push({ ...covering, id: nextId(), endWord: position - 1 });
  }
  if (position < end) {
    pieces.push({ ...covering, id: nextId(), startWord: position + 1, createdAt: new Date().toISOString() });
  }
  return [...rest, ...pieces];
}

function mergeArabic(highlights: Highlight[], verseKey: string, swatchId: string): Highlight[] {
  const group = highlights
    .filter((item) => item.verseKey === verseKey && item.layer === "arabic" && item.swatchId === swatchId)
    .sort((a, b) => (a.startWord ?? 0) - (b.startWord ?? 0));
  const others = highlights.filter(
    (item) => !(item.verseKey === verseKey && item.layer === "arabic" && item.swatchId === swatchId),
  );
  const merged: Highlight[] = [];
  for (const item of group) {
    const last = merged[merged.length - 1];
    if (last && (item.startWord ?? 0) <= (last.endWord ?? 0) + 1) {
      last.endWord = Math.max(last.endWord ?? 0, item.endWord ?? 0);
      last.text = `${last.text} ${item.text}`.trim();
    } else {
      merged.push({ ...item });
    }
  }
  return [...others, ...merged];
}

export function removeHighlight(highlights: Highlight[], id: string) {
  return highlights.filter((item) => item.id !== id);
}

export function removeHighlights(highlights: Highlight[], ids: string[]) {
  if (ids.length === 0) return highlights;
  const drop = new Set(ids);
  return highlights.filter((item) => !drop.has(item.id));
}

export function clearVerseHighlights(highlights: Highlight[], verseKey: string) {
  return highlights.filter((item) => item.verseKey !== verseKey);
}

export function overlappingTextMarks(marks: Highlight[], start: number, end: number) {
  return marks.filter(
    (item) =>
      item.startOffset != null &&
      item.endOffset != null &&
      item.startOffset < end &&
      item.endOffset > start,
  );
}
