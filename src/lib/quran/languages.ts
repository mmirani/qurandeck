import { DEFAULT_TRANSLATION_ID } from "./sources";
import type { Preferences, TranslationResource } from "./types";

export const MAX_TRANSLATIONS = 6;

const RTL = new Set([
  "arabic",
  "urdu",
  "persian",
  "farsi",
  "hebrew",
  "pashto",
  "sindhi",
  "uighur",
  "uyghur",
  "kurdish",
  "divehi",
  "dhivehi",
]);

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
  return name
    .trim()
    .replace(/\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export function isRtlLanguage(name: string) {
  return RTL.has(languageKey(name));
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
    const key = languageKey(item.languageName) || "other";
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
        label: languageLabel(editions[0].languageName || key),
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
