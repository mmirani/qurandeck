export type ChapterInfo = {
  text: string;
  source: string;
};

type ChapterInfoPayload = {
  chapter_info?: {
    short_text?: string;
    text?: string;
    source?: string;
  };
};

export function readChapterInfo(data: ChapterInfoPayload, stripHtml: (value: string) => string): ChapterInfo {
  const info = data.chapter_info;
  const shortText = stripHtml(String(info?.short_text ?? "")).trim();
  const longText = stripHtml(String(info?.text ?? "")).trim();
  return {
    text: shortText || longText,
    source: stripHtml(String(info?.source ?? "")).trim(),
  };
}

/** Attribution under the introduction. Empty when the API sends no source. */
export function introductionCredit(source: string): string | null {
  const trimmed = source.trim();
  return trimmed ? `Source: ${trimmed}` : null;
}
