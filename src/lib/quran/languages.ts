import { DEFAULT_TRANSLATION_ID } from "./sources";
import type { Preferences, TranslationResource } from "./types";

export const MAX_TRANSLATIONS = 6;

const RTL = new Set([
  "arabic",
  "urdu",
  "persian",
  "hebrew",
  "pashto",
  "sindhi",
  "uyghur",
  "kurdish",
  "divehi",
  "punjabi",
  "kashmiri",
]);

const LANGUAGE_ALIASES: Record<string, { key: string; label: string }> = {
  farsi: { key: "persian", label: "Persian" },
  persian: { key: "persian", label: "Persian" },
  uighur: { key: "uyghur", label: "Uyghur" },
  uyghur: { key: "uyghur", label: "Uyghur" },
  dhivehi: { key: "divehi", label: "Divehi" },
  divehi: { key: "divehi", label: "Divehi" },
  maldivian: { key: "divehi", label: "Divehi" },
  sinhalese: { key: "sinhala", label: "Sinhala" },
  sinhala: { key: "sinhala", label: "Sinhala" },
  yuw: { key: "yau", label: "Yau" },
  yau: { key: "yau", label: "Yau" },
};

const PREFERRED: Record<string, number> = {
  english: DEFAULT_TRANSLATION_ID,
};

export type LanguageGroup = {
  key: string;
  label: string;
  editions: TranslationResource[];
  preferredId: number;
};

export function languageKey(name: string) {
  return name.trim().toLowerCase();
}

export function languageLabel(name: string) {
  return canonicalLanguage(name).label;
}

export function canonicalLanguage(name: string): { key: string; label: string } {
  const normalized = name.trim().toLowerCase().replace(/\s*,\s*/g, ", ");
  const first = normalized.split(",")[0]?.trim() || "other";
  const alias = LANGUAGE_ALIASES[normalized] ?? LANGUAGE_ALIASES[first];
  if (alias) return alias;
  const label = first.replace(/\p{L}+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1));
  return { key: first || "other", label: label || "Other" };
}

export function isRtlLanguage(name: string) {
  return RTL.has(canonicalLanguage(name).key);
}

/** BCP 47 tags for `lang`. Internal keys such as "english" are not valid. */
const HTML_LANG: Record<string, string> = {
  afrikaans: "af",
  albanian: "sq",
  amharic: "am",
  arabic: "ar",
  armenian: "hy",
  assamese: "as",
  azeri: "az",
  azerbaijani: "az",
  bangla: "bn",
  bengali: "bn",
  bosnian: "bs",
  bulgarian: "bg",
  burmese: "my",
  chechen: "ce",
  chinese: "zh",
  czech: "cs",
  danish: "da",
  dari: "fa-AF",
  divehi: "dv",
  dutch: "nl",
  english: "en",
  finnish: "fi",
  french: "fr",
  georgian: "ka",
  german: "de",
  greek: "el",
  gujarati: "gu",
  hausa: "ha",
  hebrew: "he",
  hindi: "hi",
  hungarian: "hu",
  indonesian: "id",
  italian: "it",
  japanese: "ja",
  kannada: "kn",
  kashmiri: "ks",
  kazakh: "kk",
  khmer: "km",
  korean: "ko",
  kurdish: "ku",
  kyrgyz: "ky",
  malay: "ms",
  malayalam: "ml",
  marathi: "mr",
  mongolian: "mn",
  nepali: "ne",
  norwegian: "no",
  pashto: "ps",
  persian: "fa",
  polish: "pl",
  portuguese: "pt",
  punjabi: "pa",
  romanian: "ro",
  russian: "ru",
  sindhi: "sd",
  sinhala: "si",
  somali: "so",
  spanish: "es",
  swahili: "sw",
  swedish: "sv",
  tagalog: "tl",
  tajik: "tg",
  tamil: "ta",
  tatar: "tt",
  telugu: "te",
  thai: "th",
  turkish: "tr",
  turkmen: "tk",
  ukrainian: "uk",
  urdu: "ur",
  uyghur: "ug",
  uzbek: "uz",
  vietnamese: "vi",
  yoruba: "yo",
};

export function htmlLang(name: string): string | undefined {
  return HTML_LANG[canonicalLanguage(name).key];
}

export function scriptClass(name: string) {
  const key = canonicalLanguage(name).key;
  if (key === "urdu" || key === "sindhi" || key === "punjabi" || key === "kashmiri") return "script-nastaliq";
  if (key === "hebrew") return "script-hebrew";
  if (key === "divehi") return "script-thaana";
  if (isRtlLanguage(key)) return "script-naskh";
  return "";
}

export function sanitizeTranslationIds(ids: unknown): number[] {
  const list = Array.isArray(ids) ? ids : [];
  const unique: number[] = [];
  for (const raw of list) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0 || unique.includes(id)) continue;
    unique.push(id);
    if (unique.length >= MAX_TRANSLATIONS) break;
  }
  return unique;
}

export function translationQuery(ids: number[]) {
  const clean = sanitizeTranslationIds(ids);
  return (clean.length ? clean : [DEFAULT_TRANSLATION_ID]).join(",");
}

export function parseTranslationQuery(raw: string | null | undefined) {
  if (!raw?.trim()) return [DEFAULT_TRANSLATION_ID];
  const parsed = sanitizeTranslationIds(raw.split(/[,\s]+/));
  return parsed.length ? parsed : [DEFAULT_TRANSLATION_ID];
}

export function groupLanguages(resources: TranslationResource[]): LanguageGroup[] {
  const map = new Map<string, TranslationResource[]>();
  for (const item of resources) {
    const key = canonicalLanguage(item.languageName || "other").key;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return [...map.entries()]
    .map(([key, editions]) => {
      const preferred = PREFERRED[key];
      const preferredId = preferred && editions.some((item) => item.id === preferred) ? preferred : editions[0].id;
      return {
        key,
        label: canonicalLanguage(editions[0].languageName || key).label,
        editions,
        preferredId,
      };
    })
    .sort((left, right) => {
      if (left.key === "english") return -1;
      if (right.key === "english") return 1;
      return left.label.localeCompare(right.label);
    });
}

export function groupForId(resources: TranslationResource[], id: number) {
  return groupLanguages(resources).find((group) => group.editions.some((item) => item.id === id)) ?? null;
}

export function selectedGroups(resources: TranslationResource[], ids: number[]) {
  return groupLanguages(resources).filter((group) => group.editions.some((item) => ids.includes(item.id)));
}

export function editionForGroup(group: LanguageGroup, ids: number[]) {
  return group.editions.find((item) => ids.includes(item.id)) ?? group.editions.find((item) => item.id === group.preferredId) ?? group.editions[0];
}

export function toggleLanguage(ids: number[], group: LanguageGroup) {
  const on = group.editions.some((item) => ids.includes(item.id));
  if (on) return sanitizeTranslationIds(ids.filter((id) => !group.editions.some((item) => item.id === id)));
  if (ids.length >= MAX_TRANSLATIONS) return ids;
  return sanitizeTranslationIds([...ids, group.preferredId]);
}

export function setLanguageEdition(ids: number[], group: LanguageGroup, editionId: number) {
  const without = ids.filter((id) => !group.editions.some((item) => item.id === id));
  return sanitizeTranslationIds([...without, editionId]);
}

/** How many reading layers are actually on: Arabic, transliteration, and each translation. */
export function readingLayerCount(prefs: {
  showArabic: boolean;
  showTransliteration: boolean;
  showTranslation: boolean;
  translationIds: readonly number[];
}): number {
  const translations = prefs.showTranslation ? sanitizeTranslationIds(prefs.translationIds).length : 0;
  return Number(Boolean(prefs.showArabic)) + Number(Boolean(prefs.showTransliteration)) + translations;
}

export function readingDefaults(): Pick<
  Preferences,
  "showArabic" | "showTranslation" | "showTransliteration" | "showTafsir" | "translationId" | "translationIds"
> {
  return {
    showArabic: true,
    showTranslation: true,
    showTransliteration: false,
    showTafsir: false,
    translationId: DEFAULT_TRANSLATION_ID,
    translationIds: [DEFAULT_TRANSLATION_ID],
  };
}

export function withTranslationIds(ids: number[]): Pick<Preferences, "translationId" | "translationIds" | "showTranslation"> {
  const translationIds = sanitizeTranslationIds(ids);
  return {
    translationIds,
    translationId: translationIds[0] ?? DEFAULT_TRANSLATION_ID,
    showTranslation: translationIds.length > 0,
  };
}
