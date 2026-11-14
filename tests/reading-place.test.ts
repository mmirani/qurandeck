import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyLibrary, mergeLibraries } from "../src/lib/library";
import {
  continueBookmark,
  defaultReadingProgress,
  landingReadingPlace,
  noteReadingPlace,
  readingPlaceKey,
  saveReadingPlace,
} from "../src/lib/reading";

describe("saveReadingPlace", () => {
  it("bumps lastActiveAt when the ayah changes, even on a quiet flush", () => {
    const saved = saveReadingPlace(
      { ...defaultReadingProgress, lastVerseKey: "1:1", lastActiveAt: 1000 },
      "1:5",
      { touch: false, now: 5000 },
    );
    assert.equal(saved.lastVerseKey, "1:5");
    assert.equal(saved.lastActiveAt, 5000);
  });

  it("leaves the idle clock alone when a quiet flush repeats the same ayah", () => {
    const progress = { ...defaultReadingProgress, lastVerseKey: "1:5", lastActiveAt: 1000 };
    const saved = saveReadingPlace(progress, "1:5", { touch: false, now: 9000 });
    assert.equal(saved, progress);
    assert.equal(saved.lastActiveAt, 1000);
  });

  it("refreshes lastActiveAt when the reader is still on the same ayah", () => {
    const saved = saveReadingPlace(
      { ...defaultReadingProgress, lastVerseKey: "1:5", lastActiveAt: 1000 },
      "1:5",
      { now: 4000 },
    );
    assert.equal(saved.lastVerseKey, "1:5");
    assert.equal(saved.lastActiveAt, 4000);
  });

  it("wins a library merge after a quiet move, and loses if the stamp stays old", () => {
    const moved = saveReadingPlace(
      { ...defaultReadingProgress, lastVerseKey: "1:1", lastActiveAt: 1000 },
      "2:255",
      { touch: false, now: 5000 },
    );
    const remote = {
      ...emptyLibrary(),
      progress: { ...defaultReadingProgress, lastVerseKey: "1:1", lastActiveAt: 2000 },
    };
    assert.equal(mergeLibraries({ ...emptyLibrary(), progress: moved }, remote).progress.lastVerseKey, "2:255");

    const unstamped = {
      ...defaultReadingProgress,
      lastVerseKey: "2:255",
      lastActiveAt: 1000,
    };
    assert.equal(mergeLibraries({ ...emptyLibrary(), progress: unstamped }, remote).progress.lastVerseKey, "1:1");
  });
});

describe("readingPlaceKey", () => {
  it("follows playback, then an explicit ayah, and ignores the landing line until the reader scrolls", () => {
    assert.equal(
      readingPlaceKey({
        isPlaying: true,
        playingVerseKey: "2:10",
        engagedVerseKey: "2:4",
        visibleVerseKey: "2:1",
        scrolled: true,
      }),
      "2:10",
    );
    assert.equal(
      readingPlaceKey({
        isPlaying: false,
        playingVerseKey: "2:10",
        engagedVerseKey: "2:4",
        visibleVerseKey: "2:1",
        scrolled: false,
      }),
      "2:4",
    );
    assert.equal(
      readingPlaceKey({
        isPlaying: false,
        playingVerseKey: "2:10",
        engagedVerseKey: null,
        visibleVerseKey: "2:1",
        scrolled: false,
      }),
      null,
    );
    assert.equal(
      readingPlaceKey({
        isPlaying: false,
        playingVerseKey: null,
        engagedVerseKey: null,
        visibleVerseKey: "2:8",
        scrolled: true,
      }),
      "2:8",
    );
  });

  it("does not replace a saved ayah with the top of the same surah", () => {
    assert.equal(landingReadingPlace("1:5", "1:1"), null);
    assert.equal(landingReadingPlace("1:5", "2:1"), "2:1");
    assert.equal(landingReadingPlace(null, "2:1"), "2:1");
    assert.equal(landingReadingPlace("1:5", null), null);
  });
});

describe("noteReadingPlace", () => {
  it("moves the place when editing starts, and counts a visit only after there is text", () => {
    const started = noteReadingPlace(defaultReadingProgress, "36:12", "", 3000);
    assert.equal(started.lastVerseKey, "36:12");
    assert.equal(started.lastActiveAt, 3000);
    assert.equal(started.versesRead.includes("36:12"), false);
    assert.equal(started.verseVisits["36:12"], undefined);

    const saved = noteReadingPlace(started, "36:12", "  a reminder  ", 4000);
    assert.equal(saved.lastVerseKey, "36:12");
    assert.equal(saved.lastActiveAt, 4000);
    assert.equal(saved.versesRead.includes("36:12"), true);
    assert.equal(saved.verseVisits["36:12"], 1);
  });
});

describe("continueBookmark", () => {
  it("shows the saved ayah, not whichever ayah is at the reading line", () => {
    const card = continueBookmark({
      savedKey: "1:5",
      lineKey: "1:1",
      playingVerseKey: "1:1",
      isPlaying: false,
      savedOnScreen: false,
    });
    assert.equal(card.ayah, "1:5");
    assert.equal(card.here, false);
    assert.equal(card.showResume, true);
    assert.equal(card.resumeKey, "1:5");
  });

  it("says you are on the ayah when that place is on screen", () => {
    const card = continueBookmark({
      savedKey: "1:5",
      lineKey: "1:1",
      savedOnScreen: true,
    });
    assert.equal(card.ayah, "1:5");
    assert.equal(card.here, true);
    assert.equal(card.showResume, false);
  });

  it("offers resume before the reading line has been measured", () => {
    const card = continueBookmark({ savedKey: "2:15", lineKey: null });
    assert.equal(card.ayah, "2:15");
    assert.equal(card.here, false);
    assert.equal(card.showResume, true);
    assert.equal(card.resumeKey, "2:15");
  });

  it("falls back to the reading line before anything has been saved", () => {
    const card = continueBookmark({ savedKey: null, lineKey: "1:1" });
    assert.equal(card.ayah, "1:1");
    assert.equal(card.here, true);
    assert.equal(card.showResume, false);
  });
});
