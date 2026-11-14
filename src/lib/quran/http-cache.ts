/** One day fresh, two days stale. Together they stay under Quran Foundation's one-week cache limit. */
export const QURAN_CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=172800";

export const QF_REVALIDATE_SECONDS = 86400;

const WEEK_SECONDS = 7 * 24 * 60 * 60;

/**
 * Browser and CDN headers for a public Quran GET.
 * `CDN-Cache-Control` and `Vercel-CDN-Cache-Control` are what the Vercel CDN
 * stores when middleware also sets response headers. They are not a CORS grant.
 */
export function quranCacheHeaders(): Record<string, string> {
  return {
    "Cache-Control": QURAN_CACHE_CONTROL,
    "CDN-Cache-Control": QURAN_CACHE_CONTROL,
    "Vercel-CDN-Cache-Control": QURAN_CACHE_CONTROL,
  };
}

export function cacheWindowSeconds(header = QURAN_CACHE_CONTROL) {
  const fresh = Number(/s-maxage=(\d+)/.exec(header)?.[1] ?? 0);
  const stale = Number(/stale-while-revalidate=(\d+)/.exec(header)?.[1] ?? 0);
  return { fresh, stale, total: fresh + stale, withinWeek: fresh + stale < WEEK_SECONDS };
}
