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

function subtitleRepeatsWork(work: string, subtitle: string) {
  const title = work.toLowerCase().replace(/['’]/g, "");
  const gloss = subtitle.toLowerCase().replace(/['’]/g, "").trim();
  return /tafhim al-qur/.test(title) && gloss === "the meaning of the quran";
}

/** Turn "Author - Work - The Meaning of the Quran" into "Author, Work" when the last part repeats the work. */
export function formatIntroductionSource(source: string) {
  const parts = source
    .trim()
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2 && subtitleRepeatsWork(parts[parts.length - 2], parts[parts.length - 1])) {
    parts.pop();
  }
  return parts.join(", ");
}

/** Attribution under the introduction. Empty when the API sends no source. */
export function introductionCredit(source: string): string | null {
  const formatted = formatIntroductionSource(source);
  return formatted ? `Source: ${formatted}` : null;
}
