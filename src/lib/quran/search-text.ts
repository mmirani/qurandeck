import { DEFAULT_TRANSLATION_ID, stripHtml } from "./sources";

export type TextRun = { text: string; match: boolean };

const MARK = "\u0000";
const MARK_END = "\u0001";

/** Quran.com search path for one translation. The id selects the wording. */
export function quranSearchPath(query: string, translationId = DEFAULT_TRANSLATION_ID) {
  const id = Number.isInteger(translationId) && translationId > 0 ? translationId : DEFAULT_TRANSLATION_ID;
  const params = new URLSearchParams({
    q: query.trim(),
    size: "20",
    page: "1",
    translations: String(id),
  });
  return `/search?${params.toString()}`;
}

function highlightQuery(text: string, query: string): TextRun[] {
  const needle = query.trim();
  if (!text) return [];
  if (!needle) return [{ text, match: false }];
  const lower = text.toLowerCase();
  const q = needle.toLowerCase();
  const runs: TextRun[] = [];
  let index = 0;
  while (index < text.length) {
    const found = lower.indexOf(q, index);
    if (found < 0) {
      runs.push({ text: text.slice(index), match: false });
      break;
    }
    if (found > index) runs.push({ text: text.slice(index, found), match: false });
    runs.push({ text: text.slice(found, found + q.length), match: true });
    index = found + q.length;
  }
  return runs.filter((run) => run.text);
}

/** Keep `<em>` matches from the search API. Other tags are stripped. */
export function markedRuns(value: string, query = ""): TextRun[] {
  const marked = value.replace(/<em\b[^>]*>([\s\S]*?)<\/em>/gi, (_, inner: string) => `${MARK}${inner}${MARK_END}`);
  const foundEm = marked.includes(MARK);
  const plain = stripHtml(marked);
  if (!foundEm) return highlightQuery(plain, query);
  const runs: TextRun[] = [];
  const pattern = new RegExp(`${MARK}([^${MARK_END}]*)${MARK_END}`, "g");
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(plain))) {
    const before = plain.slice(last, match.index);
    const inner = match[1] ?? "";
    if (before) runs.push({ text: before, match: false });
    if (inner) runs.push({ text: inner, match: true });
    last = match.index + match[0].length;
  }
  const tail = plain.slice(last);
  if (tail) runs.push({ text: tail, match: false });
  return runs;
}

export function runsToText(runs: TextRun[]) {
  return runs.map((run) => run.text).join("").replace(/\s+/g, " ").trim();
}

/**
 * A translation snippet is shown only with the edition's name.
 * An empty name drops the text instead of leaving it unlabelled.
 */
export function namedTranslation(html: string, name: string | undefined, id: number | undefined, query = "") {
  const label = name?.trim() ?? "";
  if (!label) return null;
  const runs = markedRuns(html, query);
  const text = runsToText(runs);
  if (!text) return null;
  return {
    text,
    runs,
    translationName: label,
    translationId: Number.isInteger(id) && (id ?? 0) > 0 ? id : undefined,
  };
}
