import { mergeLibraries, type LibrarySnapshot } from "@/lib/library";

function stampMs(value: unknown) {
  if (value instanceof Date) return value.getTime();
  if (typeof value !== "string" || !value) return Number.NaN;
  return new Date(value).getTime();
}

/**
 * What to store for a PUT. A device that saw the latest row overwrites it (so
 * deletions stick). A device that is behind is merged with the row, and the
 * place always follows whoever read most recently.
 */
export function resolveIncoming(
  incoming: LibrarySnapshot,
  previous: LibrarySnapshot | null,
  rowUpdatedAt: unknown,
  baseUpdatedAt: unknown,
): LibrarySnapshot {
  if (!previous) return incoming;
  const rowMs = stampMs(rowUpdatedAt);
  const baseMs = stampMs(baseUpdatedAt);
  const behind = !Number.isFinite(baseMs) || (Number.isFinite(rowMs) && rowMs > baseMs);
  if (behind) return mergeLibraries(incoming, previous);
  return incoming;
}
