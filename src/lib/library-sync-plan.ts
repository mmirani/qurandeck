import type { LibrarySnapshot } from "@/lib/library";

/** Notes, bookmarks, and the saved ayah sync quickly. */
export const DURABLE_PUSH_MS = 2_000;
/** Reading seconds are a meter. They sync on a slow cadence and when the tab hides. */
export const METER_PUSH_MS = 120_000;
/** Other devices are pulled on focus, then not again until this backoff. */
export const PULL_BACKOFF_MS = 5 * 60 * 1000;

export type LibraryChange = "none" | "meter" | "durable";

/**
 * `meter` is only the reading-time counters. `lastVerseKey` and `lastActiveAt`
 * are durable so the auto bookmark still syncs when the place changes.
 */
export function libraryChangeKind(previous: LibrarySnapshot | null, next: LibrarySnapshot): LibraryChange {
  if (!previous) return "durable";
  if (stable(durableParts(previous)) === stable(durableParts(next))) {
    return stable(meterParts(previous)) === stable(meterParts(next)) ? "none" : "meter";
  }
  return "durable";
}

export function strongerChange(current: LibraryChange, next: LibraryChange): LibraryChange {
  if (current === "durable" || next === "durable") return "durable";
  if (current === "meter" || next === "meter") return "meter";
  return "none";
}

export function pushDelayMs(kind: Exclude<LibraryChange, "none">, elapsedSincePush: number) {
  if (kind === "durable") return DURABLE_PUSH_MS;
  return Math.max(DURABLE_PUSH_MS, METER_PUSH_MS - Math.max(0, elapsedSincePush));
}

export function shouldPullLibrary(now: number, lastPullAt: number, backoffMs = PULL_BACKOFF_MS) {
  return now - lastPullAt >= backoffMs;
}

function durableParts(snapshot: LibrarySnapshot) {
  const dailyAyahs = Object.fromEntries(
    Object.entries(snapshot.progress.daily).map(([day, tally]) => [day, tally.ayahs]),
  );
  return {
    preferences: snapshot.preferences,
    bookmarks: snapshot.bookmarks,
    notes: snapshot.notes,
    highlights: snapshot.highlights,
    swatches: snapshot.swatches,
    displayName: snapshot.displayName ?? "",
    displayNameUpdatedAt: snapshot.displayNameUpdatedAt ?? "",
    avatar: snapshot.avatar ?? "",
    avatarUpdatedAt: snapshot.avatarUpdatedAt ?? "",
    place: { ...snapshot.progress, totalSeconds: 0, daily: {} },
    dailyAyahs,
  };
}

function meterParts(snapshot: LibrarySnapshot) {
  return {
    totalSeconds: snapshot.progress.totalSeconds,
    dailySeconds: Object.fromEntries(
      Object.entries(snapshot.progress.daily).map(([day, tally]) => [day, tally.seconds]),
    ),
  };
}

function stable(value: unknown) {
  return JSON.stringify(value);
}
