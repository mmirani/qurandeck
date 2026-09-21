import { translationQuery } from "./languages";
import {
  ALQURAN_API,
  DEFAULT_TRANSLATION_ID,
  QURAN_COM_API,
  TRANSLATION_EDITION_MAP,
  resolveAudioUrl,
  stripHtml,
  tafsirPlain,
  wordByWordAudioUrl,
} from "./sources";
import type {
  Chapter,
  Juz,
  RecitationResource,
  SearchHit,
  TafsirPassage,
  TafsirResource,
  TranslationResource,
  Verse,
  VerseTranslation,
  Word,
} from "./types";

const revalidate = { next: { revalidate: 86400 } } as const;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    ...revalidate,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Request failed ${res.status} for ${url}`);
  }
  return res.json() as Promise<T>;
}

function mapChapter(raw: Record<string, unknown>): Chapter {
  const translated = raw.translated_name as { name?: string } | undefined;
  return {
    id: Number(raw.id),
    nameSimple: String(raw.name_simple ?? raw.name ?? ""),
    nameArabic: String(raw.name_arabic ?? ""),
    translatedName: String(translated?.name ?? raw.englishNameTranslation ?? ""),
    versesCount: Number(raw.verses_count ?? raw.numberOfAyahs ?? 0),
    revelationPlace: String(raw.revelation_place ?? raw.revelationType ?? "makkah").toLowerCase().includes("mad")
      ? "madinah"
      : "makkah",
    revelationOrder: Number(raw.revelation_order ?? 0),
    bismillahPre: Boolean(raw.bismillah_pre ?? true),
    pages: Array.isArray(raw.pages) ? (raw.pages as number[]) : [],
  };
}

function mapWord(raw: Record<string, unknown>): Word {
  const translation = raw.translation as { text?: string } | undefined;
  const transliteration = raw.transliteration as { text?: string } | undefined;
  return {
    id: Number(raw.id ?? raw.position ?? 0),
    position: Number(raw.position ?? 0),
    location: String(raw.location ?? ""),
    charType: String(raw.char_type_name ?? "word"),
    textUthmani: String(raw.text_uthmani ?? raw.text ?? ""),
    translation: String(translation?.text ?? ""),
    transliteration: String(transliteration?.text ?? ""),
    audioUrl:
      wordByWordAudioUrl(String(raw.location ?? "")) ??
      resolveAudioUrl(typeof raw.audio_url === "string" ? raw.audio_url : null),
  };
}

function mapVerse(raw: Record<string, unknown>, chapterId: number): Verse {
  const translations = ((raw.translations as Array<Record<string, unknown>> | undefined) ?? []).map(
    (item): VerseTranslation => ({
      id: Number(item.resource_id ?? item.id ?? 0),
      text: stripHtml(String(item.text ?? "")),
    }),
  );
  const first = translations[0];
  const words = ((raw.words as Array<Record<string, unknown>> | undefined) ?? []).map(mapWord);
  const audio = raw.audio as { url?: string } | undefined;
  const transliteration = words
    .filter((word) => word.charType === "word")
    .map((word) => word.transliteration)
    .filter(Boolean)
    .join(" ");

  return {
    id: Number(raw.id),
    chapterId: Number(raw.chapter_id ?? chapterId),
    verseNumber: Number(raw.verse_number ?? raw.numberInSurah ?? 0),
    verseKey: String(raw.verse_key ?? `${chapterId}:${raw.verse_number}`),
    juzNumber: Number(raw.juz_number ?? 0),
    hizbNumber: Number(raw.hizb_number ?? 0),
    pageNumber: Number(raw.page_number ?? 0),
    textUthmani: String(raw.text_uthmani ?? words.filter((w) => w.charType === "word").map((w) => w.textUthmani).join(" ")),
    translation: first?.text ?? "",
    translationName: undefined,
    translations,
    transliteration,
    words,
    audioUrl: resolveAudioUrl(audio?.url, Number(raw.id)),
  };
}

export async function fetchChapterInfo(id: number): Promise<string> {
  try {
    const data = await getJson<{ chapter_info?: { short_text?: string; text?: string } }>(
      `${QURAN_COM_API}/chapters/${id}/info?language=en`,
    );
    const shortText = stripHtml(String(data.chapter_info?.short_text ?? ""));
    if (shortText) return shortText;
    return stripHtml(String(data.chapter_info?.text ?? ""));
  } catch {
    return "";
  }
}

export async function fetchVerseByKey(verseKey: string, translationIds: number[] | number = DEFAULT_TRANSLATION_ID): Promise<Verse> {
  const translations = translationQuery(Array.isArray(translationIds) ? translationIds : [translationIds]);
  const data = await getJson<{ verse: Record<string, unknown> }>(
    `${QURAN_COM_API}/verses/by_key/${verseKey}?language=en&words=true&translations=${translations}&word_fields=verse_key,text_uthmani,translation,transliteration,audio_url,location&fields=text_uthmani,verse_key,juz_number,page_number,hizb_number,chapter_id`,
  );
  const chapterId = Number(String(verseKey).split(":")[0] || 1);
  return mapVerse(data.verse, chapterId);
}

async function paginateQuranCom<T>(
  path: string,
  key: string,
  extra = "",
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let next: number | null = 1;
  while (next) {
    const separator = path.includes("?") ? "&" : "?";
    const data = await getJson<Record<string, unknown>>(
      `${QURAN_COM_API}${path}${separator}per_page=50&page=${page}${extra}`,
    );
    const batch = (data[key] as T[] | undefined) ?? [];
    items.push(...batch);
    const pagination = data.pagination as { next_page?: number | null } | undefined;
    next = pagination?.next_page ?? null;
    page = next ?? page + 1;
    if (batch.length === 0) break;
  }
  return items;
}

export async function fetchChapters(): Promise<Chapter[]> {
  const data = await getJson<{ chapters: Array<Record<string, unknown>> }>(
    `${QURAN_COM_API}/chapters?language=en`,
  );
  return data.chapters.map(mapChapter);
}

export async function fetchChapter(id: number): Promise<Chapter> {
  const data = await getJson<{ chapter: Record<string, unknown> }>(
    `${QURAN_COM_API}/chapters/${id}?language=en`,
  );
  return mapChapter(data.chapter);
}

export async function fetchTranslations(): Promise<TranslationResource[]> {
  const data = await getJson<{ translations: Array<Record<string, unknown>> }>(
    `${QURAN_COM_API}/resources/translations?language=en`,
  );
  return data.translations.map((item) => ({
    id: Number(item.id),
    name: String(item.name ?? ""),
    authorName: String(item.author_name ?? ""),
    languageName: String(item.language_name ?? ""),
    slug: String(item.slug ?? ""),
  }));
}

export async function fetchRecitations(): Promise<RecitationResource[]> {
  const data = await getJson<{ recitations: Array<Record<string, unknown>> }>(
    `${QURAN_COM_API}/resources/recitations?language=en`,
  );
  return data.recitations.map((item) => ({
    id: Number(item.id),
    reciterName: String(item.reciter_name ?? ""),
    style: item.style ? String(item.style) : null,
  }));
}

export async function fetchTafsirs(): Promise<TafsirResource[]> {
  const data = await getJson<{ tafsirs: Array<Record<string, unknown>> }>(
    `${QURAN_COM_API}/resources/tafsirs?language=en`,
  );
  return data.tafsirs.map((item) => ({
    id: Number(item.id),
    name: String(item.name ?? ""),
    authorName: String(item.author_name ?? ""),
    languageName: String(item.language_name ?? ""),
    slug: String(item.slug ?? ""),
  }));
}

export async function fetchTafsirByAyah(tafsirId: number, verseKey: string): Promise<TafsirPassage> {
  const data = await getJson<{ tafsir: Record<string, unknown> }>(
    `${QURAN_COM_API}/tafsirs/${tafsirId}/by_ayah/${encodeURIComponent(verseKey)}`,
  );
  const raw = data.tafsir ?? {};
  const verses = (raw.verses as Record<string, unknown> | undefined) ?? {};
  const verseKeys = Object.keys(verses);
  return {
    id: Number(raw.resource_id ?? tafsirId),
    name: String(raw.resource_name ?? ""),
    verseKey,
    verseKeys: verseKeys.length > 0 ? verseKeys : [verseKey],
    text: tafsirPlain(String(raw.text ?? "")),
  };
}

export async function fetchJuzs(): Promise<Juz[]> {
  const data = await getJson<{ juzs: Array<Record<string, unknown>> }>(
    `${QURAN_COM_API}/juzs`,
  );
  const seen = new Set<number>();
  const juzs: Juz[] = [];
  for (const item of data.juzs) {
    const juzNumber = Number(item.juz_number);
    if (juzNumber < 1 || juzNumber > 30 || seen.has(juzNumber)) continue;
    seen.add(juzNumber);
    juzs.push({
      juzNumber,
      versesCount: Number(item.verses_count ?? 0),
      verseMapping: (item.verse_mapping as Record<string, string>) ?? {},
      firstVerseId: Number(item.first_verse_id ?? 0),
      lastVerseId: Number(item.last_verse_id ?? 0),
    });
  }
  return juzs.sort((a, b) => a.juzNumber - b.juzNumber);
}

async function fetchAudioByChapter(recitationId: number, chapterId: number) {
  const files = await paginateQuranCom<Record<string, unknown>>(
    `/recitations/${recitationId}/by_chapter/${chapterId}`,
    "audio_files",
  );
  const map = new Map<string, string | null>();
  for (const file of files) {
    map.set(String(file.verse_key), resolveAudioUrl(typeof file.url === "string" ? file.url : null));
  }
  return map;
}

export async function fetchVersesByChapter(
  chapterId: number,
  translationIds: number[] | number = DEFAULT_TRANSLATION_ID,
  recitationId?: number,
): Promise<Verse[]> {
  const translations = translationQuery(Array.isArray(translationIds) ? translationIds : [translationIds]);
  const raw = await paginateQuranCom<Record<string, unknown>>(
    `/verses/by_chapter/${chapterId}`,
    "verses",
    `&language=en&words=true&translations=${translations}&word_fields=verse_key,text_uthmani,translation,transliteration,audio_url,location&fields=text_uthmani,verse_key,juz_number,page_number,hizb_number`,
  );
  const verses = raw.map((item) => mapVerse(item, chapterId));
  if (recitationId) {
    try {
      const audio = await fetchAudioByChapter(recitationId, chapterId);
      for (const verse of verses) {
        verse.audioUrl = audio.get(verse.verseKey) ?? verse.audioUrl;
      }
    } catch {
      // Keep fallback ayah URLs.
    }
  }
  return verses;
}

export async function fetchVersesByJuz(
  juzNumber: number,
  translationIds: number[] | number = DEFAULT_TRANSLATION_ID,
): Promise<Verse[]> {
  const translations = translationQuery(Array.isArray(translationIds) ? translationIds : [translationIds]);
  const raw = await paginateQuranCom<Record<string, unknown>>(
    `/verses/by_juz/${juzNumber}`,
    "verses",
    `&language=en&words=true&translations=${translations}&word_fields=verse_key,text_uthmani,translation,transliteration,audio_url,location&fields=text_uthmani,verse_key,juz_number,page_number,hizb_number,chapter_id`,
  );
  return raw.map((item) => mapVerse(item, Number(item.chapter_id ?? 1)));
}

export async function fetchAudioMap(recitationId: number, chapterId: number) {
  const map = await fetchAudioByChapter(recitationId, chapterId);
  return Object.fromEntries(map.entries());
}

export async function searchQuran(query: string, translationId = DEFAULT_TRANSLATION_ID): Promise<SearchHit[]> {
  const cleaned = query.trim();
  if (!cleaned) return [];

  const verseKey = cleaned.match(/^(\d{1,3})\s*:\s*(\d{1,3})$/);
  if (verseKey) {
    return [
      {
        verseKey: `${Number(verseKey[1])}:${Number(verseKey[2])}`,
        chapterId: Number(verseKey[1]),
        verseNumber: Number(verseKey[2]),
        textArabic: "",
        textTranslation: "Jump to this verse",
        source: "jump",
      },
    ];
  }

  const edition = TRANSLATION_EDITION_MAP[translationId] ?? "en.sahih";
  const [foundation, cloud] = await Promise.allSettled([
    getJson<{
      search: {
        results: Array<{
          verse_key: string;
          text: string;
          translations?: Array<{ text: string }>;
        }>;
      };
    }>(`${QURAN_COM_API}/search?q=${encodeURIComponent(cleaned)}&size=20&language=en&page=1`),
    getJson<{
      data: {
        matches: Array<{
          text: string;
          numberInSurah: number;
          surah: { number: number };
        }>;
      };
    }>(`${ALQURAN_API}/search/${encodeURIComponent(cleaned)}/all/${edition}`),
  ]);

  const hits = new Map<string, SearchHit>();

  if (foundation.status === "fulfilled") {
    for (const item of foundation.value.search?.results ?? []) {
      const [chapterId, verseNumber] = item.verse_key.split(":").map(Number);
      hits.set(item.verse_key, {
        verseKey: item.verse_key,
        chapterId,
        verseNumber,
        textArabic: item.text,
        textTranslation: stripHtml(item.translations?.[0]?.text ?? ""),
        source: "quran.com",
      });
    }
  }

  if (cloud.status === "fulfilled") {
    for (const item of cloud.value.data?.matches ?? []) {
      const verseKeyValue = `${item.surah.number}:${item.numberInSurah}`;
      const existing = hits.get(verseKeyValue);
      if (existing) {
        existing.textTranslation = existing.textTranslation || item.text;
        continue;
      }
      hits.set(verseKeyValue, {
        verseKey: verseKeyValue,
        chapterId: item.surah.number,
        verseNumber: item.numberInSurah,
        textArabic: "",
        textTranslation: item.text,
        source: "alquran.cloud",
      });
    }
  }

  return Array.from(hits.values()).slice(0, 40);
}
