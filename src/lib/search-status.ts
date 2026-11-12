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
  if (input.submittedQuery === query) {
    return `No ayahs match “${query}”. Try another word, or open Filters for themes such as Mercy or Prayer.`;
  }
  if (query.length > 1) {
    return "Press Enter to search the full Quran text, or open Filters to browse themes such as Mercy or Prayer.";
  }
  return null;
}
