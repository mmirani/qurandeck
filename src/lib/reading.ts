import type { Verse } from "@/lib/quran/types";
import { trackUsage } from "@/lib/usage-client";

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
  /**
   * Day totals only. Keys are `YYYY-MM-DD`, or `YYYY-MM` after older days are folded.
   * Values are seconds and newly marked ayahs — never which ayah, and never note text.
   */
  daily: DailyMap;
  /** First local day a daily count was recorded. Null until that happens. */
  historySince: string | null;
};

/** Seconds read and ayahs newly marked on one day or one rolled-up month. */
export type DailyTally = { seconds: number; ayahs: number };
export type DailyMap = Record<string, DailyTally>;

/** Keep this many recent days as individual keys. Older days fold into `YYYY-MM`. */
export const DAILY_DETAIL_DAYS = 400;
const MAX_DAY_SECONDS = 86_400;
const MAX_MONTH_SECONDS = 31 * MAX_DAY_SECONDS;

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
  daily: {},
  historySince: null,
};

export function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isDayKey(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function asDayKey(value: unknown): string | null {
  return typeof value === "string" && isDayKey(value) ? value : null;
}

export function isMonthKey(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5));
  return month >= 1 && month <= 12;
}

export function parseDayKey(value: string): Date | null {
  if (!isDayKey(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function shiftDayKey(day: string, delta: number): string {
  const date = parseDayKey(day);
  if (!date) return day;
  date.setDate(date.getDate() + delta);
  return todayKey(date);
}

/** True when `day` is after the local calendar day of `now`. Day keys are local, not UTC. */
export function isFutureDay(day: string, now = new Date()) {
  return isDayKey(day) && day > todayKey(now);
}

export function lastDayKeyOfMonth(month: string): string {
  if (!isMonthKey(month)) return month;
  const [year, monthIndex] = month.split("-").map(Number);
  return todayKey(new Date(year, monthIndex, 0));
}

function cleanCount(value: unknown, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return 0;
  return Math.min(max, Math.floor(value));
}

function cleanTally(value: unknown, maxSeconds: number): DailyTally | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<DailyTally>;
  const seconds = cleanCount(raw.seconds, maxSeconds);
  const ayahs = cleanCount(raw.ayahs, TOTAL_AYAHS);
  if (seconds === 0 && ayahs === 0) return null;
  return { seconds, ayahs };
}

export function normalizeDaily(value: unknown): DailyMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: DailyMap = {};
  for (const [key, tally] of Object.entries(value as Record<string, unknown>)) {
    const maxSeconds = isMonthKey(key) ? MAX_MONTH_SECONDS : MAX_DAY_SECONDS;
    if (!isDayKey(key) && !isMonthKey(key)) continue;
    const clean = cleanTally(tally, maxSeconds);
    if (clean) out[key] = clean;
  }
  return out;
}

export function addDaily(daily: DailyMap | undefined, day: string, delta: { seconds?: number; ayahs?: number }): DailyMap {
  const base = daily ?? {};
  if (!isDayKey(day)) return base;
  const current = base[day] ?? { seconds: 0, ayahs: 0 };
  const seconds = Math.min(MAX_DAY_SECONDS, current.seconds + Math.max(0, Math.floor(delta.seconds ?? 0)));
  const ayahs = Math.min(TOTAL_AYAHS, current.ayahs + Math.max(0, Math.floor(delta.ayahs ?? 0)));
  if (seconds === 0 && ayahs === 0) {
    if (!base[day]) return base;
    const next = { ...base };
    delete next[day];
    return next;
  }
  return { ...base, [day]: { seconds, ayahs } };
}

/** Fold days older than the detail window into month totals so the map stays small. */
export function compactDaily(daily: DailyMap, today = todayKey(), keepDays = DAILY_DETAIL_DAYS): DailyMap {
  const cutoff = shiftDayKey(today, -(Math.max(1, keepDays) - 1));
  const next: DailyMap = {};
  for (const [key, tally] of Object.entries(normalizeDaily(daily))) {
    if (isMonthKey(key)) {
      const prev = next[key] ?? { seconds: 0, ayahs: 0 };
      next[key] = {
        seconds: Math.min(MAX_MONTH_SECONDS, prev.seconds + tally.seconds),
        ayahs: Math.min(TOTAL_AYAHS, prev.ayahs + tally.ayahs),
      };
      continue;
    }
    if (key >= cutoff) {
      next[key] = tally;
      continue;
    }
    const month = key.slice(0, 7);
    const prev = next[month] ?? { seconds: 0, ayahs: 0 };
    next[month] = {
      seconds: Math.min(MAX_MONTH_SECONDS, prev.seconds + tally.seconds),
      ayahs: Math.min(TOTAL_AYAHS, prev.ayahs + tally.ayahs),
    };
  }
  return next;
}

/** Per-day max so two devices syncing the same day do not add the counts twice. */
export function mergeDaily(a: DailyMap | undefined, b: DailyMap | undefined): DailyMap {
  const left = normalizeDaily(a);
  const right = normalizeDaily(b);
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  const out: DailyMap = {};
  for (const key of keys) {
    const tallyA = left[key] ?? { seconds: 0, ayahs: 0 };
    const tallyB = right[key] ?? { seconds: 0, ayahs: 0 };
    const seconds = Math.max(tallyA.seconds, tallyB.seconds);
    const ayahs = Math.max(tallyA.ayahs, tallyB.ayahs);
    if (seconds === 0 && ayahs === 0) continue;
    out[key] = { seconds, ayahs };
  }
  return out;
}

export function earlierHistorySince(a: string | null | undefined, b: string | null | undefined): string | null {
  const left = asDayKey(a);
  const right = asDayKey(b);
  if (!left) return right;
  if (!right) return left;
  return left < right ? left : right;
}

function inferredHistorySince(daily: DailyMap, explicit: unknown): string | null {
  const stated = asDayKey(explicit);
  if (stated) return stated;
  let earliest: string | null = null;
  for (const key of Object.keys(daily)) {
    const day = isDayKey(key) ? key : isMonthKey(key) ? `${key}-01` : null;
    if (!day) continue;
    if (!earliest || day < earliest) earliest = day;
  }
  return earliest;
}

export function normalizeReadingProgress(raw: unknown): ReadingProgress {
  if (!raw || typeof raw !== "object") return defaultReadingProgress;
  const value = raw as Partial<ReadingProgress>;
  const versesRead = Array.isArray(value.versesRead) ? value.versesRead.filter((key) => typeof key === "string") : [];
  const surahsRead = Array.isArray(value.surahsRead) ? value.surahsRead.filter((id) => Number.isInteger(id)) : [];
  const daily = compactDaily(normalizeDaily(value.daily));
  const totalSeconds = cleanCount(value.totalSeconds, 1_000_000_000);
  const streak = cleanCount(value.streak, 100_000);
  return {
    surahsRead,
    surahCompletions: normalizeSurahCompletions(value.surahCompletions, surahsRead),
    lastReadDay: typeof value.lastReadDay === "string" ? value.lastReadDay : null,
    streak,
    totalSeconds,
    versesRead,
    verseVisits: normalizeVerseVisits(value.verseVisits, versesRead),
    lastVerseKey: typeof value.lastVerseKey === "string" ? value.lastVerseKey : null,
    lastActiveAt: typeof value.lastActiveAt === "number" && Number.isFinite(value.lastActiveAt) ? value.lastActiveAt : null,
    daily,
    historySince: earlierHistorySince(asDayKey(value.historySince), inferredHistorySince(daily, null)),
  };
}

export function bumpStreak(progress: ReadingProgress, day = todayKey()): ReadingProgress {
  if (progress.lastReadDay === day) return progress;
  const yesterday = shiftDayKey(day, -1);
  return {
    ...progress,
    lastReadDay: day,
    streak: progress.lastReadDay === yesterday ? progress.streak + 1 : 1,
  };
}

export function addReadingSeconds(progress: ReadingProgress, seconds: number, day = todayKey()): ReadingProgress {
  const withStreak = bumpStreak(progress, day);
  if (seconds <= 0) return withStreak;
  const added = Math.floor(seconds);
  if (added <= 0) return withStreak;
  return {
    ...withStreak,
    totalSeconds: withStreak.totalSeconds + added,
    daily: compactDaily(addDaily(withStreak.daily, day, { seconds: added }), day),
    historySince: withStreak.historySince ?? (isDayKey(day) ? day : null),
  };
}

export function subtractReadingSeconds(progress: ReadingProgress, seconds: number, day = todayKey()): ReadingProgress {
  if (seconds <= 0) return progress;
  const removed = Math.floor(seconds);
  const totalSeconds = Math.max(0, progress.totalSeconds - removed);
  const current = progress.daily?.[day];
  if (!current) return { ...progress, totalSeconds };
  const nextSeconds = Math.max(0, current.seconds - removed);
  const daily = { ...progress.daily };
  if (nextSeconds === 0 && current.ayahs === 0) delete daily[day];
  else daily[day] = { ...current, seconds: nextSeconds };
  return { ...progress, totalSeconds, daily };
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

export function markVerseRead(progress: ReadingProgress, verseKey: string, day = todayKey()): ReadingProgress {
  const next = bumpStreak(progress, day);
  const isNew = !next.versesRead.includes(verseKey);
  const visits = { ...next.verseVisits };
  visits[verseKey] = (visits[verseKey] ?? 0) + 1;
  const versesRead = isNew ? [...next.versesRead, verseKey] : next.versesRead;
  let result: ReadingProgress = {
    ...next,
    versesRead,
    verseVisits: visits,
    surahCompletions: normalizeSurahCompletions(next.surahCompletions, next.surahsRead),
  };
  if (isNew && isDayKey(day)) {
    result = {
      ...result,
      daily: compactDaily(addDaily(result.daily, day, { ayahs: 1 }), day),
      historySince: result.historySince ?? day,
    };
  }

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

export function announce(
  message: string,
  text?: string,
  action?: { label: string; onAction: () => void },
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("qurandeck-toast", {
      detail: { message, text, actionLabel: action?.label, onAction: action?.onAction },
    }),
  );
}

export async function shareOrCopy(title: string, text: string) {
  const link = typeof window !== "undefined" ? window.location.href : "";
  const payload = link && !text.includes(link) ? `${text}\n${link}` : text;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({ title, text: payload });
      announce("Shared");
      trackUsage({ name: "feature", feature: "share" });
      return;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return;
  }
  try {
    await navigator.clipboard.writeText(payload);
    announce("Link copied");
    trackUsage({ name: "feature", feature: "share" });
  } catch {
    announce("Copy this link", payload);
  }
}

export function verseShareText(verse: Pick<Verse, "verseKey" | "textUthmani" | "translation" | "translations">) {
  const extra = (verse.translations ?? []).map((item) => item.text).filter(Boolean);
  const body = extra.length ? extra.join("\n") : verse.translation;
  return `${verse.verseKey}\n${verse.textUthmani}\n${body}`;
}
