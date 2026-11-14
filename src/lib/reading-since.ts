import type { Bookmark, Highlight, Note } from "@/lib/quran/types";

type Dated = { createdAt?: string; updatedAt?: string };

function stamp(item: Dated): number | null {
  for (const value of [item.createdAt, item.updatedAt]) {
    if (!value) continue;
    const time = Date.parse(value);
    if (!Number.isNaN(time)) return time;
  }
  return null;
}

/** Earliest note, highlight, or favorite time, if any of them has a date. */
export function earliestLibraryIso(
  notes: Array<Note | Dated>,
  bookmarks: Array<Bookmark | Dated>,
  highlights: Array<Highlight | Dated>,
): string | null {
  let earliest: number | null = null;
  for (const item of [...notes, ...bookmarks, ...highlights]) {
    const time = stamp(item);
    if (time == null) continue;
    if (earliest == null || time < earliest) earliest = time;
  }
  return earliest == null ? null : new Date(earliest).toISOString();
}

/**
 * First time this browser was used. Moves earlier when a saved note, highlight,
 * or favorite is older. Never moves later.
 */
export function resolveFirstSeen(stored: string | null, artifactIso: string | null, now = new Date()) {
  const times = [stored, artifactIso]
    .map((value) => (value ? Date.parse(value) : Number.NaN))
    .filter((value) => !Number.isNaN(value));
  if (times.length === 0) return { iso: now.toISOString(), changed: stored !== now.toISOString() };
  const earliest = Math.min(...times);
  const iso = new Date(earliest).toISOString();
  return { iso, changed: iso !== stored };
}

export function readingSinceSource(accountCreatedAt: string | null, firstSeenAt: string | null) {
  if (accountCreatedAt && !Number.isNaN(Date.parse(accountCreatedAt))) return accountCreatedAt;
  if (firstSeenAt && !Number.isNaN(Date.parse(firstSeenAt))) return firstSeenAt;
  return null;
}
