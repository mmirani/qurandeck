import "server-only";
import { DEFAULT_TRANSLATION_ID } from "./sources";
import { translationQuery } from "./languages";
import { FIRST_SCREEN_AYAHS, type SurahSeed } from "./surah-reading";
import { fetchChapter, fetchChapterInfo, fetchVersePage } from "./server";

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
