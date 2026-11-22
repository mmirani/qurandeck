import {
  SURAH_VERSE_COUNTS,
  TOTAL_AYAHS,
  TOTAL_SURAHS,
  ayahIndex,
  asDayKey,
  isDayKey,
  isFutureDay,
  parseDayKey,
  markVerseRead,
  parseVerseKey,
  todayKey,
  type ReadingProgress,
} from "@/lib/reading";

/** One finished reading of the whole Quran, kept in the sealed library JSON. */
export type FinishedReading = {
  /** Stable per cycle, so two devices recording the same finish merge as one. */
  id: string;
  index: number;
  startedOn: string;
  finishedOn: string;
  days: number;
  ayahs: number;
  surahs: number;
  /**
   * When the finish moment was seen, as epoch ms. Null means it is still pending.
   * Merges prefer any seen stamp, and a later stamp is only used to beat clock skew.
   */
  seenAt: number | null;
};

export const DEFAULT_READING_CYCLE = 1;

export function finishedReadingId(cycle: number) {
  return `fr-cycle-${Math.max(1, Math.floor(cycle))}`;
}

/** Every ayah key from Al-Fatihah 1:1 to An-Nas 114:6, in order. */
export function allVerseKeys(): string[] {
  const keys: string[] = [];
  for (let chapter = 1; chapter <= TOTAL_SURAHS; chapter += 1) {
    const count = SURAH_VERSE_COUNTS[chapter - 1];
    for (let verse = 1; verse <= count; verse += 1) keys.push(`${chapter}:${verse}`);
  }
  return keys;
}

/** True only when every ayah of the mushaf is in versesRead. */
export function isQuranFinished(progress: Pick<ReadingProgress, "versesRead">): boolean {
  if (progress.versesRead.length < TOTAL_AYAHS) return false;
  const lit = new Uint8Array(TOTAL_AYAHS);
  let total = 0;
  for (const key of progress.versesRead) {
    const place = parseVerseKey(key);
    if (!place) continue;
    const index = ayahIndex(place.chapterId, place.verseNumber);
    if (index < 0 || lit[index] === 1) continue;
    lit[index] = 1;
    total += 1;
  }
  return total >= TOTAL_AYAHS;
}

/** Inclusive calendar days between two local day keys. Same day is 1. */
export function daysInclusive(start: string, end: string): number {
  const from = parseDayKey(start);
  const to = parseDayKey(end);
  if (!from || !to) return 1;
  const diff = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  return Math.max(1, diff + 1);
}

export function readingCycleOf(progress: Pick<ReadingProgress, "readingCycle">) {
  const cycle = progress.readingCycle;
  if (typeof cycle !== "number" || !Number.isFinite(cycle) || cycle < 1) return DEFAULT_READING_CYCLE;
  return Math.min(10_000, Math.floor(cycle));
}

export function inferReadingStart(progress: Pick<ReadingProgress, "readingStartedOn" | "historySince" | "daily">, day: string): string {
  const explicit = asDayKey(progress.readingStartedOn);
  if (explicit) return explicit;
  const since = asDayKey(progress.historySince);
  if (since) return since;
  const days = Object.keys(progress.daily ?? {}).filter((key) => isDayKey(key)).sort();
  if (days[0]) return days[0];
  return isDayKey(day) ? day : todayKey();
}

function clampRange(startedOn: string, finishedOn: string): { startedOn: string; finishedOn: string; days: number } {
  const end = finishedOn;
  const start = startedOn > end ? end : startedOn;
  return { startedOn: start, finishedOn: end, days: daysInclusive(start, end) };
}

export function normalizeFinishedReading(raw: unknown): FinishedReading | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<FinishedReading>;
  const finishedOn = asDayKey(value.finishedOn);
  if (!finishedOn) return null;
  const index = typeof value.index === "number" && Number.isInteger(value.index) && value.index >= 1 ? value.index : 0;
  const id = typeof value.id === "string" && /^fr-cycle-\d+$/.test(value.id) ? value.id : index ? finishedReadingId(index) : null;
  if (!id) return null;
  const cycleFromId = Number(id.slice("fr-cycle-".length));
  const resolvedIndex = index || cycleFromId;
  const startedOn = asDayKey(value.startedOn) ?? finishedOn;
  const range = clampRange(startedOn, finishedOn);
  const seenAt =
    typeof value.seenAt === "number" && Number.isFinite(value.seenAt) && value.seenAt > 0 ? Math.floor(value.seenAt) : null;
  const ayahs = typeof value.ayahs === "number" && Number.isFinite(value.ayahs) ? Math.max(0, Math.floor(value.ayahs)) : TOTAL_AYAHS;
  const surahs = typeof value.surahs === "number" && Number.isFinite(value.surahs) ? Math.max(0, Math.floor(value.surahs)) : TOTAL_SURAHS;
  return {
    id,
    index: resolvedIndex,
    startedOn: range.startedOn,
    finishedOn: range.finishedOn,
    days: range.days,
    ayahs: ayahs || TOTAL_AYAHS,
    surahs: surahs || TOTAL_SURAHS,
    seenAt,
  };
}

export function normalizeFinishedReadings(raw: unknown): FinishedReading[] {
  if (!Array.isArray(raw)) return [];
  const byId = new Map<string, FinishedReading>();
  for (const item of raw) {
    const reading = normalizeFinishedReading(item);
    if (!reading) continue;
    const current = byId.get(reading.id);
    byId.set(reading.id, current ? mergeFinishedReading(current, reading) : reading);
  }
  return [...byId.values()].sort((a, b) => a.index - b.index || a.finishedOn.localeCompare(b.finishedOn));
}

export function mergeFinishedReading(a: FinishedReading, b: FinishedReading): FinishedReading {
  const startedOn = a.startedOn <= b.startedOn ? a.startedOn : b.startedOn;
  const finishedOn = a.finishedOn >= b.finishedOn ? a.finishedOn : b.finishedOn;
  const range = clampRange(startedOn, finishedOn);
  const seenAt = a.seenAt == null ? b.seenAt : b.seenAt == null ? a.seenAt : Math.max(a.seenAt, b.seenAt);
  return {
    id: a.id,
    index: Math.max(a.index, b.index),
    startedOn: range.startedOn,
    finishedOn: range.finishedOn,
    days: range.days,
    ayahs: Math.max(a.ayahs, b.ayahs),
    surahs: Math.max(a.surahs, b.surahs),
    seenAt,
  };
}

export function mergeFinishedReadings(a: FinishedReading[] | undefined, b: FinishedReading[] | undefined): FinishedReading[] {
  const byId = new Map<string, FinishedReading>();
  for (const item of [...(a ?? []), ...(b ?? [])]) {
    const current = byId.get(item.id);
    byId.set(item.id, current ? mergeFinishedReading(current, item) : item);
  }
  return [...byId.values()].sort((x, y) => x.index - y.index || x.finishedOn.localeCompare(y.finishedOn));
}

/** The unfinished celebration, if any: the earliest unseen finished reading. */
export function pendingFinishedReading(progress: Pick<ReadingProgress, "finishedReadings">): FinishedReading | null {
  const unread = (progress.finishedReadings ?? []).filter((item) => item.seenAt == null);
  if (unread.length === 0) return null;
  return unread.sort((a, b) => a.index - b.index || a.finishedOn.localeCompare(b.finishedOn))[0] ?? null;
}

export function monthOfFinishedReading(reading: Pick<FinishedReading, "finishedOn">): number {
  const date = parseDayKey(reading.finishedOn);
  return date ? date.getMonth() + 1 : 1;
}

/**
 * Record a finished reading when the map first becomes complete for this cycle.
 * Idempotent: a second call for the same cycle does not add another row.
 */
export function ensureFinishedReading(progress: ReadingProgress, day = todayKey(), now = new Date()): ReadingProgress {
  const finishedOn = isDayKey(day) && !isFutureDay(day, now) ? day : todayKey(now);
  const readings = normalizeFinishedReadings(progress.finishedReadings);
  const cycle = readingCycleOf(progress);
  if (!isQuranFinished(progress)) return { ...progress, readingCycle: cycle, finishedReadings: readings };

  const id = finishedReadingId(cycle);
  if (readings.some((item) => item.id === id)) return { ...progress, readingCycle: cycle, finishedReadings: readings };

  const range = clampRange(inferReadingStart(progress, finishedOn), finishedOn);
  const recorded: FinishedReading = {
    id,
    index: cycle,
    startedOn: range.startedOn,
    finishedOn: range.finishedOn,
    days: range.days,
    ayahs: TOTAL_AYAHS,
    surahs: TOTAL_SURAHS,
    seenAt: null,
  };
  return {
    ...progress,
    readingCycle: cycle,
    readingStartedOn: progress.readingStartedOn ?? range.startedOn,
    finishedReadings: [...readings, recorded].sort((a, b) => a.index - b.index),
  };
}

/**
 * Mark the finish moment as seen. The stamp beats any existing seen time and an
 * optional "over" time from another device, so a clock that is behind still wins.
 */
export function markFinishedReadingSeen(
  progress: ReadingProgress,
  id: string,
  options: { now?: number; over?: number } = {},
): ReadingProgress {
  const now = options.now ?? Date.now();
  const readings = (progress.finishedReadings ?? []).map((item) => {
    if (item.id !== id) return item;
    const seenAt = Math.max(now, (options.over ?? 0) + 1, item.seenAt ?? 0);
    return { ...item, seenAt };
  });
  return { ...progress, finishedReadings: readings };
}

/**
 * Clear the map to begin a new reading. Notes and highlights are not in
 * progress, so they stay in the library. Lifetime surah completion counts stay.
 * The cycle number only ever increases, so a slower clock cannot undo this on merge.
 */
export function startNewReading(progress: ReadingProgress, day = todayKey(), now = Date.now()): ReadingProgress {
  const withRecord = ensureFinishedReading(progress, day);
  const pending = pendingFinishedReading(withRecord);
  const seen = pending ? markFinishedReadingSeen(withRecord, pending.id, { now }) : withRecord;
  const startedOn = isDayKey(day) ? day : todayKey();
  return {
    ...seen,
    readingCycle: readingCycleOf(seen) + 1,
    readingStartedOn: startedOn,
    versesRead: [],
    verseVisits: {},
    surahsRead: [],
    lastVerseKey: "1:1",
    lastActiveAt: Math.max(now, (seen.lastActiveAt ?? 0) + 1),
  };
}

/**
 * Merge map fields when two devices may be on different reading cycles.
 * The higher cycle wins the map, so starting again is not undone by a device
 * that still holds the old 100% versesRead, even if its clock is ahead.
 */
export function pickCycleProgress(local: ReadingProgress, remote: ReadingProgress): Pick<
  ReadingProgress,
  "readingCycle" | "readingStartedOn" | "versesRead" | "verseVisits" | "surahsRead"
> {
  const localCycle = readingCycleOf(local);
  const remoteCycle = readingCycleOf(remote);
  if (localCycle === remoteCycle) {
    const started =
      local.readingStartedOn && remote.readingStartedOn
        ? local.readingStartedOn <= remote.readingStartedOn
          ? local.readingStartedOn
          : remote.readingStartedOn
        : local.readingStartedOn ?? remote.readingStartedOn ?? null;
    return {
      readingCycle: localCycle,
      readingStartedOn: started,
      versesRead: [...new Set([...remote.versesRead, ...local.versesRead])],
      verseVisits: local.verseVisits,
      surahsRead: [...new Set([...remote.surahsRead, ...local.surahsRead])].sort((a, b) => a - b),
    };
  }
  const source = localCycle > remoteCycle ? local : remote;
  return {
    readingCycle: readingCycleOf(source),
    readingStartedOn: source.readingStartedOn ?? null,
    versesRead: [...source.versesRead],
    verseVisits: { ...source.verseVisits },
    surahsRead: [...source.surahsRead],
  };
}

/** Fill defaults and record a backfill row for a library already at 100%. */
export function reconcileFinishedReadings(progress: ReadingProgress, day = todayKey(), now = new Date()): ReadingProgress {
  return ensureFinishedReading(
    {
      ...progress,
      readingCycle: readingCycleOf(progress),
      readingStartedOn: asDayKey(progress.readingStartedOn) ?? progress.readingStartedOn ?? null,
      finishedReadings: normalizeFinishedReadings(progress.finishedReadings),
    },
    day,
    now,
  );
}

/** Mark an ayah read and record a finished reading if this was the last one. */
export function readVerse(progress: ReadingProgress, verseKey: string, day = todayKey()): ReadingProgress {
  return reconcileFinishedReadings(markVerseRead(progress, verseKey, day), day);
}
