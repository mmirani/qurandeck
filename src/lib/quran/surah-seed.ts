import { DEFAULT_TRANSLATION_ID } from "./sources";
import { translationQuery } from "./languages";
import { fetchChapter, fetchChapterInfo, fetchVersesByChapter } from "./server";
import type { Chapter, Verse } from "./types";

export type SurahSeed = {
  chapter: Chapter;
  verses: Verse[];
  introduction: string;
  translationKey: string;
};

export async function loadSurahSeed(id: number): Promise<SurahSeed> {
  const translationIds = [DEFAULT_TRANSLATION_ID];
  const [chapter, verses, introduction] = await Promise.all([
    fetchChapter(id),
    fetchVersesByChapter(id, translationIds),
    fetchChapterInfo(id),
  ]);
  return {
    chapter,
    verses,
    introduction,
    translationKey: translationQuery(translationIds),
  };
}
