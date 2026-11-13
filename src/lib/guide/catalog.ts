import { COMPANION_NAME } from "@/lib/brand";

export const GUIDE_VERSION = 2;
export const HELPER_NAME = COMPANION_NAME;

export type TourId =
  | "welcome"
  | "search"
  | "languages"
  | "ayah"
  | "audio"
  | "size"
  | "study"
  | "account";

export type TourStep = {
  id: TourId;
  title: string;
  body: string;
  target?: string;
  /** Shown when `target` is not on screen, usually the phone control. */
  mobileTarget?: string;
  mobileBody?: string;
  lesson?: boolean;
};

/** Full first-run walkthrough. Mini-lessons reuse the same steps by id. */
export const WELCOME_TOUR: TourStep[] = [
  {
    id: "welcome",
    title: `Hi — I’m ${COMPANION_NAME}`,
    body: "A short walk through the mushaf. Skip anytime. Click me later if you only want one feature.",
  },
  {
    id: "search",
    title: "Find an ayah fast",
    body: "Type a word, a surah name, or a place like 2:255. Search covers the whole Quran. ⌘K also works.",
    target: "search",
    mobileTarget: "search-mobile",
    mobileBody: "Open the menu to find a surah or juz by name or number. On a wider screen, the search box also takes a word or a place like 2:255.",
    lesson: true,
  },
  {
    id: "languages",
    title: "Arabic stays. Add more.",
    body: "Arabic is the mushaf. English is on by default. Add others beside it — they don’t replace each other. The circular arrow comes back to Arabic and English.",
    target: "languages",
    mobileBody:
      "Arabic stays on a phone. English is on by default. On a wider screen, add other languages beside the search box. They don’t replace each other.",
    lesson: true,
  },
  {
    id: "ayah",
    title: "Each ayah can do more",
    body: "Tap an ayah to select it. Play this verse, rest of the surah, note, star, highlight, or erase. Tafsir lives in the header chip, not on every card.",
    target: "ayah",
    mobileTarget: "ayah-mobile",
    mobileBody: "Tap an ayah to select it. The ••• button opens play, note, star, highlight, and tafsir.",
    lesson: true,
  },
  {
    id: "audio",
    title: "One ayah, or the rest",
    body: "Play surah starts at the beginning. On the ayah, Ayah plays just this verse. Rest of Surah keeps reciting from here.",
    target: "audio",
    mobileTarget: "audio-mobile",
    mobileBody: "Tap ••• on an ayah to play that verse, or to keep reciting from here. On a wider screen, Play surah starts at the beginning.",
    lesson: true,
  },
  {
    id: "study",
    title: "The right bar is your desk",
    body: "Notes, highlights, and word-by-word live here. The square icon tucks the bar so the mushaf can grow.",
    target: "study",
    mobileTarget: "study-mobile",
    mobileBody:
      "When the side desk is closed, notes and tafsir open from the ayah. On a phone that is the ••• button. On a wide screen they live in the bar on the right.",
    lesson: true,
  },
  {
    id: "account",
    title: "Your place stays private",
    body: "Sign in for a named profile. Your library syncs with your account and is stored sealed. We do not sell your reading.",
    target: "account",
    mobileBody:
      "Sign in for a named profile. On a phone the account chip is on the home screen. Your library syncs with your account and is stored sealed. We do not sell your reading.",
    lesson: true,
  },
];

export const EXTRA_LESSONS: TourStep[] = [
  {
    id: "size",
    title: "Make the type kinder",
    body: "Size sits in the header. Ask me “bigger” or “smaller” and I’ll move it for you.",
    target: "size",
    mobileTarget: "size-mobile",
    mobileBody: "Open Themes. The + and − there change the type size. Ask me “bigger” or “smaller” and I’ll move it for you.",
    lesson: true,
  },
];

export const LESSONS = [...WELCOME_TOUR.filter((step) => step.lesson), ...EXTRA_LESSONS];

export function stepById(id: TourId) {
  return WELCOME_TOUR.find((step) => step.id === id) ?? EXTRA_LESSONS.find((step) => step.id === id) ?? WELCOME_TOUR[0];
}

export const HELPER_HINTS = [
  "play this surah",
  "go to 2:255",
  "add a note",
  "open tafsir",
  "where is search",
];
