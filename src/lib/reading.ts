import type { Verse } from "@/lib/quran/types";

export const POPULAR_SURAH_IDS = [1, 2, 3, 4, 18, 36, 55, 67, 112] as const;
export const TOTAL_SURAHS = 114;
export const TOTAL_AYAHS = 6236;

export const SURAH_VERSE_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227,
  93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78,
  96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22,
  17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
] as const;

export const COMPLETION_PIECES = 160;

export const RESUME_AFTER_MS = 10 * 60 * 1000;
export const READING_TICK_SECONDS = 15;
export const READING_IDLE_MS = 15 * 60 * 1000;

export type ReadingProgress = {
  surahsRead: number[];
  /** How many times each finished surah was completed (not ayah glance counts). */
  surahCompletions: Record<number, number>;
  lastReadDay: string | null;
  streak: number;
  totalSeconds: number;
  versesRead: string[];
  /** Times each ayah was dwelt on, played, highlighted, or noted. */
  verseVisits: Record<string, number>;
  lastVerseKey: string | null;
  lastActiveAt: number | null;
};

export const defaultReadingProgress: ReadingProgress = {
  surahsRead: [],
  surahCompletions: {},
  lastReadDay: null,
  streak: 0,
  totalSeconds: 0,
  versesRead: [],
  verseVisits: {},
  lastVerseKey: null,
  lastActiveAt: null,
};

export function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function bumpStreak(progress: ReadingProgress, day = todayKey()): ReadingProgress {
  if (progress.lastReadDay === day) return progress;
  const yesterday = todayKey(new Date(Date.now() - 86400000));
  return {
    ...progress,
    lastReadDay: day,
    streak: progress.lastReadDay === yesterday ? progress.streak + 1 : 1,
  };
}

export function addReadingSeconds(progress: ReadingProgress, seconds: number): ReadingProgress {
  return bumpStreak({ ...progress, totalSeconds: progress.totalSeconds + seconds });
}

export function subtractReadingSeconds(progress: ReadingProgress, seconds: number): ReadingProgress {
  if (seconds <= 0) return progress;
  return { ...progress, totalSeconds: Math.max(0, progress.totalSeconds - seconds) };
}

export function isMushafPath(pathname: string | null | undefined) {
  if (!pathname) return false;
  return pathname === "/read" || pathname.startsWith("/surah/") || pathname.startsWith("/juz/");
}

export function isResumeDue(progress: ReadingProgress, now = Date.now()) {
  if (!progress.lastVerseKey || !progress.lastActiveAt) return false;
  return now - progress.lastActiveAt >= RESUME_AFTER_MS;
}

export function saveReadingPlace(
  progress: ReadingProgress,
  verseKey: string | null | undefined,
  options: { touch?: boolean } = {},
): ReadingProgress {
  if (!verseKey) return progress;
  const touch = options.touch !== false;
  const same = progress.lastVerseKey === verseKey;
  if (same && !touch) return progress;
  if (same && touch) return { ...progress, lastActiveAt: Date.now() };
  if (!touch) return { ...progress, lastVerseKey: verseKey };
  return { ...progress, lastVerseKey: verseKey, lastActiveAt: Date.now() };
}

export function isSurahFullyRead(versesRead: string[], chapterId: number) {
  if (!Number.isInteger(chapterId) || chapterId < 1 || chapterId > TOTAL_SURAHS) return false;
  const ayahs = SURAH_VERSE_COUNTS[chapterId - 1];
  const set = new Set(versesRead);
  for (let verseNumber = 1; verseNumber <= ayahs; verseNumber += 1) {
    if (!set.has(`${chapterId}:${verseNumber}`)) return false;
  }
  return true;
}

/** Add any surah whose every ayah is already in versesRead. */
export function syncSurahsRead(progress: ReadingProgress): ReadingProgress {
  const set = new Set(progress.versesRead);
  const extra: number[] = [];
  for (let chapterId = 1; chapterId <= TOTAL_SURAHS; chapterId += 1) {
    if (progress.surahsRead.includes(chapterId)) continue;
    const ayahs = SURAH_VERSE_COUNTS[chapterId - 1];
    let complete = true;
    for (let verseNumber = 1; verseNumber <= ayahs; verseNumber += 1) {
      if (!set.has(`${chapterId}:${verseNumber}`)) {
        complete = false;
        break;
      }
    }
    if (complete) extra.push(chapterId);
  }
  if (extra.length === 0) return progress;
  const surahCompletions = { ...normalizeSurahCompletions(progress.surahCompletions, progress.surahsRead) };
  for (const chapterId of extra) {
    surahCompletions[chapterId] = Math.max(1, surahCompletions[chapterId] ?? 0);
  }
  return {
    ...progress,
    surahsRead: [...progress.surahsRead, ...extra].sort((a, b) => a - b),
    surahCompletions,
  };
}

export function normalizeSurahCompletions(
  raw: unknown,
  surahsRead: number[],
): Record<number, number> {
  const out: Record<number, number> = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const chapterId = Number(key);
      if (!Number.isInteger(chapterId) || chapterId < 1 || chapterId > TOTAL_SURAHS) continue;
      if (typeof value !== "number" || !Number.isFinite(value) || value < 1) continue;
      out[chapterId] = Math.min(10_000, Math.floor(value));
    }
  }
  for (const chapterId of surahsRead) {
    if (!Number.isInteger(chapterId) || chapterId < 1 || chapterId > TOTAL_SURAHS) continue;
    if (!out[chapterId]) out[chapterId] = 1;
  }
  return out;
}

function recordSurahCompletion(progress: ReadingProgress, chapterId: number): ReadingProgress {
  const surahCompletions = { ...normalizeSurahCompletions(progress.surahCompletions, progress.surahsRead) };
  const already = progress.surahsRead.includes(chapterId);
  surahCompletions[chapterId] = already ? (surahCompletions[chapterId] ?? 1) + 1 : 1;
  const surahsRead = already
    ? progress.surahsRead
    : [...progress.surahsRead, chapterId].sort((a, b) => a - b);
  return { ...progress, surahsRead, surahCompletions };
}

export function markVerseRead(progress: ReadingProgress, verseKey: string): ReadingProgress {
  const next = bumpStreak(progress);
  const visits = { ...next.verseVisits };
  visits[verseKey] = (visits[verseKey] ?? 0) + 1;
  const versesRead = next.versesRead.includes(verseKey) ? next.versesRead : [...next.versesRead, verseKey];
  let result: ReadingProgress = {
    ...next,
    versesRead,
    verseVisits: visits,
    surahCompletions: normalizeSurahCompletions(next.surahCompletions, next.surahsRead),
  };

  const place = parseVerseKey(verseKey);
  if (!place || result.surahsRead.includes(place.chapterId)) return result;

  const ayahs = SURAH_VERSE_COUNTS[place.chapterId - 1];
  // First finish: last ayah reached, or every ayah already marked.
  if (place.verseNumber === ayahs || isSurahFullyRead(versesRead, place.chapterId)) {
    return recordSurahCompletion(result, place.chapterId);
  }
  return result;
}

export function normalizeVerseVisits(visits: unknown, versesRead: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (visits && typeof visits === "object" && !Array.isArray(visits)) {
    for (const [key, value] of Object.entries(visits as Record<string, unknown>)) {
      if (typeof key !== "string" || !key.includes(":")) continue;
      if (typeof value !== "number" || !Number.isFinite(value) || value < 1) continue;
      out[key] = Math.min(100_000, Math.floor(value));
    }
  }
  if (Object.keys(out).length === 0) {
    for (const key of versesRead) {
      if (typeof key === "string" && key.includes(":")) out[key] = 1;
    }
  }
  return out;
}

export function mergeVerseVisits(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = { ...a };
  for (const [key, value] of Object.entries(b)) {
    out[key] = Math.max(out[key] ?? 0, value);
  }
  return out;
}

export function mergeSurahCompletions(
  a: Record<number, number>,
  b: Record<number, number>,
): Record<number, number> {
  const out = { ...a };
  for (const [key, value] of Object.entries(b)) {
    const chapterId = Number(key);
    out[chapterId] = Math.max(out[chapterId] ?? 0, value);
  }
  return out;
}

export type RankedSurah = { chapterId: number; completions: number; ayahs: number };
export type RankedAyah = { verseKey: string; chapterId: number; verseNumber: number; visits: number };

/**
 * Surahs from progress.surahsRead — same list as “Surahs finished”.
 * Completions come from surahCompletions (one per real finish), not ayah glance counts.
 */
export function topCompletedSurahs(progress: ReadingProgress, limit = 5): RankedSurah[] {
  const completions = normalizeSurahCompletions(progress.surahCompletions, progress.surahsRead);
  return progress.surahsRead
    .filter((chapterId) => Number.isInteger(chapterId) && chapterId >= 1 && chapterId <= TOTAL_SURAHS)
    .map((chapterId) => ({
      chapterId,
      completions: completions[chapterId] ?? 1,
      ayahs: SURAH_VERSE_COUNTS[chapterId - 1],
    }))
    .sort((a, b) => b.completions - a.completions || a.chapterId - b.chapterId)
    .slice(0, limit);
}

/** @deprecated Use topCompletedSurahs */
export function topSurahsByVisits(progress: ReadingProgress, limit = 5): RankedSurah[] {
  return topCompletedSurahs(progress, limit);
}

export function topAyahsByVisits(progress: ReadingProgress, limit = 5): RankedAyah[] {
  const visits = normalizeVerseVisits(progress.verseVisits, progress.versesRead);
  return Object.entries(visits)
    .map(([verseKey, count]) => {
      const place = parseVerseKey(verseKey);
      if (!place) return null;
      return { verseKey, chapterId: place.chapterId, verseNumber: place.verseNumber, visits: count };
    })
    .filter((item): item is RankedAyah => Boolean(item))
    .sort((a, b) => b.visits - a.visits || a.chapterId - b.chapterId || a.verseNumber - b.verseNumber)
    .slice(0, limit);
}

export function markSurahRead(progress: ReadingProgress, surahId: number): ReadingProgress {
  const base = bumpStreak(progress);
  if (base.surahsRead.includes(surahId)) return base;
  return recordSurahCompletion(base, surahId);
}

/** Dwell before an on-screen ayah counts as read (ms). Short enough for normal scrolling. */
export const VERSE_READ_DWELL_MS = 900;

export function formatReadingMinutes(totalSeconds: number) {
  return Math.floor(totalSeconds / 60);
}

export function parseVerseKey(key: string | null | undefined) {
  if (!key) return null;
  const [chapterId, verseNumber] = key.split(":").map(Number);
  if (![chapterId, verseNumber].every((value) => Number.isInteger(value) && value > 0)) return null;
  return { chapterId, verseNumber };
}

/** Western digits → Arabic-Indic (٠١٢٣٤٥٦٧٨٩). */
export function toArabicIndicDigits(value: number | string) {
  return String(value).replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)] ?? digit);
}

export function readerHref(verseKey?: string | null) {
  const place = parseVerseKey(verseKey);
  if (!place) return "/read";
  return `/surah/${place.chapterId}#ayah-${place.verseNumber}`;
}

export function versePlaceLabel(
  chapters: { id: number; nameSimple: string }[],
  verseKey?: string | null,
) {
  const place = parseVerseKey(verseKey);
  if (!place) {
    return { href: "/read", title: "Al-Fatihah", ayah: "1:1" };
  }
  return {
    href: `/surah/${place.chapterId}#ayah-${place.verseNumber}`,
    title: chapters.find((item) => item.id === place.chapterId)?.nameSimple ?? `Surah ${place.chapterId}`,
    ayah: `${place.chapterId}:${place.verseNumber}`,
  };
}

export function ayahsReadInSurah(progress: ReadingProgress, chapterId: number) {
  return progress.versesRead.filter((key) => Number(key.split(":")[0]) === chapterId).length;
}

const SURAH_OFFSETS = SURAH_VERSE_COUNTS.reduce<number[]>((offsets, count) => {
  offsets.push((offsets[offsets.length - 1] ?? 0) + count);
  return offsets;
}, [0]);

export function ayahIndex(chapterId: number, verseNumber: number) {
  if (chapterId < 1 || chapterId > TOTAL_SURAHS) return -1;
  const count = SURAH_VERSE_COUNTS[chapterId - 1];
  if (verseNumber < 1 || verseNumber > count) return -1;
  return SURAH_OFFSETS[chapterId - 1] + verseNumber - 1;
}

export function ayahAtIndex(index: number) {
  if (index < 0 || index >= TOTAL_AYAHS) return null;
  let chapterId = 1;
  while (chapterId < TOTAL_SURAHS && index >= SURAH_OFFSETS[chapterId]) chapterId += 1;
  return { chapterId, verseNumber: index - SURAH_OFFSETS[chapterId - 1] + 1 };
}

export function quranPieceMap(versesRead: string[], pieceCount = COMPLETION_PIECES) {
  const sizes = new Uint16Array(pieceCount);
  const hits = new Uint16Array(pieceCount);
  for (let index = 0; index < TOTAL_AYAHS; index += 1) {
    sizes[Math.min(pieceCount - 1, Math.floor((index * pieceCount) / TOTAL_AYAHS))] += 1;
  }
  for (const key of versesRead) {
    const place = parseVerseKey(key);
    if (!place) continue;
    const index = ayahIndex(place.chapterId, place.verseNumber);
    if (index < 0) continue;
    hits[Math.min(pieceCount - 1, Math.floor((index * pieceCount) / TOTAL_AYAHS))] += 1;
  }
  const coverage = Array.from(hits, (hit, i) => (sizes[i] ? hit / sizes[i] : 0));
  const filled = coverage.filter((value) => value > 0).length;
  const uniqueSurahs = new Set(versesRead.map((key) => Number(key.split(":")[0])).filter((id) => id > 0)).size;
  return {
    coverage,
    percent: versesRead.length ? Math.round((versesRead.length / TOTAL_AYAHS) * 1000) / 10 : 0,
    filled,
    pieceCount,
    scattered: uniqueSurahs >= 3 || (versesRead.length >= 8 && filled >= 4 && filled / Math.max(versesRead.length, 1) > 0.35),
    uniqueSurahs,
  };
}

export function pieceAyahRange(piece: number, pieceCount = COMPLETION_PIECES) {
  const start = Math.floor((piece * TOTAL_AYAHS) / pieceCount);
  const end = Math.floor(((piece + 1) * TOTAL_AYAHS) / pieceCount) - 1;
  return { start: ayahAtIndex(start), end: ayahAtIndex(Math.max(start, end)) };
}

export async function shareOrCopy(title: string, text: string) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return;
  }
  await navigator.clipboard.writeText(text);
}

export function verseShareText(verse: Pick<Verse, "verseKey" | "textUthmani" | "translation" | "translations">) {
  const extra = (verse.translations ?? []).map((item) => item.text).filter(Boolean);
  const body = extra.length ? extra.join("\n") : verse.translation;
  return `${verse.verseKey}\n${verse.textUthmani}\n${body}`;
}
