import { asMushafInk } from "./appearance";
import { sanitizeTranslationIds, withTranslationIds } from "./quran/languages";
import { DEFAULT_RECITATION_ID, DEFAULT_TAFSIR_ID, DEFAULT_TRANSLATION_ID } from "./quran/sources";
import { DEFAULT_SWATCH_ID, defaultSwatches } from "./highlights";
import { defaultReadingProgress, type ReadingProgress } from "./reading";
import { mergeStudyCards } from "./study-cards";
import type {
  Bookmark,
  Highlight,
  HighlightSwatch,
  Note,
  Preferences,
  SessionUser,
  UserAccount,
} from "./quran/types";

const KEYS = {
  preferences: "al-mushaf-preferences",
  bookmarks: "al-mushaf-bookmarks",
  notes: "al-mushaf-notes",
  highlights: "al-mushaf-highlights",
  swatches: "al-mushaf-swatches",
  users: "al-mushaf-users",
  session: "al-mushaf-session",
  progress: "al-mushaf-progress",
} as const;

export const defaultPreferences: Preferences = {
  theme: "iris",
  fontSize: 18,
  showArabic: true,
  showTranslation: true,
  showTransliteration: false,
  translationId: DEFAULT_TRANSLATION_ID,
  translationIds: [DEFAULT_TRANSLATION_ID],
  recitationId: DEFAULT_RECITATION_ID,
  tafsirId: DEFAULT_TAFSIR_ID,
  playbackRate: 1,
  autoFollow: true,
  autoPlayOnAyahClick: false,
  activeSwatchId: DEFAULT_SWATCH_ID,
  showHighlights: true,
  showHighlightLabels: false,
  showIntroduction: true,
  showTafsir: false,
  showWordByWord: false,
  studyCards: mergeStudyCards(undefined),
  focusMode: false,
  traditionalPage: false,
  mushafInk: "green",
  showNavRail: true,
  showStudyRail: true,
  mobileReadingMode: "scroll",
  mobileAyahScript: "both",
};

function parse(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadPreferences(): Preferences {
  const value = parse(KEYS.preferences);
  if (!value || typeof value !== "object") return defaultPreferences;
  const raw = value as Partial<Preferences> & { translationIds?: unknown; studyCards?: { words?: boolean } };
  const merged = { ...defaultPreferences, ...raw };
  merged.showWordByWord =
    typeof raw.showWordByWord === "boolean" ? raw.showWordByWord : Boolean(raw.studyCards?.words);
  merged.studyCards = mergeStudyCards(raw.studyCards);
  merged.traditionalPage = Boolean(raw.traditionalPage);
  merged.mushafInk = asMushafInk(raw.mushafInk);
  merged.mobileReadingMode = raw.mobileReadingMode === "ayah" ? "ayah" : "scroll";
  merged.mobileAyahScript =
    raw.mobileAyahScript === "arabic" || raw.mobileAyahScript === "english" ? raw.mobileAyahScript : "both";
  const ids = Array.isArray(raw.translationIds)
    ? sanitizeTranslationIds(raw.translationIds)
    : sanitizeTranslationIds([merged.translationId]);
  if (Array.isArray(raw.translationIds)) {
    return { ...merged, ...withTranslationIds(ids) };
  }
  return { ...merged, ...withTranslationIds(ids.length ? ids : [DEFAULT_TRANSLATION_ID]) };
}

export function savePreferences(value: Preferences) {
  write(KEYS.preferences, value);
}

export function loadBookmarks(): Bookmark[] {
  const value = parse(KEYS.bookmarks);
  return Array.isArray(value) ? (value as Bookmark[]) : [];
}

export function saveBookmarks(value: Bookmark[]) {
  write(KEYS.bookmarks, value);
}

export function loadNotes(): Note[] {
  const value = parse(KEYS.notes);
  return Array.isArray(value) ? (value as Note[]) : [];
}

export function saveNotes(value: Note[]) {
  write(KEYS.notes, value);
}

export function loadHighlights(): Highlight[] {
  const value = parse(KEYS.highlights);
  return Array.isArray(value) ? (value as Highlight[]) : [];
}

export function saveHighlights(value: Highlight[]) {
  write(KEYS.highlights, value);
}

export function loadSwatches(): HighlightSwatch[] {
  const value = parse(KEYS.swatches);
  if (!Array.isArray(value) || value.length === 0) return defaultSwatches;
  return value as HighlightSwatch[];
}

export function saveSwatches(value: HighlightSwatch[]) {
  write(KEYS.swatches, value);
}

export function loadUsers(): UserAccount[] {
  const value = parse(KEYS.users);
  return Array.isArray(value) ? (value as UserAccount[]) : [];
}

export function saveUsers(value: UserAccount[]) {
  write(KEYS.users, value);
}

export function loadSession(): SessionUser | null {
  const value = parse(KEYS.session);
  if (!value || typeof value !== "object") return null;
  return value as SessionUser;
}

export function loadProgress(): ReadingProgress {
  const value = parse(KEYS.progress);
  if (!value || typeof value !== "object") return defaultReadingProgress;
  const raw = value as Partial<ReadingProgress>;
  return {
    ...defaultReadingProgress,
    ...raw,
    surahsRead: Array.isArray(raw.surahsRead) ? raw.surahsRead.filter((id) => Number.isInteger(id)) : [],
    versesRead: Array.isArray(raw.versesRead) ? raw.versesRead.filter((key) => typeof key === "string") : [],
    lastVerseKey: typeof raw.lastVerseKey === "string" ? raw.lastVerseKey : null,
    lastActiveAt: typeof raw.lastActiveAt === "number" ? raw.lastActiveAt : null,
  };
}

export function saveProgress(value: ReadingProgress) {
  write(KEYS.progress, value);
}

export function saveSession(value: SessionUser | null) {
  if (!value) {
    window.localStorage.removeItem(KEYS.session);
    return;
  }
  write(KEYS.session, value);
}

export async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
