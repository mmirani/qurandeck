import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyLibrary, mergeLibraries, type LibrarySnapshot } from "../src/lib/library";
import type { Bookmark, Highlight, Note } from "../src/lib/quran/types";

function library(patch: Partial<LibrarySnapshot>): LibrarySnapshot {
  return { ...emptyLibrary(), ...patch };
}

function note(verseKey: string, body: string, updatedAt: string): Note {
  return { id: `${verseKey}-${updatedAt}`, verseKey, body, updatedAt };
}

function verseBookmark(verseKey: string, createdAt: string): Bookmark {
  return { id: `b-${verseKey}-${createdAt}`, type: "verse", verseKey, label: "Saved", createdAt };
}

function highlight(verseKey: string, text: string, createdAt: string, id = `${verseKey}-${createdAt}`): Highlight {
  return { id, verseKey, layer: "ayah", swatchId: "gold", text, createdAt };
}

describe("guest library merge", () => {
  it("keeps guest and account notes, bookmarks, and highlights without duplicates", () => {
    const guest = library({
      notes: [note("2:255", "guest ayah", "2026-11-10T01:00:00.000Z"), note("1:1", "older", "2026-11-01T00:00:00.000Z")],
      bookmarks: [verseBookmark("2:255", "2026-11-10T01:00:00.000Z"), verseBookmark("18:1", "2026-11-02T00:00:00.000Z")],
      highlights: [highlight("2:255", "throne", "2026-11-10T01:00:00.000Z", "guest-highlight")],
      progress: {
        ...emptyLibrary().progress,
        versesRead: ["2:255", "1:1"],
        verseVisits: { "2:255": 4, "1:1": 1 },
        surahsRead: [1],
        totalSeconds: 40,
        lastVerseKey: "1:1",
        lastActiveAt: 20,
      },
    });
    const account = library({
      notes: [note("1:1", "newer account", "2026-11-09T00:00:00.000Z"), note("36:1", "account only", "2026-11-08T00:00:00.000Z")],
      bookmarks: [verseBookmark("2:255", "2026-11-01T00:00:00.000Z"), verseBookmark("36:2", "2026-11-03T00:00:00.000Z")],
      highlights: [
        highlight("2:255", "throne", "2026-11-09T00:00:00.000Z", "account-highlight"),
        highlight("36:1", "ya seen", "2026-11-08T00:00:00.000Z"),
      ],
      progress: {
        ...emptyLibrary().progress,
        versesRead: ["36:1", "2:255"],
        verseVisits: { "2:255": 2, "36:1": 3 },
        surahsRead: [36],
        totalSeconds: 90,
        lastVerseKey: "36:1",
        lastActiveAt: 10,
      },
    });

    const merged = mergeLibraries(guest, account);
    const notesByVerse = new Map(merged.notes.map((item) => [item.verseKey, item.body]));
    assert.equal(notesByVerse.size, 3);
    assert.equal(notesByVerse.get("2:255"), "guest ayah");
    assert.equal(notesByVerse.get("1:1"), "newer account");
    assert.equal(notesByVerse.get("36:1"), "account only");

    const verseKeys = merged.bookmarks.filter((item) => item.type === "verse").map((item) => item.verseKey);
    assert.deepEqual(verseKeys.sort(), ["18:1", "2:255", "36:2"].sort());
    assert.equal(merged.bookmarks.filter((item) => item.verseKey === "2:255").length, 1);
    assert.equal(merged.bookmarks.find((item) => item.verseKey === "2:255")?.createdAt, "2026-11-10T01:00:00.000Z");

    const throne = merged.highlights.filter((item) => item.verseKey === "2:255" && item.text === "throne");
    assert.equal(throne.length, 1);
    assert.equal(throne[0]?.id, "guest-highlight");
    assert.equal(merged.highlights.some((item) => item.verseKey === "36:1"), true);

    assert.deepEqual(merged.progress.versesRead.sort(), ["1:1", "2:255", "36:1"].sort());
    assert.equal(merged.progress.verseVisits["2:255"], 4);
    assert.equal(merged.progress.verseVisits["36:1"], 3);
    assert.deepEqual(merged.progress.surahsRead, [1, 36]);
    assert.equal(merged.progress.totalSeconds, 90);
    assert.equal(merged.progress.lastVerseKey, "1:1");
  });
});
