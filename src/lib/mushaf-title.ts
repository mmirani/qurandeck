/** Visible heading when the session has no given name. */
export const DEFAULT_MUSHAF_TITLE = "Your Mushaf";

/**
 * Possessive Mushaf title from a session display name.
 * Uses the first word only, and the standard English 's form (James's).
 * Returns "Your Mushaf" when the name is missing.
 */
export function mushafOwnerTitle(name?: string | null): string {
  const first = name?.trim().split(/\s+/).find(Boolean) ?? "";
  if (!first) return DEFAULT_MUSHAF_TITLE;
  return `${first}'s Mushaf`;
}
