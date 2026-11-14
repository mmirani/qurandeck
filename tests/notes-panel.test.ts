import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyLibrary, mergeLibraries, normalizeLibrary } from "../src/lib/library";
import { formatNoteMeta, normalizeNote, normalizeNotes, noteAfterEdit } from "../src/lib/notes";
import { buildLibraryExport, buildStatsCsv } from "../src/lib/export-library";
import { verseRangeLabel } from "../src/lib/verse-range";
import type { Note } from "../src/lib/quran/types";

describe("note createdAt", () => {
  it("fills a missing createdAt from updatedAt", () => {
    const note = normalizeNote({
      id: "n1",
      verseKey: "18:18",
      body: "the cave",
      updatedAt: "2026-11-13T15:00:00.000Z",
    });
    assert.equal(note?.createdAt, "2026-11-13T15:00:00.000Z");
    assert.equal(note?.updatedAt, "2026-11-13T15:00:00.000Z");
  });

  it("keeps an existing createdAt when hydrating a library", () => {
    const library = normalizeLibrary({
      notes: [
        {
          id: "n1",
          verseKey: "1:1",
          body: "opening",
          createdAt: "2026-11-01T00:00:00.000Z",
          updatedAt: "2026-11-13T00:00:00.000Z",
        },
        { id: "n2", verseKey: "2:255", body: "throne", updatedAt: "2026-11-02T00:00:00.000Z" },
      ],
    });
    assert.equal(library?.notes.find((item) => item.verseKey === "1:1")?.createdAt, "2026-11-01T00:00:00.000Z");
    assert.equal(library?.notes.find((item) => item.verseKey === "2:255")?.createdAt, "2026-11-02T00:00:00.000Z");
  });

  it("merges by updatedAt and still normalizes createdAt", () => {
    const older = normalizeNote({
      id: "old",
      verseKey: "1:1",
      body: "older",
      updatedAt: "2026-11-01T00:00:00.000Z",
    });
    const newer = normalizeNote({
      id: "new",
      verseKey: "1:1",
      body: "newer",
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-11-09T00:00:00.000Z",
    });
    assert.ok(older && newer);
    const merged = mergeLibraries(
      { ...emptyLibrary(), notes: [older] },
      { ...emptyLibrary(), notes: [newer] },
    );
    const note = merged.notes.find((item) => item.verseKey === "1:1");
    assert.equal(note?.body, "newer");
    assert.equal(note?.createdAt, "2026-10-01T00:00:00.000Z");
    assert.equal(note?.updatedAt, "2026-11-09T00:00:00.000Z");
  });

  it("sets both timestamps on create and only bumps updatedAt on edit", () => {
    const now = "2026-11-13T15:00:00.000Z";
    const created = noteAfterEdit(undefined, "18:18", "  first  ", now, "id-1");
    assert.ok(created);
    assert.equal(created?.createdAt, now);
    assert.equal(created?.updatedAt, now);
    assert.equal(created?.body, "first");
    const same = noteAfterEdit(created ?? undefined, "18:18", "first", "2026-11-13T16:00:00.000Z", "id-2");
    assert.equal(same, created);
    const edited = noteAfterEdit(created ?? undefined, "18:18", "second", "2026-11-14T08:00:00.000Z", "id-2");
    assert.equal(edited?.createdAt, now);
    assert.equal(edited?.updatedAt, "2026-11-14T08:00:00.000Z");
    assert.equal(edited?.id, "id-1");
    assert.equal(noteAfterEdit(created ?? undefined, "18:18", "   ", now, "id-2"), null);
  });

  it("includes createdAt in JSON export and created/updated columns in CSV", () => {
    const note: Note = {
      id: "n",
      verseKey: "18:18",
      body: "a note, with comma",
      createdAt: "2026-11-13T15:00:00.000Z",
      updatedAt: "2026-11-13T20:42:00.000Z",
    };
    const input = { ...emptyLibrary(), notes: [note], user: null };
    const doc = buildLibraryExport(input);
    assert.equal(doc.library.notes[0]?.createdAt, note.createdAt);
    const csv = buildStatsCsv(input);
    assert.match(csv, /section,key,value,created_at,updated_at/);
    assert.match(csv, /note,18:18,"a note, with comma",2026-11-13T15:00:00.000Z,2026-11-13T20:42:00.000Z/);
  });
});

describe("note meta", () => {
  it("shows only Created when the note was never edited", () => {
    const stamp = new Date(2026, 10, 13, 20, 42).toISOString();
    const meta = formatNoteMeta({ createdAt: stamp, updatedAt: stamp }, "en-US");
    assert.equal(meta.edited, null);
    assert.equal(meta.created.text, "Created Nov 13, 2026, 8:42 PM");
    assert.equal(meta.created.dateTime, stamp);
  });

  it("shows Edited time on the same day and Edited date on a later day", () => {
    const created = new Date(2026, 10, 13, 9, 5);
    const later = new Date(2026, 10, 13, 20, 42);
    const sameDay = formatNoteMeta(
      { createdAt: created.toISOString(), updatedAt: later.toISOString() },
      "en-US",
    );
    assert.equal(sameDay.created.text, "Created Nov 13, 2026");
    assert.equal(sameDay.edited?.text, "Edited 8:42 PM");
    const nextDay = new Date(2026, 10, 14, 8, 0);
    const otherDay = formatNoteMeta(
      { createdAt: created.toISOString(), updatedAt: nextDay.toISOString() },
      "en-US",
    );
    assert.equal(otherDay.edited?.text, "Edited Nov 14, 2026");
  });

  it("treats a missing createdAt as never edited", () => {
    const meta = formatNoteMeta({ updatedAt: new Date(2026, 10, 13, 8, 1).toISOString() }, "en-US");
    assert.equal(meta.edited, null);
    assert.match(meta.created.text, /^Created Nov 13, 2026, /);
  });
});

describe("highlight range label", () => {
  it("sorts a distance-ranked list into chapter and verse order", () => {
    const ranked = ["18:18", "18:17", "19:1"];
    assert.equal(verseRangeLabel(ranked), "In view · 18:17 – 19:1");
    assert.deepEqual(ranked, ["18:18", "18:17", "19:1"]);
    assert.equal(verseRangeLabel(["2:255", "1:7", "2:1"]), "In view · 1:7 – 2:255");
    assert.equal(verseRangeLabel(["18:10"]), "In view · 18:10");
    assert.equal(verseRangeLabel([]), "Scroll the mushaf");
  });
});

describe("normalizeNotes", () => {
  it("drops entries that are not notes", () => {
    assert.deepEqual(normalizeNotes([null, { body: "no key" }, { verseKey: "1:1", body: "ok", updatedAt: "2026-01-01T00:00:00.000Z" }]).map((item) => item.verseKey), ["1:1"]);
  });
});
