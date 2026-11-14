export type TranslationCredit = {
  name: string;
  authorName: string;
};

/** Default edition when the resources catalog cannot be read. Matches Quran.com resource 20. */
const FALLBACK_CREDITS: Record<number, TranslationCredit> = {
  20: { name: "Saheeh International", authorName: "Saheeh International" },
};

type CreditSource = {
  resource_name?: unknown;
  name?: unknown;
  author_name?: unknown;
};

type CatalogCredit = {
  id: number;
  name: string;
  authorName: string;
};

/**
 * Edition name for one translation. Payload metadata wins, then the resources
 * catalog, then the built-in default for Saheeh International.
 */
export function translationCredit(id: number, raw: CreditSource, catalog: CatalogCredit[]): TranslationCredit {
  const known = catalog.find((item) => item.id === id);
  const fallback = FALLBACK_CREDITS[id];
  const name = text(raw.resource_name) || text(raw.name) || known?.name || fallback?.name || "";
  const authorName = text(raw.author_name) || known?.authorName || fallback?.authorName || "";
  return { name, authorName };
}

/** One visible credit. Repeating the same name and author is collapsed. */
export function creditLine(name?: string | null, author?: string | null): string | null {
  const title = name?.trim() ?? "";
  const person = author?.trim() ?? "";
  if (!title && !person) return null;
  if (!person || person.toLowerCase() === title.toLowerCase()) return title || person;
  if (!title) return person;
  return `${title} · ${person}`;
}

/** The word gloss has no separate author in the content API. */
export const WORD_GLOSS_CREDIT = "Word-by-word gloss · Quran.com";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
