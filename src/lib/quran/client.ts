import { translationQuery } from "./languages";
import type {
  Chapter,
  Juz,
  RecitationResource,
  SearchHit,
  TafsirPassage,
  TafsirResource,
  TranslationResource,
  Verse,
} from "./types";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `Request failed ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getChapters() {
  return getJson<Chapter[]>("/api/quran/chapters");
}

export function getTranslations() {
  return getJson<TranslationResource[]>("/api/quran/translations");
}

export function getRecitations() {
  return getJson<RecitationResource[]>("/api/quran/recitations");
}

export function getTafsirs() {
  return getJson<TafsirResource[]>("/api/quran/tafsirs");
}

export function getTafsir(verseKey: string, tafsirId: number) {
  return getJson<TafsirPassage>(
    `/api/quran/tafsir?verse=${encodeURIComponent(verseKey)}&id=${tafsirId}`,
  );
}

export function getJuzs() {
  return getJson<Juz[]>("/api/quran/juzs");
}

export function getSurah(id: number, translationIds: number[] | number, recitationId: number) {
  const translation = translationQuery(Array.isArray(translationIds) ? translationIds : [translationIds]);
  return getJson<{ chapter: Chapter; verses: Verse[]; introduction: string }>(
    `/api/quran/surah/${id}?translation=${encodeURIComponent(translation)}&recitation=${recitationId}`,
  );
}

export function getJuz(id: number, translationIds: number[] | number) {
  const translation = translationQuery(Array.isArray(translationIds) ? translationIds : [translationIds]);
  return getJson<{ juz: number; verses: Verse[] }>(
    `/api/quran/juz/${id}?translation=${encodeURIComponent(translation)}`,
  );
}

export function searchQuran(query: string, translationId: number) {
  return getJson<{ results: SearchHit[] }>(
    `/api/quran/search?q=${encodeURIComponent(query)}&translation=${translationId}`,
  );
}

export function getAudioMap(recitationId: number, chapterId: number) {
  return getJson<Record<string, string | null>>(
    `/api/quran/audio?recitation=${recitationId}&chapter=${chapterId}`,
  );
}
