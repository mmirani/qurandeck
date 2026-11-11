/** Random guest id in localStorage. Not a cookie. */
export const ANON_STORAGE_KEY = "al-mushaf-anon";
export const GUEST_RECORDED_KEY = "al-mushaf-guest-recorded";
export const GUEST_MERGED_KEY = "al-mushaf-guest-merged";

const ANON_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function canonicalAnonId(value: string): string | null {
  const id = value.trim().toLowerCase();
  return ANON_ID.test(id) ? id : null;
}
