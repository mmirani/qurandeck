export const SEARCH_DEBOUNCE_MS = 300;

const ARABIC = /[\u0600-\u06FF]/;
const VERSE_KEY = /^\d{1,3}:\d{1,3}$/;

/** Latin words wait for 2 characters. Arabic and a verse key such as 2:255 start at 1. */
export function shouldLiveSearch(query: string): boolean {
  const text = query.trim();
  if (!text) return false;
  if (ARABIC.test(text) || VERSE_KEY.test(text)) return true;
  return text.length >= 2;
}

export function searchGenerationWins(requestId: number, latestId: number): boolean {
  return requestId === latestId;
}

/** One analytics event per settled query string, never once per keystroke. */
export function shouldCountSearch(lastCounted: string | null, query: string): boolean {
  return lastCounted !== query;
}

export function searchStatusMessage(input: {
  query: string;
  submittedQuery: string | null;
  searching: boolean;
  resultCount: number;
  nameHitCount: number;
}): string | null {
  const query = input.query.trim();
  if (input.searching || !query) return null;
  const nothingListed = input.resultCount === 0 && input.nameHitCount === 0;
  if (!nothingListed) return null;
  if (input.submittedQuery === query && shouldLiveSearch(query)) {
    return `No ayahs match “${query}”. Try another word, or narrow it with Filters.`;
  }
  return null;
}

export function moveSearchIndex(current: number, count: number, direction: "next" | "prev"): number {
  if (count <= 0) return -1;
  if (current < 0) return direction === "next" ? 0 : count - 1;
  if (direction === "next") return current >= count - 1 ? 0 : current + 1;
  return current <= 0 ? count - 1 : current - 1;
}
