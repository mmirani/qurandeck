import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyLibrary, mergeLibraries, normalizeLibrary } from "../src/lib/library";
import {
  defaultReadingProgress,
  markVerseRead,
  normalizeReadingProgress,
  type ReadingProgress,
} from "../src/lib/reading";
import {
  allVerseKeys,
  daysInclusive,
  ensureFinishedReading,
  finishedReadingId,
  isQuranFinished,
  markFinishedReadingSeen,
  mergeFinishedReadings,
  monthOfFinishedReading,
  pendingFinishedReading,
  reconcileFinishedReadings,
  startNewReading,
} from "../src/lib/finished-reading";
import { keepsakeDesignForMonth, keepsakeSvg, KEEPSAKE_DESIGNS } from "../src/lib/keepsake-card";

const KEYS = allVerseKeys();

function progress(patch: Partial<ReadingProgress> = {}): ReadingProgress {
  return { ...defaultReadingProgress, ...patch };
}

function almostDone(extra: Partial<ReadingProgress> = {}): ReadingProgress {
  return progress({
    versesRead: KEYS.slice(0, -1),
    readingStartedOn: "2026-03-12",
    historySince: "2026-03-12",
    ...extra,
  });
}

describe("isQuranFinished", () => {
  it("is false until every ayah is present", () => {
    assert.equal(isQuranFinished(progress()), false);
    assert.equal(isQuranFinished(almostDone()), false);
    assert.equal(isQuranFinished(progress({ versesRead: KEYS })), true);
    assert.equal(KEYS.length, 6236);
  });

  it("ignores duplicate or invalid keys and requires full coverage", () => {
    assert.equal(isQuranFinished(progress({ versesRead: [...KEYS, ...KEYS, "not-a-verse"] })), true);
    assert.equal(isQuranFinished(progress({ versesRead: KEYS.map((key, i) => (i === 0 ? "0:1" : key)) })), false);
  });
});

describe("daysInclusive and month mapping", () => {
  it("counts inclusive local days", () => {
    assert.equal(daysInclusive("2026-03-12", "2026-03-12"), 1);
    assert.equal(daysInclusive("2026-03-12", "2026-11-22"), 256);
    assert.equal(daysInclusive("2026-11-22", "2026-03-12"), 1);
  });

  it("maps each finish month to a distinct design", () => {
    const ids = new Set<string>();
    for (let month = 1; month <= 12; month += 1) {
      const design = keepsakeDesignForMonth(month);
      assert.equal(design.month, month);
      assert.ok(design.id);
      ids.add(design.id);
      assert.ok(KEEPSAKE_DESIGNS[month - 1]);
    }
    assert.equal(ids.size, 12);
    assert.equal(monthOfFinishedReading({ finishedOn: "2026-01-31" }), 1);
    assert.equal(monthOfFinishedReading({ finishedOn: "2026-11-22" }), 11);
    assert.equal(monthOfFinishedReading({ finishedOn: "2026-12-01" }), 12);
  });

  it("draws a privacy-safe card without forbidden words", () => {
    const svg = keepsakeSvg({ finishedOn: "2026-11-22", days: 256, ayahs: 6236, surahs: 114 });
    assert.match(svg, /You finished/);
    assert.match(svg, /the Quran/);
    assert.match(svg, /May Allah accept it/);
    assert.match(svg, /22 November 2026/);
    assert.match(svg, /256 days/);
    assert.match(svg, /6,236 ayahs/);
    assert.match(svg, /114 surahs/);
    assert.match(svg, /qurandeck.com/);
    assert.doesNotMatch(svg, /khatm/i);
    assert.doesNotMatch(svg, /app/i);
  });
});

describe("ensureFinishedReading and pending seen", () => {
  it("records a pending finish once when the last ayah is marked", () => {
    const last = KEYS[KEYS.length - 1];
    const next = reconcileFinishedReadings(markVerseRead(almostDone(), last, "2026-11-22"));
    assert.equal(isQuranFinished(next), true);
    assert.equal(next.finishedReadings.length, 1);
    const reading = next.finishedReadings[0]!;
    assert.equal(reading.id, finishedReadingId(1));
    assert.equal(reading.startedOn, "2026-03-12");
    assert.equal(reading.finishedOn, "2026-11-22");
    assert.equal(reading.days, 256);
    assert.equal(reading.ayahs, 6236);
    assert.equal(reading.surahs, 114);
    assert.equal(reading.seenAt, null);
    assert.equal(pendingFinishedReading(next)?.id, reading.id);

    const again = ensureFinishedReading(next, "2026-11-23");
    assert.equal(again.finishedReadings.length, 1);
    assert.equal(again.finishedReadings[0]?.finishedOn, "2026-11-22");
  });

  it("backfills a pending row for a library already at 100%", () => {
    const raw = normalizeReadingProgress({
      versesRead: KEYS,
      historySince: "2025-01-10",
      lastReadDay: "2025-12-01",
    });
    const next = reconcileFinishedReadings(raw, "2026-11-22");
    assert.equal(next.finishedReadings.length, 1);
    assert.equal(next.finishedReadings[0]?.startedOn, "2025-01-10");
    assert.equal(next.finishedReadings[0]?.seenAt, null);
  });

  it("marks a celebration seen once and does not show it again, even when a slower clock stamps the seen time", () => {
    const finished = reconcileFinishedReadings(progress({ versesRead: KEYS, readingStartedOn: "2026-03-12" }), "2026-11-22");
    const id = finished.finishedReadings[0]!.id;
    const ahead = 1_700_000_000_000;
    const behind = ahead - 86_400_000;
    const seen = markFinishedReadingSeen(finished, id, { now: behind, over: ahead });
    assert.ok((seen.finishedReadings[0]?.seenAt ?? 0) > ahead);
    assert.equal(pendingFinishedReading(seen), null);

    const otherUnseen = finished;
    const merged = mergeFinishedReadings(otherUnseen.finishedReadings, seen.finishedReadings);
    assert.equal(pendingFinishedReading({ finishedReadings: merged }), null);
    assert.equal(merged[0]?.seenAt, seen.finishedReadings[0]?.seenAt);
  });
});

describe("start again and merge", () => {
  it("archives the reading, clears the map, and keeps a later start from being undone by an old 100% copy", () => {
    const finished = reconcileFinishedReadings(
      almostDone({ lastActiveAt: 100 }),
      "2026-11-22",
    );
    // complete it
    const complete = reconcileFinishedReadings(markVerseRead(finished, KEYS[KEYS.length - 1]!, "2026-11-22"));
    const next = startNewReading(complete, "2026-11-23", 200);
    assert.equal(isQuranFinished(next), false);
    assert.deepEqual(next.versesRead, []);
    assert.equal(next.readingCycle, 2);
    assert.equal(next.readingStartedOn, "2026-11-23");
    assert.equal(next.finishedReadings.length, 1);
    assert.ok(next.finishedReadings[0]?.seenAt);
    assert.equal(next.lastVerseKey, "1:1");
    assert.ok((next.lastActiveAt ?? 0) > 100);

    const staleComplete: ReadingProgress = { ...complete, lastActiveAt: 9_999_999_999_999 };
    const local = emptyLibrary();
    local.progress = next;
    const remote = emptyLibrary();
    remote.progress = staleComplete;
    const merged = mergeLibraries(local, remote);
    assert.equal(merged.progress.readingCycle, 2);
    assert.deepEqual(merged.progress.versesRead, []);
    assert.equal(merged.progress.finishedReadings.length, 1);
    assert.ok(merged.progress.finishedReadings[0]?.seenAt);
  });

  it("records a second finish as Reading 2 after starting again", () => {
    const first = reconcileFinishedReadings(progress({ versesRead: KEYS, readingStartedOn: "2026-01-01" }), "2026-03-01");
    const reset = startNewReading(first, "2026-03-02", 10);
    const second = reconcileFinishedReadings(
      { ...reset, versesRead: KEYS, readingStartedOn: "2026-03-02" },
      "2026-11-22",
    );
    assert.equal(second.finishedReadings.length, 2);
    assert.equal(second.finishedReadings[0]?.index, 1);
    assert.equal(second.finishedReadings[1]?.index, 2);
    assert.equal(second.finishedReadings[1]?.id, finishedReadingId(2));
    assert.equal(second.finishedReadings[1]?.startedOn, "2026-03-02");
    assert.equal(second.finishedReadings[1]?.days, daysInclusive("2026-03-02", "2026-11-22"));
    assert.equal(pendingFinishedReading(second)?.id, finishedReadingId(2));
  });

  it("normalizeLibrary backfills from older JSON without the new fields", () => {
    const library = normalizeLibrary({
      progress: { versesRead: KEYS, historySince: "2024-09-01", lastReadDay: "2025-04-10" },
    });
    assert.ok(library);
    assert.equal(library!.progress.finishedReadings.length, 1);
    assert.equal(library!.progress.readingCycle, 1);
    assert.equal(library!.progress.finishedReadings[0]?.startedOn, "2024-09-01");
  });
});
