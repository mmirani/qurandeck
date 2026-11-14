import {
  formatReadingMinutes,
  asDayKey,
  isDayKey,
  isMonthKey,
  lastDayKeyOfMonth,
  parseDayKey,
  shiftDayKey,
  todayKey,
  TOTAL_AYAHS,
  type DailyMap,
  type ReadingProgress,
} from "@/lib/reading";

export type StatsRangeId = "7d" | "30d" | "year" | "all" | "custom";

export const STATS_RANGE_OPTIONS: { id: StatsRangeId; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "year", label: "This year" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom" },
];

export function isStatsRangeId(value: unknown): value is StatsRangeId {
  return value === "7d" || value === "30d" || value === "year" || value === "all" || value === "custom";
}

export type ResolvedStatsRange = {
  id: StatsRangeId;
  /** Inclusive local day, or null for all time. */
  start: string | null;
  end: string | null;
  label: string;
};

export type DatedActivity = { createdAt?: string; updatedAt?: string };

export type DailyRangeSum = {
  seconds: number;
  ayahs: number;
  /** The range overlaps a month bucket that cannot be split into days. */
  coarse: boolean;
  /** Nothing precise fell in the range, so a zero would be a guess. */
  withheld: boolean;
};

export type RangeStats = {
  range: ResolvedStatsRange;
  minutes: number | null;
  ayahs: number | null;
  notes: number;
  highlights: number;
  bookmarks: number;
  streak: number;
  surahsFinished: number;
  mushafPercent: number;
  historyHint: string | null;
};

function localeOf(locale?: string) {
  return locale || undefined;
}

export function formatDay(day: string, locale?: string, withYear = true) {
  const date = parseDayKey(day);
  if (!date) return day;
  return new Intl.DateTimeFormat(localeOf(locale), {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" as const } : {}),
  }).format(date);
}

export function formatMonthYear(isoOrDay: string, locale?: string) {
  const date = parseDayKey(isoOrDay) ?? new Date(isoOrDay);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(localeOf(locale), { month: "short", year: "numeric" }).format(date);
}

export function formatReadingSince(isoOrDay: string, locale?: string) {
  const formatted = formatMonthYear(isoOrDay, locale);
  return formatted ? `Reading since ${formatted}` : "";
}

/** "Nov 1 – Nov 13, 2026", or a single day when the range is one day. */
export function formatSpan(start: string, end: string, locale?: string) {
  if (start === end) return formatDay(start, locale, true);
  const startDate = parseDayKey(start);
  const endDate = parseDayKey(end);
  if (!startDate || !endDate) return `${start} – ${end}`;
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  return `${formatDay(start, locale, !sameYear)} – ${formatDay(end, locale, true)}`;
}

export function formatDailyHistoryStart(day: string, locale?: string) {
  return `Daily history starts ${formatDay(day, locale, true)}`;
}

export function resolveStatsRange(
  prefs: { statsRange?: unknown; statsRangeStart?: unknown; statsRangeEnd?: unknown },
  now = new Date(),
  locale?: string,
): ResolvedStatsRange {
  const id = isStatsRangeId(prefs.statsRange) ? prefs.statsRange : "all";
  const today = todayKey(now);
  if (id === "all") return { id, start: null, end: null, label: "All time" };
  if (id === "7d") {
    const start = shiftDayKey(today, -6);
    return { id, start, end: today, label: formatSpan(start, today, locale) };
  }
  if (id === "30d") {
    const start = shiftDayKey(today, -29);
    return { id, start, end: today, label: formatSpan(start, today, locale) };
  }
  if (id === "year") {
    const start = `${now.getFullYear()}-01-01`;
    const safeStart = isDayKey(start) ? start : today;
    return { id, start: safeStart, end: today, label: formatSpan(safeStart, today, locale) };
  }
  let start = asDayKey(prefs.statsRangeStart);
  let end = asDayKey(prefs.statsRangeEnd);
  if (start && end && start > end) {
    const swap = start;
    start = end;
    end = swap;
  }
  if (start && end) return { id: "custom", start, end, label: formatSpan(start, end, locale) };
  return { id: "custom", start: null, end: null, label: "Select dates" };
}

/**
 * Sum day totals inside an inclusive range.
 * A month bucket counts only when the whole month sits inside the range.
 * Day keys in that month are not added a second time.
 */
export function sumDailyInRange(daily: DailyMap, start: string, end: string): DailyRangeSum {
  let seconds = 0;
  let ayahs = 0;
  let coarse = false;
  let counted = false;
  const dayKeys = Object.keys(daily).filter(isDayKey);
  const monthKeys = Object.keys(daily).filter(isMonthKey);

  for (const key of dayKeys) {
    if (key < start || key > end) continue;
    seconds += daily[key]?.seconds ?? 0;
    ayahs += daily[key]?.ayahs ?? 0;
    counted = true;
  }

  for (const month of monthKeys) {
    const monthStart = `${month}-01`;
    const monthEnd = lastDayKeyOfMonth(month);
    const overlaps = monthEnd >= start && monthStart <= end;
    if (!overlaps) continue;
    const fullyInside = monthStart >= start && monthEnd <= end;
    const daysInMonth = dayKeys.filter((key) => key.slice(0, 7) === month);
    const bucket = daily[month] ?? { seconds: 0, ayahs: 0 };
    if (!fullyInside) {
      coarse = true;
      continue;
    }
    if (daysInMonth.length === 0) {
      seconds += bucket.seconds;
      ayahs += bucket.ayahs;
      counted = true;
      continue;
    }
    const daySeconds = daysInMonth.reduce((sum, key) => sum + (daily[key]?.seconds ?? 0), 0);
    const dayAyahs = daysInMonth.reduce((sum, key) => sum + (daily[key]?.ayahs ?? 0), 0);
    const extraSeconds = Math.max(0, bucket.seconds - daySeconds);
    const extraAyahs = Math.max(0, bucket.ayahs - dayAyahs);
    if (extraSeconds > 0 || extraAyahs > 0) {
      seconds += extraSeconds;
      ayahs += extraAyahs;
      counted = true;
    }
  }

  return {
    seconds,
    ayahs,
    coarse,
    withheld: coarse && !counted,
  };
}

/** Prefer createdAt. Notes written before that field existed fall back to updatedAt. */
export function activityDay(item: DatedActivity): string | null {
  const candidates = [item.createdAt, item.updatedAt];
  for (const value of candidates) {
    if (!value) continue;
    const time = Date.parse(value);
    if (Number.isNaN(time)) continue;
    return todayKey(new Date(time));
  }
  return null;
}

export function countActivityInRange(items: DatedActivity[], start: string | null, end: string | null) {
  if (!start || !end) return items.length;
  let count = 0;
  for (const item of items) {
    const day = activityDay(item);
    if (day && day >= start && day <= end) count += 1;
  }
  return count;
}

export function computeRangeStats(
  input: {
    progress: ReadingProgress;
    notes: DatedActivity[];
    bookmarks: DatedActivity[];
    highlights: DatedActivity[];
    statsRange?: unknown;
    statsRangeStart?: unknown;
    statsRangeEnd?: unknown;
    now?: Date;
    locale?: string;
  },
): RangeStats {
  const now = input.now ?? new Date();
  const range = resolveStatsRange(input, now, input.locale);
  const progress = input.progress;
  const streak = progress.streak;
  const surahsFinished = progress.surahsRead.length;
  const lifetimeAyahs = progress.versesRead.length;
  const mushafPercent = Math.min(100, Math.round((lifetimeAyahs / TOTAL_AYAHS) * 1000) / 10);
  const notes = countActivityInRange(input.notes, range.start, range.end);
  const highlights = countActivityInRange(input.highlights, range.start, range.end);
  const bookmarks = countActivityInRange(input.bookmarks, range.start, range.end);

  if (!range.start || !range.end) {
    return {
      range,
      minutes: formatReadingMinutes(progress.totalSeconds),
      ayahs: lifetimeAyahs,
      notes,
      highlights,
      bookmarks,
      streak,
      surahsFinished,
      mushafPercent,
      historyHint: null,
    };
  }

  const historySince = isDayKey(progress.historySince) ? progress.historySince : null;
  const entirelyBefore = !historySince || range.end < historySince;
  const predates = !historySince || range.start < historySince;
  const summed = entirelyBefore
    ? { seconds: 0, ayahs: 0, coarse: false, withheld: true }
    : sumDailyInRange(progress.daily ?? {}, range.start < (historySince ?? range.start) ? historySince ?? range.start : range.start, range.end);

  const withheld = entirelyBefore || summed.withheld;
  const hints: string[] = [];
  if (predates) {
    hints.push(historySince ? formatDailyHistoryStart(historySince, input.locale) : "Daily history starts when you next read");
  }
  if (summed.coarse) hints.push("Older days are grouped by month.");

  return {
    range,
    minutes: withheld ? null : formatReadingMinutes(summed.seconds),
    ayahs: withheld ? null : summed.ayahs,
    notes,
    highlights,
    bookmarks,
    streak,
    surahsFinished,
    mushafPercent,
    historyHint: hints.length ? hints.join(" ") : null,
  };
}

export function weekStartsOn(locale?: string) {
  try {
    const loc = new Intl.Locale(locale || "en-US");
    const withWeek = loc as Intl.Locale & { weekInfo?: { firstDay?: number } };
    const first = withWeek.weekInfo?.firstDay;
    if (typeof first === "number" && first >= 1 && first <= 7) return first === 7 ? 0 : first;
  } catch {
    // Week info is optional. Sunday is the fallback grid.
  }
  return 0;
}

export function monthMatrix(year: number, monthIndex: number, weekStart = 0): string[][] {
  const first = new Date(year, monthIndex, 1);
  const offset = (first.getDay() - weekStart + 7) % 7;
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const cells: string[] = [];
  for (let index = 0; index < offset; index += 1) {
    cells.push(todayKey(new Date(year, monthIndex, 1 - (offset - index))));
  }
  for (let day = 1; day <= days; day += 1) cells.push(todayKey(new Date(year, monthIndex, day)));
  while (cells.length % 7 !== 0) {
    const previous = parseDayKey(cells[cells.length - 1]);
    if (!previous) break;
    previous.setDate(previous.getDate() + 1);
    cells.push(todayKey(previous));
  }
  const rows: string[][] = [];
  for (let index = 0; index < cells.length; index += 7) rows.push(cells.slice(index, index + 7));
  return rows;
}

export function moveCalendarDay(day: string, key: string, weekStart = 0): string | null {
  if (key === "ArrowLeft") return shiftDayKey(day, -1);
  if (key === "ArrowRight") return shiftDayKey(day, 1);
  if (key === "ArrowUp") return shiftDayKey(day, -7);
  if (key === "ArrowDown") return shiftDayKey(day, 7);
  if (key === "Home" || key === "End") {
    const date = parseDayKey(day);
    if (!date) return null;
    const fromWeekStart = (date.getDay() - weekStart + 7) % 7;
    return shiftDayKey(day, key === "Home" ? -fromWeekStart : 6 - fromWeekStart);
  }
  if (key === "PageUp" || key === "PageDown") {
    const date = parseDayKey(day);
    if (!date) return null;
    const delta = key === "PageUp" ? -1 : 1;
    const target = new Date(date.getFullYear(), date.getMonth() + delta, 1);
    const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(date.getDate(), last));
    return todayKey(target);
  }
  return null;
}
