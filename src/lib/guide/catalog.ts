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
    body: "Type a word, a theme, a surah name, or a place like 2:255. Filters sit beside the box. ⌘K also works.",
    target: "search",
    lesson: true,
  },
  {
    id: "languages",
    title: "Arabic stays. Add more.",
    body: "Arabic is the mushaf. English is on by default. Add others beside it — they don’t replace each other. The circular arrow comes back to Arabic and English.",
    target: "languages",
    lesson: true,
  },
  {
    id: "ayah",
    title: "Each ayah can do more",
    body: "Tap an ayah to select it. Play this verse, rest of the surah, note, star, highlight, or erase. Tafsir lives in the header chip, not on every card.",
    target: "ayah",
    lesson: true,
  },
  {
    id: "audio",
    title: "One ayah, or the rest",
    body: "Play surah starts at the beginning. On the ayah, Ayah plays just this verse. Rest of Surah keeps reciting from here.",
    target: "audio",
    lesson: true,
  },
  {
    id: "study",
    title: "The right bar is your desk",
    body: "Notes, highlights, and word-by-word live here. The square icon tucks the bar so the mushaf can grow.",
    target: "study",
    lesson: true,
  },
  {
    id: "account",
    title: "Your place stays private",
    body: "Sign in for a named profile. Your library syncs with your account and is stored sealed. We do not sell your reading.",
    target: "account",
    lesson: true,
  },
];

export const EXTRA_LESSONS: TourStep[] = [
  {
    id: "size",
    title: "Make the type kinder",
    body: "Size sits in the header. Ask me “bigger” or “smaller” and I’ll move it for you.",
    target: "size",
    lesson: true,
  },
];

export const LESSONS = [...WELCOME_TOUR.filter((step) => step.lesson), ...EXTRA_LESSONS];

export function stepById(id: TourId) {
  return WELCOME_TOUR.find((step) => step.id === id) ?? EXTRA_LESSONS.find((step) => step.id === id) ?? WELCOME_TOUR[0];
}

export const HELPER_HINTS = [
  "walk me through",
  "play this surah",
  "bigger text",
  "highlight this ayah",
  "open my desk",
];
