/** Product name (the site). The work being read stays The Noble Quran. */
export const PRODUCT_NAME = "QuranDeck";
export const PRODUCT_DISPLAY = "QuranDeck";
export const WORK_TITLE = "The Noble Quran";
export const SITE_TITLE = `${PRODUCT_NAME} · ${WORK_TITLE}`;
export const PROMISE_LINE = "Free, Private, Forever";
export const PROMISE_WHY =
  "Notes, highlights, favorites, progress, and a private mushaf that keeps improving with you.";
export const PROMISE_STORY =
  `${PRODUCT_NAME} is a free, private, personalized platform. Your notes, highlights, favorites, and progress live here — and we keep improving it through your feedback. Free forever, in sha Allah.`;
export const SITE_DESCRIPTION =
  "QuranDeck is a free, private reading room for The Noble Quran. Arabic and translation, recitation, notes, and your place in the mushaf. No ads. Free forever, in sha Allah.";
export const COMPANION_NAME = "Sana";
export const COMPANION_NAME_AR = "سَنَا";

/** Apex origin for canonical URLs, sitemap, and social cards. */
export const CANONICAL_ORIGIN = "https://qurandeck.com";

/**
 * Public origin. Always the apex domain so preview hosts and
 * qurandeck.vercel.app cannot become a second indexable copy.
 */
export function siteUrl() {
  return CANONICAL_ORIGIN;
}
