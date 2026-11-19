import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AYAH_LEVEL_PPA,
  MAX_PPA,
  SURAH_LEVEL_PPA,
  SURAH_OFFSETS,
  buildReadIndex,
  clampView,
  firstUnreadIn,
  levelForPpa,
  litRuns,
  minPpa,
  noorGlow,
  panBy,
  readInSpan,
  revealSpan,
  unitAt,
  unitDetails,
  unitFill,
  unitIndexForAyah,
  unitLabel,
  unitsInSpan,
  wholeView,
  zoomAt,
} from "../src/lib/completion-map";
import {
  COMPLETION_PIECES,
  SURAH_VERSE_COUNTS,
  TOTAL_AYAHS,
  TOTAL_SURAHS,
  ayahIndex,
  ayahsReadInSurah,
  defaultReadingProgress,
  finishedSurahIds,
  markVerseRead,
  normalizeReadingProgress,
  quranPieceMap,
  syncSurahsRead,
  topCompletedSurahs,
} from "../src/lib/reading";
import { computeRangeStats } from "../src/lib/stats-range";
import { buildExportStats } from "../src/lib/export-library";

const range = (chapter: number, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `${chapter}:${from + i}`);
const NAMES: Record<number, string> = { 1: "Al-Fatihah", 2: "Al-Baqarah", 3: "Ali 'Imran", 114: "An-Nas" };
const name = (id: number) => NAMES[id] ?? `Surah ${id}`;

describe("completion map coverage", () => {
  it("indexes every ayah once and ignores duplicates and bad keys", () => {
    const read = buildReadIndex(["1:1", "1:1", "2:286", "2:287", "0:1", "x", "114:6"]);
    assert.equal(read.total, 3);
    assert.equal(read.lit[ayahIndex(2, 286)], 1);
    assert.equal(read.lit[TOTAL_AYAHS - 1], 1);
    assert.equal(readInSpan(read, 0, TOTAL_AYAHS), 3);
  });

  it("units tile the whole Quran at every level with no gaps", () => {
    for (const level of ["quran", "surah", "ayah"] as const) {
      const units = unitsInSpan(level, 0, TOTAL_AYAHS);
      assert.equal(units[0].start, 0);
      assert.equal(units[units.length - 1].end, TOTAL_AYAHS);
      for (let i = 1; i < units.length; i += 1) assert.equal(units[i].start, units[i - 1].end);
    }
    assert.equal(unitsInSpan("quran", 0, TOTAL_AYAHS).length, COMPLETION_PIECES);
    assert.equal(unitsInSpan("surah", 0, TOTAL_AYAHS).length, TOTAL_SURAHS);
    assert.equal(SURAH_OFFSETS[TOTAL_SURAHS], TOTAL_AYAHS);
  });

  it("finds the sliver for an ayah at each level", () => {
    const baqarah255 = ayahIndex(2, 255);
    assert.equal(unitIndexForAyah("surah", baqarah255), 1);
    assert.equal(unitIndexForAyah("ayah", baqarah255), baqarah255);
    const slice = unitAt("quran", unitIndexForAyah("quran", baqarah255));
    assert.ok(slice.start <= baqarah255 && baqarah255 < slice.end);
    assert.equal(unitIndexForAyah("surah", TOTAL_AYAHS + 50), TOTAL_SURAHS - 1);
  });

  it("whole-Quran slice coverage matches the existing 160-piece map", () => {
    const verses = [...range(1, 1, 7), ...range(2, 1, 40), "18:10", ...range(112, 1, 4)];
    const read = buildReadIndex(verses);
    const legacy = quranPieceMap(verses).coverage;
    for (let piece = 0; piece < COMPLETION_PIECES; piece += 1) {
      assert.ok(Math.abs(unitFill(read, unitAt("quran", piece)) - legacy[piece]) < 1e-9, `piece ${piece}`);
    }
  });

  it("paints lit runs in place inside a surah", () => {
    const read = buildReadIndex([...range(2, 1, 10), ...range(2, 101, 110)]);
    const baqarah = unitAt("surah", 1);
    const runs = litRuns(read, baqarah.start, baqarah.end)!;
    assert.equal(runs.length, 2);
    assert.deepEqual(runs[0], [0, 10 / 286]);
    assert.deepEqual(runs[1], [100 / 286, 110 / 286]);
  });

  it("first unread ayah, and -1 once a span is full", () => {
    const read = buildReadIndex(range(1, 1, 3));
    const fatihah = unitAt("surah", 0);
    assert.equal(firstUnreadIn(read, fatihah.start, fatihah.end), 3);
    assert.equal(firstUnreadIn(buildReadIndex(range(1, 1, 7)), fatihah.start, fatihah.end), -1);
  });
});

describe("completion map popover counts", () => {
  const verses = [...range(2, 1, 40), "2:255"];
  const read = buildReadIndex(verses);
  const count = ayahsReadInSurah({ versesRead: verses }, 2);

  it("surah sliver: read count, and Read the N left goes to the first unread ayah", () => {
    const details = unitDetails(unitAt("surah", 1), read, name, count);
    assert.equal(count, 41);
    assert.equal(details.title, "Al-Baqarah");
    assert.equal(details.surahLine, "Surah 2 · 41 of 286 read");
    assert.equal(details.action, "Read the 245 left");
    assert.equal(details.target, "2:41");
    assert.equal(details.finished, false);
  });

  it("slice sliver: counts inside the slice and names the surah", () => {
    const slice = unitAt("quran", unitIndexForAyah("quran", ayahIndex(2, 100)));
    const details = unitDetails(slice, read, name, count);
    const size = slice.end - slice.start;
    const lit = readInSpan(read, slice.start, slice.end);
    assert.equal(details.detail, `${lit} of ${size} ayahs in this slice read`);
    assert.equal(details.surahLine, "Al-Baqarah · 41 of 286 read");
    assert.equal(details.action, size === lit ? `Open ${details.target}` : `Read the ${size - lit} left`);
  });

  it("ayah sliver opens that ayah", () => {
    const details = unitDetails(unitAt("ayah", ayahIndex(2, 255)), read, name, count);
    assert.equal(details.title, "Al-Baqarah 2:255");
    assert.equal(details.detail, "Read");
    assert.equal(details.target, "2:255");
    assert.equal(details.action, "Open 2:255");
  });

  it("a finished surah offers to read it again from the start", () => {
    const full = range(1, 1, 7);
    const details = unitDetails(unitAt("surah", 0), buildReadIndex(full), name, 7);
    assert.equal(details.finished, true);
    assert.equal(details.action, "Read it again");
    assert.equal(details.target, "1:1");
  });

  it("spoken labels say the place and the share read", () => {
    const sliceRead = buildReadIndex(range(2, 71, 79));
    const label = unitLabel({ level: "quran", index: 0, start: ayahIndex(2, 71), end: ayahIndex(2, 109) + 1 }, sliceRead, name);
    assert.equal(label, "Al-Baqarah, ayahs 71 to 109, 23% read");
    assert.equal(unitLabel(unitAt("ayah", ayahIndex(2, 72)), sliceRead, name), "Al-Baqarah 2:72, read");
    assert.equal(unitLabel(unitAt("surah", 0), buildReadIndex(range(1, 1, 7)), name), "Al-Fatihah, 7 ayahs, 100% read, finished");
  });

  it("ayahsReadInSurah ignores duplicates and ayahs past the end", () => {
    assert.equal(ayahsReadInSurah({ versesRead: ["1:1", "1:1", "1:8", "1:7", "2:1"] }, 1), 2);
    assert.equal(ayahsReadInSurah({ versesRead: ["1:1"] }, 999), 0);
  });
});

describe("completion map view math", () => {
  const width = 1000;

  it("levels follow pixels per ayah", () => {
    assert.equal(levelForPpa(minPpa(width)), "quran");
    assert.equal(levelForPpa(SURAH_LEVEL_PPA), "surah");
    assert.equal(levelForPpa(AYAH_LEVEL_PPA), "ayah");
  });

  it("zoom is clamped between the whole Quran and 48 px ayahs", () => {
    assert.equal(clampView({ start: 0, ppa: 0.0001 }, width).ppa, minPpa(width));
    assert.equal(clampView({ start: 0, ppa: 999 }, width).ppa, MAX_PPA);
    assert.ok(MAX_PPA >= 44, "deepest ayah cells are at least 44 px");
  });

  it("zoom keeps the ayah under the cursor in place", () => {
    const view = wholeView(width);
    const x = 300;
    const before = view.start + x / view.ppa;
    const zoomed = zoomAt(view, view.ppa * 8, x, width);
    assert.ok(Math.abs(zoomed.start + x / zoomed.ppa - before) < 1e-6);
  });

  it("pan never runs past either end", () => {
    const view = { start: 0, ppa: 10 };
    assert.equal(panBy(view, 500, width).start, 0);
    const end = panBy(view, -1e9, width);
    assert.equal(end.start, TOTAL_AYAHS - width / 10);
  });

  it("reveal pans the least needed", () => {
    const view = { start: 100, ppa: 10 };
    assert.equal(revealSpan(view, 120, 121, width), view);
    const moved = revealSpan(view, 300, 301, width);
    assert.ok(moved.start > 100 && 301 <= moved.start + width / 10);
  });

  it("noor grows with fill and a finished surah shines more", () => {
    assert.equal(noorGlow(0, false), null);
    const half = noorGlow(0.5, false)!;
    const full = noorGlow(1, false)!;
    const done = noorGlow(1, true)!;
    assert.ok(full.blur > half.blur && full.alpha > half.alpha);
    assert.ok(done.blur > full.blur && done.alpha > full.alpha);
    assert.ok(done.alpha <= 90, "never fully opaque");
  });
});

describe("surahs finished", () => {
  it("reaching the last ayah alone does not finish a surah", () => {
    const progress = markVerseRead(defaultReadingProgress, "2:286", "2026-11-19");
    assert.deepEqual(progress.surahsRead, []);
    assert.deepEqual(finishedSurahIds(progress), []);
  });

  it("finishes once every ayah is read, in any order", () => {
    let progress = defaultReadingProgress;
    for (const key of ["1:7", "1:3", "1:1", "1:2", "1:6", "1:4"]) progress = markVerseRead(progress, key, "2026-11-19");
    assert.deepEqual(progress.surahsRead, []);
    progress = markVerseRead(progress, "1:5", "2026-11-19");
    assert.deepEqual(progress.surahsRead, [1]);
    assert.equal(progress.surahCompletions[1], 1);
    // Reading an ayah again does not count another finish.
    progress = markVerseRead(progress, "1:5", "2026-11-19");
    assert.equal(progress.surahCompletions[1], 1);
  });

  it("older stored data that counted a last-ayah visit is not counted and does not crash", () => {
    const stored = normalizeReadingProgress({
      versesRead: ["2:286", ...range(1, 1, 7), "1:7"],
      surahsRead: [1, 2, 2, 999],
      surahCompletions: { 1: 2, 2: 1, 999: 4 },
    });
    const synced = syncSurahsRead(stored);
    assert.deepEqual(finishedSurahIds(synced), [1]);
    assert.deepEqual(topCompletedSurahs(synced).map((item) => item.chapterId), [1]);
    const stats = computeRangeStats({ progress: synced, notes: [], bookmarks: [], highlights: [] });
    assert.equal(stats.surahsFinished, 1);
    const exported = buildExportStats({
      progress: synced,
      bookmarks: [],
      notes: [],
      highlights: [],
      swatches: [],
      preferences: {} as never,
      user: null,
    });
    assert.equal(exported.surahsFinished, 1);
    assert.deepEqual(exported.surahsFinishedIds, [1]);
    assert.deepEqual(Object.keys(exported.surahCompletions), ["1"]);
  });

  it("a stale stored surah counts as soon as its remaining ayahs are read", () => {
    let progress = normalizeReadingProgress({ versesRead: ["108:3"], surahsRead: [108] });
    assert.deepEqual(finishedSurahIds(progress), []);
    progress = markVerseRead(progress, "108:1", "2026-11-19");
    progress = markVerseRead(progress, "108:2", "2026-11-19");
    assert.deepEqual(finishedSurahIds(progress), [108]);
    assert.equal(SURAH_VERSE_COUNTS[107], 3);
  });
});
