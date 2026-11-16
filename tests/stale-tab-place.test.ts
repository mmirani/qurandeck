import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyLibrary, mergeLibraries, type LibrarySnapshot } from "../src/lib/library";
import { resolveIncoming } from "../src/lib/library-resolve";
import { defaultReadingProgress, quietReadingPlace, type ReadingProgress } from "../src/lib/reading";

function at(lastVerseKey: string, lastActiveAt: number): LibrarySnapshot {
  const base = emptyLibrary();
  return { ...base, progress: { ...base.progress, lastVerseKey, lastActiveAt } };
}

function place(lastVerseKey: string, lastActiveAt: number): ReadingProgress {
  return { ...defaultReadingProgress, lastVerseKey, lastActiveAt };
}

const MIN = 60_000;

describe("quiet place saves (tab hidden, page closed, leaving the reader)", () => {
  it("a stale tab cannot stamp its old ayah over a newer synced place", () => {
    // Desktop settled on 2:255 at t=0. The phone's 18:10 (t=20 min) arrived by sync.
    const synced = place("18:10", 20 * MIN);
    const next = quietReadingPlace(synced, "2:255", { movedAt: 0 * MIN + 500, active: true });
    assert.equal(next, synced);
  });

  it("a move made on this screen after the saved place is kept, with the move's own time", () => {
    const saved = place("2:255", 10 * MIN);
    const next = quietReadingPlace(saved, "2:256", { movedAt: 11 * MIN, active: true });
    assert.equal(next.lastVerseKey, "2:256");
    assert.equal(next.lastActiveAt, 11 * MIN);
  });

  it("an untouched screen never claims the place", () => {
    const saved = place("2:255", 10 * MIN);
    assert.equal(quietReadingPlace(saved, "2:256", { movedAt: 11 * MIN, active: false }), saved);
  });

  it("the same ayah is not new reading", () => {
    const saved = place("2:255", 10 * MIN);
    assert.equal(quietReadingPlace(saved, "2:255", { movedAt: 11 * MIN, active: true }), saved);
  });

  it("ignores a missing or malformed ayah", () => {
    const saved = place("2:255", 10 * MIN);
    assert.equal(quietReadingPlace(saved, null, { movedAt: 11 * MIN, active: true }), saved);
    assert.equal(quietReadingPlace(saved, "nope", { movedAt: 11 * MIN, active: true }), saved);
  });
});

describe("server keeps the newest place", () => {
  it("an up-to-date device with an older place does not move the place back", () => {
    const row = at("18:10", 20 * MIN);
    const device = at("2:255", 5 * MIN);
    const stored = resolveIncoming(device, row, "2026-11-16T18:00:00.000Z", "2026-11-16T18:00:00.000Z");
    assert.equal(stored.progress.lastVerseKey, "18:10");
    assert.equal(stored.progress.lastActiveAt, 20 * MIN);
  });

  it("a newer place from an up-to-date device is stored as sent", () => {
    const row = at("18:10", 20 * MIN);
    const device = at("18:12", 21 * MIN);
    const stored = resolveIncoming(device, row, "2026-11-16T18:00:00.000Z", "2026-11-16T18:00:00.000Z");
    assert.equal(stored, device);
  });
});

describe("stale desktop tab returns after reading on the phone", () => {
  it("pull, Stop for now, then home: the phone's place survives on the server", () => {
    // t=0: desktop reads 2:255 and pushes.
    let server = at("2:255", 0);
    let serverAt = "2026-11-16T17:00:00.000Z";
    let desktop = at("2:255", 0);
    const desktopMovedAt = 0;

    // t=5..10 min: phone moves to Al-Kahf and saves.
    server = resolveIncoming(at("18:10", 10 * MIN), server, serverAt, serverAt);
    serverAt = "2026-11-16T17:10:00.000Z";

    // t=70 min: desktop comes back, pulls first, adopts the newer place.
    desktop = mergeLibraries(desktop, server);
    assert.equal(desktop.progress.lastVerseKey, "18:10");

    // "Stop for now", then Home: quiet save with this screen's (old) ayah.
    const progress = quietReadingPlace(desktop.progress, "2:255", { movedAt: desktopMovedAt, active: true });
    desktop = { ...desktop, progress };

    // Desktop pushes with the stamp it just pulled.
    server = resolveIncoming(desktop, server, serverAt, serverAt);
    assert.equal(server.progress.lastVerseKey, "18:10");
    assert.equal(desktop.progress.lastVerseKey, "18:10");
  });

  it("even if the desktop pushed before its pull landed, the server keeps the phone's place", () => {
    const server = at("18:10", 10 * MIN);
    const stale = at("2:255", 0);
    assert.equal(resolveIncoming(stale, server, "2026-11-16T17:10:00.000Z", "2026-11-16T17:00:00.000Z").progress.lastVerseKey, "18:10");
    assert.equal(resolveIncoming(stale, server, "2026-11-16T17:10:00.000Z", "2026-11-16T17:10:00.000Z").progress.lastVerseKey, "18:10");
  });
});
