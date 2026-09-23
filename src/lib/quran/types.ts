import type { StudyCards } from "@/lib/study-cards";

export type RevelationPlace = "makkah" | "madinah";

export type Chapter = {
  id: number;
  nameSimple: string;
  nameArabic: string;
  translatedName: string;
  versesCount: number;
  revelationPlace: RevelationPlace;
  revelationOrder: number;
  bismillahPre: boolean;
  pages: number[];
};

export type Word = {
  id: number;
  position: number;
  location: string;
  charType: "word" | "end" | string;
  textUthmani: string;
  translation: string;
  transliteration: string;
  audioUrl: string | null;
};

export type VerseTranslation = {
  id: number;
  text: string;
};

export type Verse = {
  id: number;
  chapterId: number;
  verseNumber: number;
  verseKey: string;
  juzNumber: number;
  hizbNumber: number;
  pageNumber: number;
  textUthmani: string;
  translation: string;
  translationName?: string;
  translations: VerseTranslation[];
  transliteration: string;
  words: Word[];
  audioUrl: string | null;
};

export type TranslationResource = {
  id: number;
  name: string;
  authorName: string;
  languageName: string;
  slug: string;
};

export type TafsirResource = {
  id: number;
  name: string;
  authorName: string;
  languageName: string;
  slug: string;
};

export type TafsirPassage = {
  id: number;
  name: string;
  verseKey: string;
  verseKeys: string[];
  text: string;
};

export type RecitationResource = {
  id: number;
  reciterName: string;
  style: string | null;
};

export type Juz = {
  juzNumber: number;
  versesCount: number;
  verseMapping: Record<string, string>;
  firstVerseId: number;
  lastVerseId: number;
};

export type SearchHit = {
  verseKey: string;
  chapterId: number;
  verseNumber: number;
  textArabic: string;
  textTranslation: string;
  source: "quran.com" | "alquran.cloud" | "theme" | "jump";
};

export type HighlightLayer = "arabic" | "translation" | "transliteration" | "ayah";

export type HighlightSwatch = {
  id: string;
  name: string;
  color: string;
};

export type Highlight = {
  id: string;
  verseKey: string;
  layer: HighlightLayer;
  swatchId: string;
  text: string;
  startWord?: number;
  endWord?: number;
  startOffset?: number;
  endOffset?: number;
  label?: string;
  createdAt: string;
};

export type Bookmark = {
  id: string;
  type: "verse" | "word" | "section";
  verseKey: string;
  endVerseKey?: string;
  wordLocation?: string;
  wordText?: string;
  label: string;
  createdAt: string;
};

export type Note = {
  id: string;
  verseKey: string;
  body: string;
  updatedAt: string;
};

export type UserAccount = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  email?: string;
  provider?: "local" | "google";
  createdAt: string;
};

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  provider?: "local" | "google";
};

export type MushafInkId = "gold" | "green" | "crimson" | "navy" | "teal";

export type AppearanceThemeId =
  | "iris"
  | "pastels"
  | "manuscript"
  | "emerald"
  | "ottoman"
  | "ivory"
  | "sepia"
  | "contrast"
  | "aurora"
  | "obsidian"
  | "midnight"
  | "slate"
  | "forest"
  | "amethyst"
  | "rose"
  | "cyan"
  | "blush";

export type ReaderMode = "surah" | "juz";

export type ModalName =
  | "filters"
  | "themes"
  | "juz"
  | "settings"
  | "auth"
  | "account"
  | "bookmarks"
  | "notes"
  | "highlights"
  | null;

export type SearchFilters = {
  themes: string[];
  revelation: RevelationPlace | "all";
  juz: number | "all";
  queryIn: "all" | "arabic" | "translation";
};

export type Preferences = {
  theme: AppearanceThemeId;
  fontSize: number;
  showArabic: boolean;
  showTranslation: boolean;
  showTransliteration: boolean;
  translationId: number;
  translationIds: number[];
  recitationId: number;
  tafsirId: number;
  playbackRate: number;
  autoFollow: boolean;
  autoPlayOnAyahClick: boolean;
  activeSwatchId: string;
  showHighlights: boolean;
  showHighlightLabels: boolean;
  showIntroduction: boolean;
  showTafsir: boolean;
  showWordByWord: boolean;
  studyCards: StudyCards;
  focusMode: boolean;
  traditionalPage: boolean;
  mushafInk: MushafInkId;
  showNavRail: boolean;
  showStudyRail: boolean;
  /** Mobile: continuous scroll vs one ayah per screen */
  mobileReadingMode: "scroll" | "ayah";
};
