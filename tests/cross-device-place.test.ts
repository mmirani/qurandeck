import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyLibrary, type LibrarySnapshot } from "../src/lib/library";
import { resolveIncoming } from "../src/lib/library-resolve";

function at(lastVerseKey: string, lastActiveAt: number, patch: Partial<LibrarySnapshot> = {}): LibrarySnapshot {
  const base = emptyLibrary();
  return { ...base, ...patch, progress: { ...base.progress, lastVerseKey, lastActiveAt } };
}

describe("cross-device reading place", () => {
  it("a stale desktop tab cannot pull the place back from the phone", () => {
    const phone = at("16:44", 2_000);
    const desktop = at("16:35", 1_000);
    const stored = resolveIncoming(desktop, phone, "2026-11-15T18:10:00.000Z", "2026-11-15T18:00:00.000Z");
    assert.equal(stored.progress.lastVerseKey, "16:44");
  });

  it("an old client with no base stamp is merged, not trusted", () => {
    const stored = resolveIncoming(at("16:35", 1_000), at("16:44", 2_000), "2026-11-15T18:10:00.000Z", undefined);
    assert.equal(stored.progress.lastVerseKey, "16:44");
  });

  it("an up-to-date device overwrites, so deletions stick", () => {
    const row = at("16:44", 2_000, { notes: [{ id: "n", verseKey: "16:1", body: "x", createdAt: "a", updatedAt: "a" }] });
    const device = at("16:50", 3_000);
    const stored = resolveIncoming(device, row, "2026-11-15T18:10:00.000Z", "2026-11-15T18:10:00.000Z");
    assert.equal(stored, device);
    assert.equal(stored.notes.length, 0);
  });

  it("a newer place from the device that is behind still wins", () => {
    const stored = resolveIncoming(at("16:50", 3_000), at("16:44", 2_000), "2026-11-15T18:10:00.000Z", "2026-11-15T18:00:00.000Z");
    assert.equal(stored.progress.lastVerseKey, "16:50");
  });

  it("first save with no row stores as sent", () => {
    const device = at("1:1", 1);
    assert.equal(resolveIncoming(device, null, undefined, null), device);
  });
});
