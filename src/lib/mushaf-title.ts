/** Visible heading when the session has no given name, or the name is too long. */
export const DEFAULT_MUSHAF_TITLE = "Your Mushaf";

/**
 * Longest first cover line that still sits cleanly in the frame at the
 * smallest desktop size (14.5rem cover, 1.15rem display type). Longer
 * possessives fall back to "Your Mushaf" everywhere, instead of truncating.
 */
export const MUSHAF_COVER_OWNER_MAX = 10;

/**
 * Possessive Mushaf title from a session display name.
 * Uses the first word only, and the standard English 's form (James's).
 * Returns "Your Mushaf" when the name is missing or the first cover line
 * would be longer than MUSHAF_COVER_OWNER_MAX.
 */
export function mushafOwnerTitle(name?: string | null): string {
  const first = name?.trim().split(/\s+/).find(Boolean) ?? "";
  if (!first) return DEFAULT_MUSHAF_TITLE;
  const owner = `${first}'s`;
  if (owner.length > MUSHAF_COVER_OWNER_MAX) return DEFAULT_MUSHAF_TITLE;
  return `${owner} Mushaf`;
}

/** First line of the cover title ("Mansur's" or "Your"). */
export function mushafCoverOwner(title: string): string {
  return title.endsWith(" Mushaf") ? title.slice(0, -" Mushaf".length) : title;
}
