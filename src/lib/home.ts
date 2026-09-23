export const HOME_PROMISES = [
  { title: "Free", body: "No paywall, no trial clock, no surprise upgrade. The mushaf stays open." },
  { title: "Private", body: "A signed-in library is stored sealed, not as readable text. We do not sell your reading." },
  { title: "Forever", body: "A personal copy of The Noble Quran that keeps improving with you, in sha Allah." },
] as const;

export const HOME_FEATURES = [
  {
    id: "search",
    title: "Find any ayah",
    body: "Search by word, theme, surah name, or a verse key like 18:10. Jump straight into the page.",
  },
  {
    id: "place",
    title: "Your place stays",
    body: "The ayah under your eye is saved as you read. Come back later and continue from the same line.",
  },
  {
    id: "study",
    title: "Notes and named pens",
    body: "Highlight in your own colours, star ayahs, and keep reflections beside the verse you are reading.",
  },
  {
    id: "tafsir",
    title: "Tafsir under the ayah",
    body: "Explanation stays off until you want it. Turn it on, pick a language, and read it in the mushaf — not a separate tab.",
  },
  {
    id: "progress",
    title: "A map of what you have read",
    body: "Scattered ayahs still count. A torrent-style bar fills wherever you dwelt, played, highlighted, or noted.",
  },
  {
    id: "themes",
    title: "A calm reading room",
    body: "Light, dark, manuscript, and a blush theme. The mushaf expands when you tuck the side rails away.",
  },
] as const;

export const HOME_MORE = [
  { title: "Recitation", body: "Play a word, one ayah, or the whole surah from the title. Reciters and speed stay in settings." },
  { title: "Juz reading", body: "Thirty parts, paced for a month or a slower walk." },
  { title: "Word by word", body: "Hidden until you enable it in settings, then it sits in the study rail." },
  { title: "Languages", body: "Arabic with one or more translations side by side. Reset to Arabic + English anytime." },
  { title: "Guest reading", body: "Open the mushaf with no account. Create one later if you want a named profile." },
] as const;

export const HOME_STARTS = [
  { id: 1, name: "Al-Fatihah", hint: "The Opening" },
  { id: 18, name: "Al-Kahf", hint: "Friday companion" },
  { id: 36, name: "Ya-Sin", hint: "Heart of the Quran" },
  { id: 67, name: "Al-Mulk", hint: "Night reading" },
  { id: 55, name: "Ar-Rahman", hint: "The Beneficent" },
  { id: 112, name: "Al-Ikhlas", hint: "Sincerity" },
] as const;
