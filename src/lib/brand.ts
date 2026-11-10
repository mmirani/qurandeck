/** Product name (the site). The work being read stays The Noble Quran. */
export const PRODUCT_NAME = "QuranDeck";
export const PRODUCT_DISPLAY = "QuranDeck";
export const WORK_TITLE = "The Noble Quran";
export const SITE_TITLE = `${PRODUCT_NAME} — ${WORK_TITLE}`;
export const PROMISE_LINE = "Free, Private, Forever";
export const PROMISE_WHY =
  "Notes, highlights, favorites, progress, and a private mushaf that keeps improving with you.";
export const PROMISE_STORY =
  `${PRODUCT_NAME} is a free, private, personalized platform. Your notes, highlights, favorites, and progress live here — and we keep improving it through your feedback. Free forever, in sha Allah.`;
export const SITE_DESCRIPTION =
  "QuranDeck is a free, private, personalized platform for The Noble Quran. Notes, highlights, favorites, and recitation — improved through your feedback. Free forever, in sha Allah.";
export const COMPANION_NAME = "Sana";
export const COMPANION_NAME_AR = "سَنَا";

/** Public origin for canonical and social metadata. Never hard-coded to a preview host. */
export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) return `https://${production.replace(/\/$/, "")}`;
  const preview = process.env.VERCEL_URL?.trim();
  if (preview) return `https://${preview.replace(/\/$/, "")}`;
  return "http://localhost:3310";
}
