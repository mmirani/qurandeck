/** Guest account entry. Sign-up and sign-in share one sheet; the mode only changes the words. */

export type AuthEntryMode = "signup" | "signin";

export function authEntryMode(value: string | null | undefined): AuthEntryMode {
  return value === "signup" ? "signup" : "signin";
}

/** Opens the existing account sheet on the home page in the requested mode. */
export function authEntryHref(mode: AuthEntryMode) {
  return `/?auth=1&mode=${mode}`;
}

export const ACCOUNT_BENEFIT =
  "Free account keeps your notes, bookmarks and place across devices.";
