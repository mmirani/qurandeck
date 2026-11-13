import { DEFAULT_TRANSLATION_ID } from "./sources";
import { translationQuery } from "./languages";
import { fetchChapter, fetchChapterInfo, fetchVersePage } from "./server";
import type { Chapter, Verse } from "./types";

/** Ayahs in the first HTML response. The rest of a longer surah is filled in after paint. */
export const FIRST_SCREEN_AYAHS = 20;

export type SurahSeed = {
  chapter: Chapter;
  verses: Verse[];
  introduction: string;
  introductionSource: string;
  translationKey: string;
  /** True when `verses` is only the opening screen of a longer surah. */
  partial: boolean;
};

export async function loadSurahSeed(id: number): Promise<SurahSeed> {
  const translationIds = [DEFAULT_TRANSLATION_ID];
  const [chapter, verses, info] = await Promise.all([
    fetchChapter(id),
    fetchVersePage(id, translationIds, 1, FIRST_SCREEN_AYAHS),
    fetchChapterInfo(id),
  ]);
  return {
    chapter,
    verses,
    introduction: info.text,
    introductionSource: info.source,
    translationKey: translationQuery(translationIds),
    partial: verses.length < chapter.versesCount,
  };
}

/** The seed can stand in for a client fetch when it is this surah and these translations. */
export function seedMatchesReading(
  seed: SurahSeed | null,
  chapterId: number,
  translationIds: number[],
): seed is SurahSeed {
  if (!seed || seed.chapter.id !== chapterId) return false;
  return seed.translationKey === translationQuery(translationIds);
}

/** `#ayah-255`, `#255`, or `?ayah=255`. */
export function requestedAyahNumber(hash: string, ayahParam: string | null): number | undefined {
  if (ayahParam) {
    const query = Number(ayahParam);
    if (Number.isInteger(query) && query > 0) return query;
  }
  const named = /^#ayah-(\d+)$/.exec(hash);
  if (named) {
    const namedNumber = Number(named[1]);
    if (namedNumber > 0) return namedNumber;
  }
  const bare = /^#(\d+)$/.exec(hash);
  if (bare) {
    const bareNumber = Number(bare[1]);
    if (bareNumber > 0) return bareNumber;
  }
  return undefined;
}

export function mergeVerses(current: Verse[], incoming: Verse[]): Verse[] {
  if (incoming.length === 0) return current;
  const seen = new Set(current.map((verse) => verse.verseKey));
  const extra = incoming.filter((verse) => !seen.has(verse.verseKey));
  if (extra.length === 0) return current;
  return [...current, ...extra].sort((a, b) => a.verseNumber - b.verseNumber || a.chapterId - b.chapterId);
}
