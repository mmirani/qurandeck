import { PRODUCT_NAME } from "@/lib/brand";
import {
  formatReadingMinutes,
  normalizeSurahCompletions,
  TOTAL_AYAHS,
  TOTAL_SURAHS,
  type ReadingProgress,
} from "@/lib/reading";
import type { Bookmark, Highlight, HighlightSwatch, Note, Preferences, SessionUser } from "@/lib/quran/types";

export const LIBRARY_EXPORT_VERSION = 1;

export type LibraryExportInput = {
  progress: ReadingProgress;
  bookmarks: Bookmark[];
  notes: Note[];
  highlights: Highlight[];
  swatches: HighlightSwatch[];
  preferences: Preferences;
  user: SessionUser | null;
};

export type LibraryExportStats = {
  versesRead: number;
  versesTotal: number;
  surahsFinished: number;
  surahsTotal: number;
  streakDays: number;
  lastReadDay: string | null;
  minutes: number;
  favorites: number;
  notes: number;
  highlights: number;
  lastVerseKey: string | null;
  surahsFinishedIds: number[];
  surahCompletions: Record<string, number>;
};

export type LibraryExportDocument = {
  exportedAt: string;
  product: string;
  version: number;
  account: {
    displayName: string | null;
    email: string | null;
    signedIn: boolean;
  };
  stats: LibraryExportStats;
  /** Full portable library. Avatar image is omitted (large binary). */
  library: {
    progress: ReadingProgress;
    bookmarks: Bookmark[];
    notes: Note[];
    highlights: Highlight[];
    swatches: HighlightSwatch[];
    preferences: Preferences;
  };
};

export function buildExportStats(input: LibraryExportInput): LibraryExportStats {
  const { progress, bookmarks, notes, highlights } = input;
  const completions = normalizeSurahCompletions(progress.surahCompletions, progress.surahsRead);
  return {
    versesRead: progress.versesRead.length,
    versesTotal: TOTAL_AYAHS,
    surahsFinished: progress.surahsRead.length,
    surahsTotal: TOTAL_SURAHS,
    streakDays: progress.streak,
    lastReadDay: progress.lastReadDay,
    minutes: formatReadingMinutes(progress.totalSeconds),
    favorites: bookmarks.length,
    notes: notes.length,
    highlights: highlights.length,
    lastVerseKey: progress.lastVerseKey,
    surahsFinishedIds: [...progress.surahsRead],
    surahCompletions: Object.fromEntries(
      Object.entries(completions).map(([id, count]) => [String(id), count]),
    ),
  };
}

export function buildLibraryExport(input: LibraryExportInput): LibraryExportDocument {
  return {
    exportedAt: new Date().toISOString(),
    product: PRODUCT_NAME,
    version: LIBRARY_EXPORT_VERSION,
    account: {
      displayName: input.user?.displayName ?? null,
      email: input.user?.email ?? null,
      signedIn: Boolean(input.user),
    },
    stats: buildExportStats(input),
    library: {
      progress: input.progress,
      bookmarks: input.bookmarks,
      notes: input.notes,
      highlights: input.highlights,
      swatches: input.swatches,
      preferences: input.preferences,
    },
  };
}

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** Spreadsheet-friendly summary: stats rows, then finished surahs, then favorites/notes lists. */
export function buildStatsCsv(input: LibraryExportInput): string {
  const stats = buildExportStats(input);
  const lines: string[] = [
    "section,key,value",
    `summary,verses_read,${stats.versesRead}`,
    `summary,verses_total,${stats.versesTotal}`,
    `summary,surahs_finished,${stats.surahsFinished}`,
    `summary,surahs_total,${stats.surahsTotal}`,
    `summary,streak_days,${stats.streakDays}`,
    `summary,last_read_day,${csvEscape(stats.lastReadDay)}`,
    `summary,minutes,${stats.minutes}`,
    `summary,favorites,${stats.favorites}`,
    `summary,notes,${stats.notes}`,
    `summary,highlights,${stats.highlights}`,
    `summary,last_verse_key,${csvEscape(stats.lastVerseKey)}`,
    `summary,exported_at,${csvEscape(new Date().toISOString())}`,
  ];

  for (const chapterId of stats.surahsFinishedIds) {
    const count = stats.surahCompletions[String(chapterId)] ?? 1;
    lines.push(`surah_finished,${chapterId},${count}`);
  }

  for (const item of input.bookmarks) {
    lines.push(
      `favorite,${csvEscape(item.verseKey)},${csvEscape(`${item.type}: ${item.label}`)}`,
    );
  }

  for (const note of input.notes) {
    lines.push(`note,${csvEscape(note.verseKey)},${csvEscape(note.body)}`);
  }

  return `${lines.join("\n")}\n`;
}

export function exportFilename(kind: "stats" | "library", when = new Date()) {
  const day = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(when.getDate()).padStart(2, "0")}`;
  return kind === "stats" ? `qurandeck-stats-${day}.csv` : `qurandeck-library-${day}.json`;
}

export function downloadTextFile(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function downloadStatsCsv(input: LibraryExportInput) {
  downloadTextFile(exportFilename("stats"), buildStatsCsv(input), "text/csv;charset=utf-8");
}

export function downloadLibraryJson(input: LibraryExportInput) {
  const doc = buildLibraryExport(input);
  downloadTextFile(
    exportFilename("library"),
    `${JSON.stringify(doc, null, 2)}\n`,
    "application/json;charset=utf-8",
  );
}
