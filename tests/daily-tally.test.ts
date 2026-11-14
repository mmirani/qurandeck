import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { accountCreatedKinds } from "../src/lib/account-created";
import { buildLibraryExport, buildStatsCsv } from "../src/lib/export-library";
import { emptyLibrary, mergeLibraries, normalizeLibrary } from "../src/lib/library";
import { earliestLibraryIso, resolveFirstSeen } from "../src/lib/reading-since";
import {
  DAILY_DETAIL_DAYS,
  addReadingSeconds,
  compactDaily,
  defaultReadingProgress,
  markVerseRead,
  mergeDaily,
  normalizeReadingProgress,
  shiftDayKey,
  subtractReadingSeconds,
  todayKey,
} from "../src/lib/reading";
import {
  activityDay,
  computeRangeStats,
  formatReadingSince,
  formatSpan,
  moveCalendarDay,
  resolveStatsRange,
  sumDailyInRange,
} from "../src/lib/stats-range";
import { defaultPreferences, loadProgress, preferencesFromUnknown, saveProgress } from "../src/lib/storage";

function localIso(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, 12).toISOString();
}
import type { LibraryExportInput } from "../src/lib/export-library";

const DAY = "2026-11-14";

function withStorage(run: () => void) {
  const store = new Map<string, string>();
  const previous = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    },
  });
  try {
    run();
  } finally {
    Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: previous });
  }
}

describe("daily tally accrual", () => {
  it("adds seconds to the running total and to that calendar day", () => {
    const once = addReadingSeconds(defaultReadingProgress, 15, DAY);
    const twice = addReadingSeconds(once, 15, DAY);
    assert.equal(twice.totalSeconds, 30);
    assert.deepEqual(twice.daily[DAY], { seconds: 30, ayahs: 0 });
    assert.equal(twice.historySince, DAY);
  });

  it("counts an ayah only the first time it is marked read", () => {
    const first = markVerseRead(defaultReadingProgress, "2:255", DAY);
    const again = markVerseRead(first, "2:255", DAY);
    assert.equal(first.daily[DAY]?.ayahs, 1);
    assert.equal(again.daily[DAY]?.ayahs, 1);
    assert.equal(again.verseVisits["2:255"], 2);
    assert.equal(again.versesRead.length, 1);
  });

  it("removes clawed-back seconds from the same day", () => {
    const read = addReadingSeconds(defaultReadingProgress, 30, DAY);
    const clawed = subtractReadingSeconds(read, 15, DAY);
    assert.equal(clawed.totalSeconds, 15);
    assert.equal(clawed.daily[DAY]?.seconds, 15);
  });
});

describe("daily tally merge", () => {
  it("keeps the larger count for a day so a sync does not add the same reading twice", () => {
    const merged = mergeDaily(
      { "2026-11-01": { seconds: 10, ayahs: 1 } },
      { "2026-11-01": { seconds: 40, ayahs: 2 }, "2026-11-02": { seconds: 5, ayahs: 1 } },
    );
    assert.deepEqual(merged["2026-11-01"], { seconds: 40, ayahs: 2 });
    assert.deepEqual(merged["2026-11-02"], { seconds: 5, ayahs: 1 });
  });

  it("merges day totals inside a library sync and keeps the earlier history start", () => {
    const local = emptyLibrary();
    local.progress = {
      ...local.progress,
      daily: { "2026-11-02": { seconds: 20, ayahs: 1 } },
      historySince: "2026-11-02",
      totalSeconds: 20,
    };
    const remote = emptyLibrary();
    remote.progress = {
      ...remote.progress,
      daily: { "2026-11-02": { seconds: 50, ayahs: 1 }, "2026-11-03": { seconds: 10, ayahs: 2 } },
      historySince: "2026-10-30",
      totalSeconds: 50,
    };
    const merged = mergeLibraries(local, remote);
    assert.deepEqual(merged.progress.daily["2026-11-02"], { seconds: 50, ayahs: 1 });
    assert.equal(merged.progress.daily["2026-11-03"]?.ayahs, 2);
    assert.equal(merged.progress.historySince, "2026-10-30");
    assert.equal(merged.progress.totalSeconds, 50);
  });
});

describe("daily tally pruning", () => {
  it("folds days older than the detail window into months and keeps recent days", () => {
    const today = "2026-11-14";
    const daily: Record<string, { seconds: number; ayahs: number }> = {};
    daily["2024-01-10"] = { seconds: 10, ayahs: 1 };
    daily["2024-01-11"] = { seconds: 20, ayahs: 2 };
    const recent = shiftDayKey(today, -3);
    daily[recent] = { seconds: 15, ayahs: 1 };
    const compact = compactDaily(daily, today, DAILY_DETAIL_DAYS);
    assert.equal(compact["2024-01-10"], undefined);
    assert.deepEqual(compact["2024-01"], { seconds: 30, ayahs: 3 });
    assert.deepEqual(compact[recent], { seconds: 15, ayahs: 1 });
    const dayKeys = Object.keys(compact).filter((key) => key.length === 10);
    assert.ok(dayKeys.length <= DAILY_DETAIL_DAYS);
  });

  it("drops malformed keys when progress is parsed for storage", () => {
    const parsed = normalizeReadingProgress({
      totalSeconds: 90,
      versesRead: ["1:1"],
      daily: {
        "2026-11-01": { seconds: 45.9, ayahs: 2 },
        "not-a-day": { seconds: 10, ayahs: 1 },
        "2026-11-02": { seconds: -4, ayahs: 0 },
      },
      historySince: "2026-11-01",
    });
    assert.deepEqual(parsed.daily["2026-11-01"], { seconds: 45, ayahs: 2 });
    assert.equal(parsed.daily["not-a-day"], undefined);
    assert.equal(parsed.daily["2026-11-02"], undefined);
    assert.equal(parsed.historySince, "2026-11-01");
    assert.equal(parsed.totalSeconds, 90);
  });

  it("round-trips the daily map through the progress localStorage helpers", () => {
    const day = todayKey();
    withStorage(() => {
      saveProgress({
        ...defaultReadingProgress,
        totalSeconds: 60,
        daily: { [day]: { seconds: 60, ayahs: 3 } },
        historySince: day,
        versesRead: ["1:1"],
      });
      const loaded = loadProgress();
      assert.deepEqual(loaded.daily[day], { seconds: 60, ayahs: 3 });
      assert.equal(loaded.historySince, day);
      assert.deepEqual(loaded.versesRead, ["1:1"]);
    });
  });
});

describe("range filtering", () => {
  const progress = {
    ...defaultReadingProgress,
    totalSeconds: 500,
    versesRead: ["1:1", "1:2", "1:3"],
    surahsRead: [1],
    streak: 4,
    historySince: "2026-11-13",
    daily: {
      "2026-11-13": { seconds: 120, ayahs: 2 },
      "2026-11-14": { seconds: 60, ayahs: 1 },
    },
  };

  it("uses lifetime totals for all time", () => {
    const stats = computeRangeStats({
      progress,
      notes: [],
      bookmarks: [],
      highlights: [],
      statsRange: "all",
      now: new Date(2026, 10, 14),
      locale: "en-US",
    });
    assert.equal(stats.minutes, 8);
    assert.equal(stats.ayahs, 3);
    assert.equal(stats.streak, 4);
    assert.equal(stats.historyHint, null);
    assert.equal(stats.range.label, "All time");
  });

  it("sums only the days inside the range", () => {
    const summed = sumDailyInRange(progress.daily, "2026-11-14", "2026-11-14");
    assert.equal(summed.seconds, 60);
    assert.equal(summed.ayahs, 1);
    const stats = computeRangeStats({
      progress,
      notes: [{ updatedAt: localIso("2026-11-14") }],
      bookmarks: [{ createdAt: localIso("2026-10-01") }],
      highlights: [{ createdAt: localIso("2026-11-14") }],
      statsRange: "custom",
      statsRangeStart: "2026-11-14",
      statsRangeEnd: "2026-11-14",
      now: new Date(2026, 10, 14),
      locale: "en-US",
    });
    assert.equal(stats.minutes, 1);
    assert.equal(stats.ayahs, 1);
    assert.equal(stats.notes, 1);
    assert.equal(stats.bookmarks, 0);
    assert.equal(stats.highlights, 1);
    assert.equal(stats.streak, 4);
  });

  it("uses updatedAt when a note has no createdAt", () => {
    const updated = localIso("2026-11-02");
    const created = localIso("2026-11-03");
    assert.equal(activityDay({ updatedAt: updated }), todayKey(new Date(updated)));
    assert.equal(activityDay({ createdAt: created, updatedAt: localIso("2026-12-01") }), todayKey(new Date(created)));
  });

  it("withholds a zero when the range is entirely before daily history", () => {
    const stats = computeRangeStats({
      progress,
      notes: [],
      bookmarks: [],
      highlights: [],
      statsRange: "custom",
      statsRangeStart: "2026-11-01",
      statsRangeEnd: "2026-11-10",
      now: new Date(2026, 10, 14),
      locale: "en-US",
    });
    assert.equal(stats.minutes, null);
    assert.equal(stats.ayahs, null);
    assert.equal(stats.historyHint, "Daily history starts Nov 13, 2026");
  });

  it("names the history start when the range begins before tracking and still counts later days", () => {
    const stats = computeRangeStats({
      progress,
      notes: [],
      bookmarks: [],
      highlights: [],
      statsRange: "custom",
      statsRangeStart: "2026-11-01",
      statsRangeEnd: "2026-11-14",
      now: new Date(2026, 10, 14),
      locale: "en-US",
    });
    assert.equal(stats.minutes, 3);
    assert.equal(stats.ayahs, 3);
    assert.match(stats.historyHint ?? "", /Daily history starts Nov 13, 2026/);
  });

  it("counts a whole compacted month and does not invent a split for part of that month", () => {
    const daily = { "2024-01": { seconds: 90, ayahs: 4 } };
    const full = sumDailyInRange(daily, "2024-01-01", "2024-01-31");
    assert.equal(full.seconds, 90);
    assert.equal(full.ayahs, 4);
    assert.equal(full.coarse, false);
    const partial = sumDailyInRange(daily, "2024-01-10", "2024-01-12");
    assert.equal(partial.seconds, 0);
    assert.equal(partial.withheld, true);
    assert.equal(partial.coarse, true);
  });

  it("does not add a month bucket on top of the days it already contains", () => {
    const summed = sumDailyInRange(
      {
        "2024-01": { seconds: 100, ayahs: 4 },
        "2024-01-15": { seconds: 30, ayahs: 1 },
      },
      "2024-01-01",
      "2024-01-31",
    );
    assert.equal(summed.seconds, 100);
    assert.equal(summed.ayahs, 4);
  });
});

describe("stats range labels and preferences", () => {
  it("formats the active span and the reading-since line with Intl", () => {
    const range = resolveStatsRange(
      { statsRange: "custom", statsRangeStart: "2026-11-01", statsRangeEnd: "2026-11-13" },
      new Date(2026, 10, 14),
      "en-US",
    );
    assert.equal(range.label, "Nov 1 – Nov 13, 2026");
    assert.equal(formatSpan("2026-11-14", "2026-11-14", "en-US"), "Nov 14, 2026");
    assert.equal(formatReadingSince("2026-10-02T00:00:00.000Z", "en-US"), "Reading since Oct 2026");
  });

  it("defaults a missing preference to all time and drops a bad custom date", () => {
    const prefs = preferencesFromUnknown({ theme: "iris", statsRange: "nope", statsRangeStart: "yesterday" });
    assert.equal(prefs.statsRange, "all");
    assert.equal(prefs.statsRangeStart, null);
    const seven = resolveStatsRange({ statsRange: "7d" }, new Date(2026, 10, 14), "en-US");
    assert.equal(seven.start, "2026-11-08");
    assert.equal(seven.end, "2026-11-14");
  });

  it("moves the keyboard focus by day, week, and month", () => {
    assert.equal(moveCalendarDay("2026-11-14", "ArrowLeft"), "2026-11-13");
    assert.equal(moveCalendarDay("2026-11-14", "ArrowDown"), "2026-11-21");
    assert.equal(moveCalendarDay("2026-11-14", "Home"), "2026-11-08");
    assert.equal(moveCalendarDay("2026-11-14", "PageUp"), "2026-10-14");
  });

  it("uses the local calendar when UTC is already the next day", () => {
    const root = fileURLToPath(new URL("..", import.meta.url));
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--input-type=module",
        "--eval",
        `
          import { addReadingSeconds, defaultReadingProgress, isFutureDay, todayKey } from "./src/lib/reading.ts";
          import { activityDay, resolveStatsRange } from "./src/lib/stats-range.ts";
          const instant = new Date("2026-11-14T07:30:00.000Z");
          const local = todayKey(instant);
          const utc = instant.toISOString().slice(0, 10);
          if (utc !== "2026-11-14") throw new Error("expected UTC day 2026-11-14, got " + utc);
          if (local !== "2026-11-13") throw new Error("expected local day 2026-11-13, got " + local);
          const week = resolveStatsRange({ statsRange: "7d" }, instant, "en-US");
          if (week.end !== "2026-11-13" || week.start !== "2026-11-07") {
            throw new Error("7d range used " + week.start + " to " + week.end);
          }
          const year = resolveStatsRange({ statsRange: "year" }, instant, "en-US");
          if (year.start !== "2026-01-01" || year.end !== "2026-11-13") {
            throw new Error("year range used " + year.start + " to " + year.end);
          }
          const noted = activityDay({ createdAt: "2026-11-14T07:30:00.000Z" });
          if (noted !== "2026-11-13") throw new Error("note day " + noted);
          const progress = addReadingSeconds(defaultReadingProgress, 15, local);
          if (!progress.daily["2026-11-13"] || progress.daily["2026-11-14"]) {
            throw new Error("daily keys " + Object.keys(progress.daily).join(","));
          }
          if (!isFutureDay("2026-11-14", instant) || isFutureDay("2026-11-13", instant)) {
            throw new Error("future check did not follow the local day");
          }
        `,
      ],
      {
        cwd: root,
        env: { ...process.env, TZ: "America/Los_Angeles" },
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
});

describe("reading since", () => {
  it("keeps a stored first-seen time and moves it earlier to match an older note", () => {
    const note = { id: "n", verseKey: "1:1", body: "ayah", updatedAt: "2026-10-02T00:00:00.000Z" };
    const artifact = earliestLibraryIso([note], [], []);
    const created = resolveFirstSeen(null, artifact, new Date("2026-11-14T00:00:00.000Z"));
    assert.equal(created.iso, "2026-10-02T00:00:00.000Z");
    const kept = resolveFirstSeen("2026-09-01T00:00:00.000Z", artifact, new Date("2026-11-14T00:00:00.000Z"));
    assert.equal(kept.iso, "2026-09-01T00:00:00.000Z");
    assert.equal(kept.changed, false);
  });
});

describe("export and account created lookup", () => {
  it("includes day totals in JSON and CSV without ayah keys", () => {
    const input: LibraryExportInput = {
      progress: {
        ...defaultReadingProgress,
        totalSeconds: 80,
        versesRead: ["2:255"],
        daily: { "2026-11-13": { seconds: 80, ayahs: 1 } },
        historySince: "2026-11-13",
      },
      bookmarks: [],
      notes: [],
      highlights: [],
      swatches: [],
      preferences: defaultPreferences,
      user: null,
    };
    const doc = buildLibraryExport(input);
    assert.deepEqual(doc.library.progress.daily["2026-11-13"], { seconds: 80, ayahs: 1 });
    const csv = buildStatsCsv(input);
    assert.match(csv, /daily_seconds,2026-11-13,80/);
    assert.match(csv, /daily_ayahs,2026-11-13,1/);
    assert.match(csv, /daily_history_since,2026-11-13/);
    const dailyLines = csv.split("\n").filter((line) => line.startsWith("daily_"));
    for (const line of dailyLines) assert.equal(line.includes("2:255"), false);
    const restored = normalizeLibrary({ progress: doc.library.progress });
    assert.equal(restored?.progress.daily["2026-11-13"]?.ayahs, 1);
  });

  it("plans a created-at read only when a users or accounts table has an email and a timestamp", () => {
    assert.deepEqual(
      accountCreatedKinds([
        { table_name: "users", column_name: "email" },
        { table_name: "users", column_name: "created_at" },
      ]),
      ["users_created_at"],
    );
    assert.deepEqual(accountCreatedKinds([{ table_name: "accounts", column_name: "provider" }]), []);
    assert.deepEqual(
      accountCreatedKinds([
        { table_name: "User", column_name: "email" },
        { table_name: "User", column_name: "createdAt" },
      ]),
      ["User_createdAt"],
    );
  });
});
