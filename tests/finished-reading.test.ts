import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { emptyLibrary, mergeLibraries, normalizeLibrary } from "../src/lib/library";
import {
  defaultReadingProgress,
  normalizeReadingProgress,
  todayKey,
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
  readVerse,
  reconcileFinishedReadings,
  startNewReading,
} from "../src/lib/finished-reading";
import {
  keepsakeDesignForMonth,
  keepsakeMotif,
  keepsakeSvg,
  KEEPSAKE_DESIGNS,
  KEEPSAKE_FOOTER_CLEAR,
  KEEPSAKE_STATS_CLEAR,
} from "../src/lib/keepsake-card";
import sharp from "sharp";

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

function assertLocalFinishDay(options: { timeZone: string; instant: string; localDay: string; utcDay: string }) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "--eval",
      `
        import { defaultReadingProgress, isFutureDay, todayKey } from "./src/lib/reading.ts";
        import { allVerseKeys, daysInclusive, ensureFinishedReading } from "./src/lib/finished-reading.ts";
        const instant = new Date("${options.instant}");
        const local = todayKey(instant);
        const utc = instant.toISOString().slice(0, 10);
        if (utc !== "${options.utcDay}") throw new Error("expected UTC day ${options.utcDay}, got " + utc);
        if (local !== "${options.localDay}") throw new Error("expected local day ${options.localDay}, got " + local);
        if (isFutureDay(utc, instant) === (utc <= local)) {
          throw new Error("future check did not follow the local day");
        }
        const next = ensureFinishedReading(
          { ...defaultReadingProgress, versesRead: allVerseKeys(), readingStartedOn: "2026-03-12" },
          local,
          instant,
        );
        const reading = next.finishedReadings[0];
        if (reading?.finishedOn !== "${options.localDay}") throw new Error("finishedOn " + reading?.finishedOn);
        if (reading?.days !== daysInclusive("2026-03-12", "${options.localDay}")) {
          throw new Error("days " + reading?.days);
        }
      `,
    ],
    { cwd: root, env: { ...process.env, TZ: options.timeZone }, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
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
    assert.doesNotMatch(svg, /\bapp\b/i);
  });

  it("gives each month a unique motif and seasonal paper", () => {
    const motifs = new Set<string>();
    const papers = new Set<string>();
    for (let month = 1; month <= 12; month += 1) {
      const design = keepsakeDesignForMonth(month);
      motifs.add(keepsakeMotif(design));
      papers.add(`${design.paperTop}|${design.paperMid}|${design.paperBottom}|${design.stem}`);
    }
    assert.equal(motifs.size, 12);
    assert.equal(papers.size, 12);
  });

  it("keeps title, dua, date and footer above AA contrast on every paper", () => {
    const ratio = (a: string, b: string) => {
      const lum = (hex: string) => {
        const rgb = [0, 1, 2].map((i) => {
          const channel = Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
          return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
      };
      const hi = Math.max(lum(a), lum(b));
      const lo = Math.min(lum(a), lum(b));
      return (hi + 0.05) / (lo + 0.05);
    };
    for (const design of KEEPSAKE_DESIGNS) {
      for (const paper of [design.paperTop, design.paperMid, design.paperBottom]) {
        assert.ok(ratio(design.ink, paper) >= 4.5, `${design.id} ink on ${paper}`);
        assert.ok(ratio(design.soft, paper) >= 4.5, `${design.id} soft on ${paper}`);
        assert.ok(ratio(design.muted, paper) >= 4.5, `${design.id} muted on ${paper}`);
      }
    }
  });

  it("keeps motif art out of the stats line and the site footer", async () => {
    const scale = 2;
    const hex = (value: string) => [
      Number.parseInt(value.slice(1, 3), 16),
      Number.parseInt(value.slice(3, 5), 16),
      Number.parseInt(value.slice(5, 7), 16),
    ] as const;
    const inkIn = async (design: (typeof KEEPSAKE_DESIGNS)[number], box: { x: number; y: number; width: number; height: number }) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560" width="800" height="1120">
        <rect width="400" height="560" fill="${design.paperMid}"/>
        ${keepsakeMotif(design)}
      </svg>`;
      const { data, info } = await sharp(Buffer.from(svg)).resize(400 * scale, 560 * scale).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const paper = hex(design.paperMid);
      let count = 0;
      for (let y = box.y * scale; y < (box.y + box.height) * scale; y += 1) {
        for (let x = box.x * scale; x < (box.x + box.width) * scale; x += 1) {
          const i = (y * info.width + x) * info.channels;
          const dr = Math.abs(data[i]! - paper[0]);
          const dg = Math.abs(data[i + 1]! - paper[1]);
          const db = Math.abs(data[i + 2]! - paper[2]);
          if (dr > 18 || dg > 18 || db > 18) count += 1;
        }
      }
      return count;
    };
    const failures: string[] = [];
    for (const design of KEEPSAKE_DESIGNS) {
      const stats = await inkIn(design, KEEPSAKE_STATS_CLEAR);
      const footer = await inkIn(design, KEEPSAKE_FOOTER_CLEAR);
      if (stats) failures.push(`${design.id} art in the stats line (${stats} px)`);
      if (footer) failures.push(`${design.id} art in the site footer (${footer} px)`);
    }
    assert.deepEqual(failures, []);
  });
});

describe("ensureFinishedReading and pending seen", () => {
  it("records a pending finish once when the last ayah is marked", () => {
    const now = new Date(2026, 10, 22, 21, 0, 0);
    const day = todayKey(now);
    const last = KEYS[KEYS.length - 1]!;
    const next = readVerse(almostDone(), last, day);
    assert.equal(isQuranFinished(next), true);
    assert.equal(next.finishedReadings.length, 1);
    const reading = next.finishedReadings[0]!;
    assert.equal(reading.id, finishedReadingId(1));
    assert.equal(reading.startedOn, "2026-03-12");
    assert.equal(reading.finishedOn, day);
    assert.equal(reading.days, daysInclusive("2026-03-12", day));
    assert.equal(reading.ayahs, 6236);
    assert.equal(reading.surahs, 114);
    assert.equal(reading.seenAt, null);
    assert.equal(pendingFinishedReading(next)?.id, reading.id);

    const later = new Date(2026, 10, 23, 8, 0, 0);
    const again = ensureFinishedReading(next, todayKey(later), later);
    assert.equal(again.finishedReadings.length, 1);
    assert.equal(again.finishedReadings[0]?.finishedOn, day);
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

  it("records the local calendar day in a late evening behind UTC, not the UTC date", () => {
    assertLocalFinishDay({
      timeZone: "America/Vancouver",
      instant: "2026-11-23T05:00:00.000Z",
      localDay: "2026-11-22",
      utcDay: "2026-11-23",
    });
  });

  it("records the local calendar day ahead of UTC, not the UTC date", () => {
    assertLocalFinishDay({
      timeZone: "Asia/Dubai",
      instant: "2026-11-22T21:00:00.000Z",
      localDay: "2026-11-23",
      utcDay: "2026-11-22",
    });
  });
});

describe("start again and merge", () => {
  it("archives the reading, clears the map, and keeps a later start from being undone by an old 100% copy", () => {
    const finished = reconcileFinishedReadings(
      almostDone({ lastActiveAt: 100 }),
      "2026-11-22",
    );
    // complete it
    const complete = readVerse(finished, KEYS[KEYS.length - 1]!, "2026-11-22");
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
