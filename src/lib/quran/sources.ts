/**
 * Data sources for QuranDeck.
 *
 * quran.com (Quran Foundation)
 * - Public Content API v4: https://api.quran.com/api/v4
 * - Frontend: Next.js (quran/quran.com-frontend-next), ISR + CDN caching
 * - Backend: quran.com-api (Rails) + Content APIs for chapters, verses,
 *   word-by-word, recitations, translations, tafsirs, juz
 * - Audio CDN: https://audio.qurancdn.com (word audio + ayah mp3s)
 * - Chapter files: https://download.quranicaudio.com
 * - Official docs now live at api-docs.quran.foundation; the public
 *   api.quran.com/v4 endpoints used here do not require keys
 *
 * AlQuran Cloud / Islamic Network
 * - https://api.alquran.cloud/v1 — 100+ translation editions, search, juz
 * - Audio CDN: https://cdn.islamic.network/quran/audio/{bitrate}/{edition}/{ayah}.mp3
 * - No API key. Strong fallback for languages and ayah audio
 *
 * Other reliable feeds
 * - QuranEnc: https://quranenc.com/en/home/api — translation catalog + spoken translation MP3s
 * - Tanzil: https://tanzil.net/docs/resources — canonical Uthmani text dumps
 * - EveryAyah: https://everyayah.com — recitation mp3s and timing files
 *
 * User data (bookmarks, notes, accounts) stays local in this first slice.
 * Quran Foundation also has authenticated User APIs for cloud sync later.
 */

export const QURAN_COM_API = "https://api.quran.com/api/v4";
export const ALQURAN_API = "https://api.alquran.cloud/v1";
export const AUDIO_QURANCDN = "https://audio.qurancdn.com";
export const AUDIO_ISLAMIC_NETWORK = "https://cdn.islamic.network/quran/audio/128";

export const DEFAULT_TRANSLATION_ID = 20; // Saheeh International
export const DEFAULT_RECITATION_ID = 7; // Mishari Rashid al-Afasy
export const DEFAULT_TAFSIR_ID = 169; // Ibn Kathir (Abridged), English

export const TRANSLATION_EDITION_MAP: Record<number, string> = {
  20: "en.sahih",
  19: "en.pickthall",
  22: "en.yusufali",
  203: "en.hilali",
  85: "en.ahmedali",
  131: "en.sahih",
  17: "ar.jalalayn",
};

export function resolveAudioUrl(url?: string | null, verseId?: number) {
  if (url) {
    if (url.startsWith("http")) return url;
    return `${AUDIO_QURANCDN}/${url.replace(/^\//, "")}`;
  }
  if (verseId) {
    return `${AUDIO_ISLAMIC_NETWORK}/ar.alafasy/${verseId}.mp3`;
  }
  return null;
}

function pad3(value: number) {
  return String(value).padStart(3, "0");
}

/** Quran.com audio_url counts pause marks as extra files; location does not. */
export function wordByWordAudioUrl(location?: string | null) {
  if (!location) return null;
  const [chapterRaw, verseRaw, wordRaw] = location.split(":");
  const chapter = Number(chapterRaw);
  const verse = Number(verseRaw);
  const word = Number((wordRaw ?? "").split("-")[0]);
  if (![chapter, verse, word].every((value) => Number.isInteger(value) && value > 0)) return null;
  return `${AUDIO_QURANCDN}/wbw/${pad3(chapter)}_${pad3(verse)}_${pad3(word)}.mp3`;
}

export function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

export function tafsirPlain(html: string) {
  return stripHtml(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/&nbsp;/g, " "),
  ).replace(/\n{3,}/g, "\n\n");
}
