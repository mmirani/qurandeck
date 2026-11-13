"use client";

import { useSyncExternalStore } from "react";

function subscribe(query: string, onChange: () => void) {
  const mq = window.matchMedia(query);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function useMediaQuery(query: string, fallback = false) {
  return useSyncExternalStore(
    (onChange) => subscribe(query, onChange),
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

export function useMobileReader() {
  return useMediaQuery("(max-width: 767px)");
}

/** The surah column sits beside the reader from this width up. Keep in step with the shell. */
export const NAV_SIDEBAR_QUERY = "(min-width: 1280px)";

/**
 * One home logo. The header link steps aside while the open surah column
 * already shows QuranDeck at the top left. A collapsed column, and every
 * width below the column, keep the header link.
 */
export function headerShowsHomeLogo(sidebarColumn: boolean, navRailOpen: boolean) {
  return !(sidebarColumn && navRailOpen);
}
