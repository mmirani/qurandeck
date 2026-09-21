export const GUIDE_VERSION = 1;
export const HELPER_NAME = "Qalam";

export type TourId = "welcome" | "search" | "languages" | "ayah" | "audio" | "study" | "account";

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
    title: "I’ll walk with you",
    body: "I’m Qalam, your reading helper. A few quiet stops, then you can ask me anytime.",
  },
  {
    id: "search",
    title: "Find an ayah fast",
    body: "Type a word, a theme, or a place like 2:255. Filters sit beside the search box.",
    target: "search",
    lesson: true,
  },
  {
    id: "languages",
    title: "Arabic stays. Add more.",
    body: "Arabic is the mushaf. English is on by default. Add French, Persian, or others beside it — they don’t replace each other. The circular arrow comes back to Arabic and English.",
    target: "languages",
    lesson: true,
  },
  {
    id: "ayah",
    title: "Each ayah can do more",
    body: "Tap an ayah to select it. Play, favorite, highlight, note, and tafsir live on the card. Highlights can be erased.",
    target: "ayah",
    lesson: true,
  },
  {
    id: "audio",
    title: "One ayah, or from here",
    body: "Ayah plays just this verse. From here keeps reciting the rest of the surah.",
    target: "audio",
    lesson: true,
  },
  {
    id: "study",
    title: "The right bar is your desk",
    body: "Notes, tafsir, highlights, and word-by-word live here. The square icon tucks the bar so the mushaf can grow.",
    target: "study",
    lesson: true,
  },
  {
    id: "account",
    title: "Your place stays private",
    body: "Sign in for notes, highlights, favorites, and progress — free, private, forever. Ask me again from this gold pen whenever you want.",
    target: "account",
    lesson: true,
  },
];

export const LESSONS = WELCOME_TOUR.filter((step) => step.lesson);

export function stepById(id: TourId) {
  return WELCOME_TOUR.find((step) => step.id === id) ?? WELCOME_TOUR[0];
}
