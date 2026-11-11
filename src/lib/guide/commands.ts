import type { AppearanceThemeId } from "@/lib/quran/types";
import { COMPANION_NAME } from "@/lib/brand";
import type { TourId } from "./catalog";
import { SURAH_NAMES, surahById, surahAliasTokens, surahVerseCount, type SurahName } from "./surahs";

/**
 * Sana only helps someone use QuranDeck.
 * She never answers with a ruling, tafsir, or a meaning of the Quran.
 * Questions like that become a refusal plus an offer to open the tafsir.
 */

export type HelperAction =
  | "tour"
  | "lesson"
  | "guide"
  | "go-verse"
  | "go-surah"
  | "go-juz"
  | "next"
  | "previous"
  | "reading-mode"
  | "play-surah"
  | "play-ayah"
  | "play-word"
  | "play-from"
  | "pause"
  | "resume"
  | "reciter"
  | "note"
  | "find-notes"
  | "bookmark"
  | "bookmarks"
  | "highlight"
  | "clear-highlight"
  | "highlights"
  | "search"
  | "translation"
  | "tafsir"
  | "bigger"
  | "smaller"
  | "font-size"
  | "theme"
  | "account"
  | "progress"
  | "export"
  | "sign-in"
  | "study"
  | "focus"
  | "rest"
  | "refuse"
  | "none";

export type ReadingTarget = "ayah" | "surah" | "juz";

export type TranslationChange = "add" | "hide" | "arabic-only" | "reset" | "transliteration" | "show";

export type HelperMatch = {
  action: HelperAction;
  reply: string;
  suggestions: string[];
  lesson?: TourId;
  verseKey?: string;
  chapterId?: number;
  verseNumber?: number;
  juz?: number;
  query?: string;
  noteBody?: string;
  theme?: AppearanceThemeId;
  openThemePicker?: boolean;
  language?: string;
  translationChange?: TranslationChange;
  reciter?: string;
  readingMode?: "scroll" | "ayah";
  target?: ReadingTarget;
  exportKind?: "stats" | "library";
  fontSize?: number;
  locate?: boolean;
  wordByWord?: boolean;
  /** Named place or reference that should autoplay after navigation. */
  autoplay?: "verse" | "from" | "surah";
};

const SUGGESTIONS = [
  "Play this surah",
  "Go to 2:255",
  "Add a note",
  "Bookmark this ayah",
  "Open tafsir",
  "Where is search",
  "Bigger text",
  "Dark theme",
];

export const SUPPORTED_COMMANDS = [
  "Go to 2:255, Ya-Sin, or Juz 30",
  "Next ayah, previous ayah, next surah, previous surah, next juz",
  "Scroll mode, ayah mode",
  "Play this surah, play this ayah, play this word, rest of the surah, pause, resume",
  "Change reciter to Mishari",
  "Add a note, find my notes",
  "Bookmark this ayah, show bookmarks",
  "Highlight this ayah, clear highlight, show highlights",
  "Search for mercy, where is search",
  "Add Urdu, Arabic only, reset translation",
  "Open tafsir, hide tafsir",
  "Bigger, smaller, text size 24",
  "Dark theme, light theme, high contrast",
  "Sign in, my account, my progress, export my library",
  "Focus mode, open my desk, walk me through",
];

const KEYWORDS = [
  "play",
  "pause",
  "resume",
  "bookmark",
  "favorite",
  "highlight",
  "search",
  "tafsir",
  "translation",
  "transliteration",
  "theme",
  "bigger",
  "smaller",
  "larger",
  "note",
  "notes",
  "signin",
  "account",
  "export",
  "progress",
  "scroll",
  "reciter",
  "surah",
  "ayah",
  "verse",
  "chapter",
  "juz",
  "focus",
  "tour",
  "next",
  "previous",
  "bookmark",
  "audio",
  "quran",
  "study",
  "desk",
  ...surahAliasTokens(),
];

const TYPOS: Record<string, string> = {
  soorah: "surah",
  soora: "surah",
  sura: "surah",
  surat: "surah",
  aya: "ayah",
  aayah: "ayah",
  aayat: "ayah",
  ayat: "ayah",
  juzz: "juz",
  juza: "juz",
  para: "juz",
  favourite: "favorite",
  favorit: "favorite",
  bookmakr: "bookmark",
  bookmar: "bookmark",
  highlite: "highlight",
  hilight: "highlight",
  higlight: "highlight",
  serch: "search",
  saerch: "search",
  seach: "search",
  recitor: "reciter",
  recieter: "reciter",
  qari: "reciter",
  qaari: "reciter",
  tafseer: "tafsir",
  tafser: "tafsir",
  tafsir: "tafsir",
  paus: "pause",
  resumee: "resume",
  signin: "signin",
  login: "signin",
  log: "signin",
  teh: "the",
  biggar: "bigger",
  larg: "larger",
  smaler: "smaller",
  them: "theme",
  thme: "theme",
  nots: "notes",
  playy: "play",
  plaay: "play",
};

const KEEP = new Set([
  "meaning",
  "explain",
  "haram",
  "halal",
  "fatwa",
  "fiqh",
  "interpret",
  "interpretation",
  "why",
  "allah",
  "god",
  "scholar",
  "ruling",
  "sin",
  "wisdom",
  "what",
  "does",
  "this",
  "that",
  "how",
  "where",
  "when",
  "open",
  "show",
  "hide",
  "with",
  "from",
  "your",
  "about",
  "please",
  "could",
  "would",
  "want",
  "make",
  "text",
  "size",
  "font",
  "dark",
  "light",
  "night",
  "mode",
  "word",
  "rest",
  "stop",
  "start",
  "continue",
  "change",
  "switch",
  "download",
  "library",
  "stats",
  "sign",
  "account",
  "progress",
  "focus",
  "study",
  "desk",
  "tour",
  "walk",
  "guide",
  "audio",
  "listen",
  "recite",
  "reading",
  "scroll",
  "ayah",
  "verse",
  "surah",
  "chapter",
  "juz",
  "note",
  "notes",
  "tafsir",
  "search",
  "theme",
  "play",
  "pause",
  "resume",
  "next",
  "previous",
  "back",
  "bookmark",
  "favorite",
  "highlight",
  "clear",
  "erase",
  "export",
  "backup",
  "translation",
  "english",
  "arabic",
  "urdu",
  "only",
  "add",
  "remove",
  "my",
  "me",
  "the",
  "and",
  "for",
  "to",
  "of",
  "in",
  "on",
  "a",
  "an",
  "is",
  "it",
  "do",
  "i",
  "you",
  "can",
]);

const THEME_ALIASES: { id: AppearanceThemeId; names: string[] }[] = [
  { id: "iris", names: ["noor", "iris", "lavender"] },
  { id: "pastels", names: ["pastels", "pastel"] },
  { id: "manuscript", names: ["lumen", "manuscript"] },
  { id: "emerald", names: ["mint", "emerald"] },
  { id: "ivory", names: ["sky", "ivory"] },
  { id: "blush", names: ["blush"] },
  { id: "ottoman", names: ["ember", "ottoman"] },
  { id: "sepia", names: ["sand", "sepia"] },
  { id: "contrast", names: ["high contrast", "contrast"] },
  { id: "aurora", names: ["aurora"] },
  { id: "obsidian", names: ["obsidian", "oled"] },
  { id: "midnight", names: ["midnight"] },
  { id: "slate", names: ["slate"] },
  { id: "forest", names: ["forest"] },
  { id: "amethyst", names: ["amethyst"] },
  { id: "rose", names: ["rose night", "rose"] },
  { id: "cyan", names: ["cyan"] },
];

const LANGUAGES = [
  "english",
  "arabic",
  "urdu",
  "french",
  "spanish",
  "turkish",
  "indonesian",
  "malay",
  "bengali",
  "hindi",
  "persian",
  "farsi",
  "german",
  "russian",
  "chinese",
  "bosnian",
  "albanian",
  "somali",
  "swahili",
  "portuguese",
  "italian",
  "dutch",
  "japanese",
  "korean",
  "tamil",
  "hausa",
  "pashto",
  "sindhi",
  "kurdish",
];

const PLACES: { test: RegExp; chapterId: number; verse: number }[] = [
  { test: /\b(?:ayat|ayah)(?:ul| al)? kursi\b|\bverse of the throne\b/, chapterId: 2, verse: 255 },
];

function editDistance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      cur[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

export function normalizeCommand(raw: string) {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’`]/g, "'")
    .replace(/[^a-z0-9:+./'\s-]/g, " ")
    .replace(/(?<=\d)\/(?=\d)/g, ":")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function correctToken(token: string) {
  if (!token || /\d/.test(token)) return token;
  if (TYPOS[token]) return TYPOS[token];
  if (KEEP.has(token) || token.length < 4) return token;
  const max = token.length >= 8 ? 2 : 1;
  let best = token;
  let bestDist = max + 1;
  let ties = 0;
  for (const word of KEYWORDS) {
    if (Math.abs(word.length - token.length) > max) continue;
    const dist = editDistance(token, word, max);
    if (dist === 0) return token;
    if (dist < bestDist && dist <= max) {
      best = word;
      bestDist = dist;
      ties = 1;
    } else if (dist === bestDist && word !== best) {
      ties += 1;
    }
  }
  return ties === 1 ? best : token;
}

export function correctCommand(raw: string) {
  return normalizeCommand(raw)
    .split(" ")
    .map((token) => correctToken(token))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function base(partial: Partial<HelperMatch> & Pick<HelperMatch, "action" | "reply">): HelperMatch {
  return { suggestions: partial.suggestions ?? SUGGESTIONS.slice(0, 4), ...partial };
}

function verseKey(chapterId: number, verse: number) {
  return `${chapterId}:${verse}`;
}

function invalidVerse(surah: SurahName, verse: number): HelperMatch {
  const count = surahVerseCount(surah.id);
  return base({
    action: "none",
    reply: `${surah.name} has ${count} ayahs, so ${verse} is outside it. Try ${surah.id}:1.`,
    suggestions: [`Go to ${surah.id}:1`, "Play this surah", "Where is search"],
  });
}

function findSurah(text: string): SurahName | null {
  const numbered = text.match(/\b(?:surah|chapter)\s+(\d{1,3})\b/);
  if (numbered) {
    const id = Number(numbered[1]);
    const named = surahById(id);
    if (named) return named;
  }
  const padded = ` ${text} `;
  let best: { surah: SurahName; length: number } | null = null;
  for (const surah of SURAH_NAMES) {
    for (const alias of surah.aliases) {
      if (alias.length <= 3) {
        const stripped = text
          .replace(/\b(please|play|open|go|to|show|read|start|recite|surah|chapter|the|me|this)\b/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const explicit = new RegExp(`\\b(?:surah|chapter)\\s+${alias}\\b`).test(text);
        if (stripped !== alias && !explicit) continue;
      }
      if (!padded.includes(` ${alias} `)) continue;
      if (!best || alias.length > best.length) best = { surah, length: alias.length };
    }
  }
  return best?.surah ?? null;
}

function findExplicitVerse(text: string): { chapterId: number; verse: number } | null {
  for (const place of PLACES) {
    if (place.test.test(text)) return { chapterId: place.chapterId, verse: place.verse };
  }
  const keyed = text.match(/\b(\d{1,3})\s*[:.]\s*(\d{1,3})\b/) ?? text.match(/\b(\d{1,3})\s+(\d{1,3})\b/);
  if (keyed) return { chapterId: Number(keyed[1]), verse: Number(keyed[2]) };
  const pair = text.match(/\b(?:surah|chapter)\s+(\d{1,3})\s+(?:ayah|verse)\s+(\d{1,3})\b/);
  if (pair) return { chapterId: Number(pair[1]), verse: Number(pair[2]) };
  return null;
}

function verseOnSurah(text: string, surah: SurahName): number | null {
  const labeled = text.match(/\b(?:ayah|verse)\s+(\d{1,3})\b/);
  if (labeled) return Number(labeled[1]);
  const nums = [...text.matchAll(/\b(\d{1,3})\b/g)].map((match) => Number(match[1]));
  const others = nums.filter((value) => value !== surah.id);
  if (others.length === 1 && !/\bjuz\b/.test(text)) return others[0];
  return null;
}

function findJuz(text: string) {
  const match = text.match(/\bjuz\s+(\d{1,2})\b/);
  if (!match) return null;
  const juz = Number(match[1]);
  return juz >= 1 && juz <= 30 ? juz : null;
}

function findTheme(text: string): { theme?: AppearanceThemeId; open?: boolean } | null {
  if (/\b(dark|night)\s*(mode|theme)?\b/.test(text) && /\b(theme|mode|dark|night)\b/.test(text) && !/\bsurah\b/.test(text)) {
    if (/\b(dark mode|night mode|dark theme|night theme|^dark$|^night$|switch to dark|switch to night|make it dark|make it night)\b/.test(text)) {
      return { theme: "obsidian" };
    }
  }
  if (/\b(light|day)\s*(mode|theme)\b|\b(light mode|day mode|light theme|day theme)\b/.test(text)) return { theme: "iris" };
  if (/\bhigh contrast\b/.test(text)) return { theme: "contrast" };
  for (const theme of THEME_ALIASES) {
    for (const name of theme.names) {
      if (new RegExp(`\\b${name}\\b`).test(text)) return { theme: theme.id };
    }
  }
  if (/\bthemes?\b/.test(text)) return { open: true };
  return null;
}

function findLanguage(text: string) {
  return LANGUAGES.find((language) => new RegExp(`\\b${language}\\b`).test(text)) ?? null;
}

function isHowTo(text: string) {
  return /\b(how do i|how to|how can i|where (is|are|do)|what is|whats|explain how|show me how|help me (find|use|open))\b/.test(text);
}

function asksRuling(text: string) {
  if (/\b(fatwa|fiqh|shariah|sharia|hukm|ruling|religious ruling|islamic ruling)\b/.test(text)) return true;
  if (/\b(halal|haraam|haram)\b/.test(text)) return true;
  if (/\b(is it (a )?sin|is this (a )?sin|permissible|forbidden)\b/.test(text)) return true;
  if (/\b(why did allah|why does allah|what does allah|wisdom behind|abrogat)\b/.test(text)) return true;
  return false;
}

function appSubject(fragment: string) {
  return /\b(search|bookmark|favou?rite|highlight|note|theme|font|size|sign ?in|account|button|icon|tour|focus|scroll|export|progress|reciter|audio|player|menu|settings|app|qurandeck|sana|translation|language|desk)\b/.test(
    fragment,
  );
}

function asksMeaning(text: string) {
  const meaning = text.match(/\b(?:what does|whats the meaning of|what is the meaning of|meaning of|interpret|interpretation of)\b(.*)$/);
  if (meaning) {
    const subject = meaning[1] ?? "";
    if (appSubject(subject) && !/\b(ayah|verse|quran|surah|allah)\b/.test(subject)) return false;
    return true;
  }
  if (/\bexplain\b/.test(text)) {
    if (/\b(how|search|bookmark|note|theme|app|button|use|using)\b/.test(text) && !/\b(ayah|verse|quran|this verse|this ayah)\b/.test(text)) {
      return false;
    }
    if (/\b(ayah|verse|quran|this|that|surah)\b/.test(text)) return true;
  }
  if (/^(please )?(explain|interpret)( this| that)?$/.test(text)) return true;
  if (/^(what does this mean|whats this mean|what is the meaning)$/.test(text)) return true;
  return false;
}

function refusal(text: string, chapterId?: number, verse?: number): HelperMatch {
  const key = chapterId && verse ? verseKey(chapterId, verse) : undefined;
  const where = key ? ` for ${key}` : " for this ayah";
  return base({
    action: "refuse",
    reply: `I can't answer that. I only help with using QuranDeck — I don't give rulings, interpretations, or meanings. I can open the tafsir${where}, and a qualified scholar is the right person to ask.`,
    verseKey: key,
    chapterId,
    verseNumber: verse,
    suggestions: [key ? `Open tafsir for ${key}` : "Open tafsir", "Where is search"],
  });
}

function suggestionsFor(text: string) {
  const picks: string[] = [];
  const add = (value: string) => {
    if (!picks.includes(value)) picks.push(value);
  };
  if (/\b(play|audio|recit)/.test(text)) add("Play this surah");
  if (/\b(note)/.test(text)) add("Add a note");
  if (/\b(bookmark|favorite|star)/.test(text)) add("Bookmark this ayah");
  if (/\b(search|find)/.test(text)) add("Where is search");
  if (/\b(theme|dark|light)/.test(text)) add("Dark theme");
  if (/\b(size|bigger|font)/.test(text)) add("Bigger text");
  if (/\b(tafsir)/.test(text)) add("Open tafsir");
  for (const item of SUGGESTIONS) add(item);
  return picks.slice(0, 4);
}

function goVerse(chapterId: number, verse: number, autoplay?: HelperMatch["autoplay"]): HelperMatch {
  const surah = surahById(chapterId);
  if (!surah || chapterId < 1 || chapterId > 114) {
    return base({
      action: "none",
      reply: "I couldn't find that place. Try a verse like 2:255, a surah name, or a juz from 1 to 30.",
      suggestions: ["Go to 2:255", "Go to Ya-Sin", "Juz 30"],
    });
  }
  if (verse < 1 || verse > surahVerseCount(chapterId)) return invalidVerse(surah, verse);
  const key = verseKey(chapterId, verse);
  return base({
    action: "go-verse",
    reply: autoplay ? `Opening ${key} and playing it.` : `Opening ${surah.name} ${key}.`,
    verseKey: key,
    chapterId,
    verseNumber: verse,
    autoplay,
    suggestions: ["Play this ayah", "Open tafsir", "Bookmark this ayah", "Add a note"],
  });
}

export function matchReciter(query: string, reciters: { id: number; reciterName: string }[]) {
  const q = query.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!q) return null;
  const compact = q.replace(/\s/g, "");
  const scored = reciters
    .map((item) => {
      const name = item.reciterName.toLowerCase();
      const flat = name.replace(/[^a-z0-9]/g, "");
      const tokens = name.split(/[^a-z0-9]+/).filter((token) => token.length >= 3);
      let score = 0;
      if (flat.includes(compact) || compact.includes(flat)) score += 5;
      for (const token of tokens) {
        if (compact.includes(token) || token.includes(compact)) score += 3;
        else if (compact.length >= 4 && editDistance(compact, token, 1) <= 1) score += 2;
      }
      return { item, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0) return null;
  if (scored.length > 1 && scored[0].score === scored[1].score) return null;
  return scored[0].item;
}

export function matchHelper(raw: string): HelperMatch {
  const light = normalizeCommand(raw);
  const text = light
    .split(" ")
    .map((token) => correctToken(token))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) {
    return base({
      action: "none",
      reply: `Try a chip, or ask in plain words. I can play, navigate, and open tools — I don't explain the Quran. I'm ${COMPANION_NAME}.`,
    });
  }

  const explicit = findExplicitVerse(light) ?? findExplicitVerse(text);
  const surah = explicit ? surahById(explicit.chapterId) : findSurah(text);
  const verseNumber = explicit?.verse ?? (surah ? verseOnSurah(text, surah) : null);
  const chapterId = explicit?.chapterId ?? surah?.id;
  const juz = findJuz(text);

  if ((asksRuling(text) || asksMeaning(text)) && !/\bopen tafsir\b|\bshow tafsir\b|\bhide tafsir\b/.test(text)) {
    return refusal(text, chapterId, verseNumber ?? undefined);
  }

  if (/\bwhat does\b/.test(text) && appSubject(text) && !/\b(ayah|verse|quran|surah)\b/.test(text)) {
    return base({
      action: "guide",
      reply: "That's a control in the mushaf. I can open it — I don't explain the Quran.",
      suggestions: suggestionsFor(text),
    });
  }

  if (/^(hide|rest|go away|dismiss|leave me|be quiet)$/.test(text) || /\b(go away|leave me alone)\b/.test(text)) {
    return base({
      action: "rest",
      reply: "I'll wait in the corner until you call me.",
      suggestions: ["Walk me through"],
    });
  }

  if (/\b(walk me|show me around|onboard|how do i use|start (the )?tour|guided tour)\b/.test(text) || /^(tour|guide)$/.test(text)) {
    return base({
      action: "tour",
      reply: "Let's walk through the mushaf together. Skip anytime.",
      suggestions: ["Play this surah", "Where is search"],
    });
  }

  const how = isHowTo(text);

  if (/\b(pause|stop (playing|audio|recitation|the (surah|ayah)))\b/.test(text) || text === "stop") {
    return base({ action: "pause", reply: "Paused.", suggestions: ["Resume", "Play this ayah"] });
  }

  if (/\b(resume|unpause|keep playing|play again|continue (playing|listening|reciting))\b/.test(text) || text === "play") {
    return base({ action: "resume", reply: "Playing.", suggestions: ["Pause", "Rest of the surah"] });
  }

  if (/\b(play|hear|recite)\b/.test(text) && /\bword\b/.test(text)) {
    return base({
      action: "play-word",
      reply: "Playing this word.",
      suggestions: ["Pause", "Play this ayah"],
    });
  }

  if (/\b(rest of (the )?(surah|juz|chapter)|from here|play (the )?rest)\b/.test(text)) {
    return goOrCurrent("play-from", "Playing from this ayah through the rest.", chapterId, verseNumber, "from");
  }

  if (/\b(reciter|qari)\b/.test(text) || /\b(change|switch|set) (the )?(voice|reciter|qari)\b/.test(text)) {
    const reciter = text
      .replace(/\b(change|switch|set|the|reciter|qari|voice|to|please|my|a)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return base({
      action: "reciter",
      reply: reciter ? `Switching the reciter to ${reciter}.` : "Opening reciters.",
      reciter: reciter || undefined,
      suggestions: ["Play this surah", "Pause"],
    });
  }

  if (/\b(play|recite|listen|start)\b/.test(text) && (verseNumber || /\b(ayah|verse)\b/.test(text)) && !/\bsurah\b/.test(text.replace(/\b(this surah|the surah)\b/g, ""))) {
    if (chapterId && verseNumber) return goVerse(chapterId, verseNumber, "verse");
    return base({
      action: "play-ayah",
      reply: "Playing this ayah.",
      suggestions: ["Pause", "Rest of the surah", "Open tafsir"],
    });
  }

  if (
    /\b(play|recite|listen|start)\b/.test(text) &&
    (/\b(surah|chapter|juz|recitation|audio)\b/.test(text) || chapterId || juz || /^(listen|recite)$/.test(text))
  ) {
    if (juz && !chapterId) {
      return base({
        action: "go-juz",
        reply: `Opening Juz ${juz} and playing from the start.`,
        juz,
        autoplay: "surah",
        suggestions: ["Pause", "Next juz"],
      });
    }
    if (chapterId && !verseNumber) {
      const name = surahById(chapterId)?.name ?? `Surah ${chapterId}`;
      return base({
        action: "play-surah",
        reply: `Playing ${name} from the start.`,
        chapterId,
        autoplay: "surah",
        suggestions: ["Pause", "Open tafsir"],
      });
    }
    if (chapterId && verseNumber) return goVerse(chapterId, verseNumber, "from");
    return base({
      action: "play-surah",
      reply: "Playing this surah from the start.",
      suggestions: ["Pause", "Bigger text"],
    });
  }

  if (/\b(text size|font size|font|size)\s+(\d{2})\b/.test(text) || /\b(set )?(size|font) to (\d{2})\b/.test(text)) {
    const size = Number(text.match(/\b(\d{2})\b/)?.[1]);
    return base({
      action: "font-size",
      reply: `Setting the reading size to ${size}.`,
      fontSize: size,
      suggestions: ["Bigger text", "Smaller text"],
    });
  }

  if (/\b(bigger|larger|increase|zoom in)\b/.test(text)) {
    return base({ action: "bigger", reply: "A little larger.", suggestions: ["Smaller text", "Open tafsir"] });
  }
  if (/\b(smaller|decrease|zoom out)\b/.test(text)) {
    return base({ action: "smaller", reply: "A little smaller.", suggestions: ["Bigger text"] });
  }

  const theme = findTheme(text);
  if (theme && (theme.theme || /\b(theme|themes|mode)\b/.test(text))) {
    return base({
      action: "theme",
      reply: theme.theme ? "Switching the theme." : "Opening themes.",
      theme: theme.theme,
      openThemePicker: theme.open,
      suggestions: ["Bigger text", "Focus mode"],
    });
  }

  if (/\b(ayah by ayah|ayah mode|one ayah|verse mode)\b/.test(text)) {
    return base({
      action: "reading-mode",
      reply: "Switching to one ayah at a time on the phone layout.",
      readingMode: "ayah",
      suggestions: ["Scroll mode", "Next ayah"],
    });
  }
  if (/\b(scroll mode|continuous|scrolling view)\b/.test(text)) {
    return base({
      action: "reading-mode",
      reply: "Switching back to continuous scroll.",
      readingMode: "scroll",
      suggestions: ["Ayah mode", "Play this surah"],
    });
  }

  if (/\b(next|forward)\b/.test(text) && !/\bprevious\b/.test(text)) {
    const target: ReadingTarget = /\bjuz\b/.test(text) ? "juz" : /\b(surah|chapter)\b/.test(text) ? "surah" : "ayah";
    return base({
      action: "next",
      reply: target === "ayah" ? "Next ayah." : target === "surah" ? "Next surah." : "Next juz.",
      target,
      suggestions: ["Previous ayah", "Play this ayah"],
    });
  }
  if (/^(previous|prev|go back)$/.test(text) || (/\b(previous|prev)\b/.test(text) && /\b(ayah|verse|surah|chapter|juz)\b/.test(text))) {
    const target: ReadingTarget = /\bjuz\b/.test(text) ? "juz" : /\b(surah|chapter)\b/.test(text) ? "surah" : "ayah";
    return base({
      action: "previous",
      reply: target === "ayah" ? "Previous ayah." : target === "surah" ? "Previous surah." : "Previous juz.",
      target,
      suggestions: ["Next ayah", "Play this ayah"],
    });
  }

  if (/\b(clear|erase|remove|delete)\b/.test(text) && /\bhighlight/.test(text)) {
    return base({
      action: "clear-highlight",
      reply: "Clearing the highlight on this ayah.",
      verseKey: chapterId && verseNumber ? verseKey(chapterId, verseNumber) : undefined,
      chapterId,
      verseNumber: verseNumber ?? undefined,
      suggestions: ["Highlight this ayah", "Show highlights"],
    });
  }

  if (/\b(show|open|find|my|see)\b/.test(text) && /\bhighlights?\b/.test(text) && !/\b(this|current)\b/.test(text)) {
    return base({ action: "highlights", reply: "Opening your highlights.", suggestions: ["Highlight this ayah"] });
  }

  if (/\b(highlight|highlighter|pen|mark this)\b/.test(text) && !how) {
    return base({
      action: "highlight",
      reply: "Highlighting this ayah.",
      verseKey: chapterId && verseNumber ? verseKey(chapterId, verseNumber) : undefined,
      chapterId,
      verseNumber: verseNumber ?? undefined,
      suggestions: ["Clear highlight", "Add a note"],
    });
  }

  if (/\b(show|open|find|my|see|list)\b/.test(text) && /\b(bookmarks?|favou?rites?|saved)\b/.test(text)) {
    return base({
      action: "bookmarks",
      reply: "Opening bookmarks.",
      query: text.replace(/\b(show|open|find|my|see|list|bookmarks?|favou?rites?|saved|the|please)\b/g, " ").replace(/\s+/g, " ").trim() || undefined,
      suggestions: ["Bookmark this ayah", "Show my notes"],
    });
  }

  if (/\b(bookmark|favou?rite|star|unbookmark|unstar)\b/.test(text) && !how) {
    return base({
      action: "bookmark",
      reply: "Updating the bookmark on this ayah.",
      verseKey: chapterId && verseNumber ? verseKey(chapterId, verseNumber) : undefined,
      chapterId,
      verseNumber: verseNumber ?? undefined,
      suggestions: ["Show bookmarks", "Add a note"],
    });
  }

  const noteSaying = text.match(/\b(?:note|notes)\b.*?\b(?:saying|that|:)\s+(.+)$/);
  if (/\b(add|write|make|new|take|save|leave)\b/.test(text) && /\bnotes?\b/.test(text) && !how) {
    return base({
      action: "note",
      reply: noteSaying?.[1] ? "Saving that note." : "Opening the note for this ayah.",
      noteBody: noteSaying?.[1]?.trim(),
      verseKey: chapterId && verseNumber ? verseKey(chapterId, verseNumber) : undefined,
      chapterId,
      verseNumber: verseNumber ?? undefined,
      suggestions: ["Show my notes", "Bookmark this ayah"],
    });
  }

  if (/\b(find|show|open|search|my|where are)\b/.test(text) && /\bnotes?\b/.test(text)) {
    const query = text
      .replace(/\b(find|show|open|search|my|where|are|the|notes?|about|for|on|please)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return base({
      action: "find-notes",
      reply: query ? `Looking through your notes for “${query}”.` : "Opening your notes.",
      query: query || undefined,
      suggestions: ["Add a note", "Show bookmarks"],
    });
  }

  if (chapterId && verseNumber && !/\b(search|note|bookmark|highlight|tafsir|play|recite)\b/.test(text)) {
    return goVerse(chapterId, verseNumber);
  }
  if (chapterId && !verseNumber && /\b(find|open|go|show|read|take)\b/.test(text) && !/\b(search|note|bookmark|highlight|tafsir)\b/.test(text)) {
    const name = surahById(chapterId)?.name ?? `Surah ${chapterId}`;
    return base({
      action: "go-surah",
      reply: `Opening ${name}.`,
      chapterId,
      suggestions: ["Play this surah", "Next surah", "Open tafsir"],
    });
  }

  if (/\b(where is search|focus search|open search)\b/.test(text) || (how && /\bsearch\b/.test(text))) {
    return base({
      action: "search",
      locate: true,
      lesson: "search",
      reply: "Search is the box at the top. Type a word, a theme, or 2:255.",
      suggestions: ["Search for mercy", "Go to 2:255"],
    });
  }

  if (/\b(search|look up|find)\b/.test(text) && !/\b(note|bookmark|surah|chapter)\b/.test(text)) {
    const query = text
      .replace(/\b(please|search|for|look|up|find|the|a|an|me)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!query || query === "search") {
      return base({
        action: "search",
        locate: true,
        lesson: "search",
        reply: "Search is ready. Type a word or a place like 2:255.",
        suggestions: ["Go to 2:255", "Play this surah"],
      });
    }
    return base({
      action: "search",
      reply: `Searching for “${query}”.`,
      query,
      suggestions: ["Where is search", "Open tafsir"],
    });
  }

  if (/\barabic only\b|\bhide translation\b|\bwithout translation\b/.test(text)) {
    return base({
      action: "translation",
      translationChange: "arabic-only",
      reply: "Showing Arabic on its own.",
      suggestions: ["Reset translation", "Open tafsir"],
    });
  }
  if (/\breset (the )?(languages?|translations?)\b|\b(arabic and english)\b/.test(text)) {
    return base({
      action: "translation",
      translationChange: "reset",
      reply: "Back to Arabic and English.",
      suggestions: ["Add Urdu", "Open tafsir"],
    });
  }
  if (/\btransliterat/.test(text)) {
    return base({
      action: "translation",
      translationChange: "transliteration",
      reply: "Toggling transliteration.",
      suggestions: ["Reset translation"],
    });
  }
  const language = findLanguage(text);
  if (language && /\b(translation|language|translate|add|show|hide|remove)\b/.test(text)) {
    const hide = /\b(hide|remove|turn off)\b/.test(text);
    return base({
      action: "translation",
      translationChange: hide ? "hide" : "add",
      language,
      reply: hide ? `Hiding ${language}.` : `Adding ${language} beside the Arabic.`,
      suggestions: ["Reset translation", "Arabic only"],
    });
  }
  if (/\b(show|turn on) (the )?translation\b/.test(text)) {
    return base({
      action: "translation",
      translationChange: "show",
      reply: "Showing the translation.",
      suggestions: ["Arabic only", "Reset translation"],
    });
  }

  if (/\bhide tafsir\b|\bclose tafsir\b|\bturn off tafsir\b/.test(text)) {
    return base({ action: "tafsir", reply: "Hiding tafsir.", query: "hide", suggestions: ["Open tafsir"] });
  }
  if (/\b(tafsir|commentary)\b/.test(text)) {
    return base({
      action: "tafsir",
      reply: chapterId && verseNumber ? `Opening tafsir for ${verseKey(chapterId, verseNumber)}.` : "Opening tafsir.",
      verseKey: chapterId && verseNumber ? verseKey(chapterId, verseNumber) : undefined,
      chapterId,
      verseNumber: verseNumber ?? undefined,
      suggestions: ["Hide tafsir", "Add a note"],
    });
  }

  if (/\b(sign in|signin|sign up|log in|create (an )?account)\b/.test(text)) {
    return base({
      action: "sign-in",
      reply: "Opening sign in. Your library syncs once you're in.",
      suggestions: ["My progress", "Export my library"],
    });
  }
  if (/\b(my )?progress|how far|streak|what have i read\b/.test(text)) {
    return base({
      action: "progress",
      reply: "Opening your reading progress.",
      suggestions: ["Export my library", "Sign in"],
    });
  }
  if (/\b(export|download|backup)\b/.test(text)) {
    const kind = /\bstats?\b|\bcsv\b|\bspreadsheet\b/.test(text) ? "stats" : "library";
    return base({
      action: "export",
      exportKind: kind,
      reply: kind === "stats" ? "Downloading your stats." : "Downloading your library.",
      suggestions: ["My progress", "Sign in"],
    });
  }
  if (/\b(my account|account|profile)\b/.test(text)) {
    return base({
      action: "account",
      reply: "Opening your account.",
      suggestions: ["My progress", "Sign in", "Export my library"],
    });
  }

  if (/\b(word by word)\b/.test(text)) {
    return base({
      action: "study",
      wordByWord: true,
      reply: "Opening word by word on the study desk.",
      suggestions: ["Play this word", "Add a note"],
    });
  }
  if (/\b(study desk|my desk|open (the )?desk|study rail)\b/.test(text) || text === "study" || text === "desk") {
    return base({
      action: "study",
      reply: "Opening your study desk.",
      lesson: "study",
      suggestions: ["Add a note", "Show highlights"],
    });
  }

  if (/\b(focus|distraction|full screen|hide (the )?side)\b/.test(text)) {
    return base({
      action: "focus",
      reply: "Toggling focus so the mushaf can fill the room.",
      suggestions: ["Bigger text", "Play this surah"],
    });
  }

  if (juz && /\b(go|open|read|show|take|juz)\b/.test(text)) {
    return base({
      action: "go-juz",
      reply: `Opening Juz ${juz}.`,
      juz,
      suggestions: ["Play this surah", "Next juz"],
    });
  }

  if (chapterId && verseNumber) return goVerse(chapterId, verseNumber);
  if (chapterId && /\b(go|open|read|show|take|surah|chapter|to)\b/.test(text)) {
    const name = surahById(chapterId)?.name ?? `Surah ${chapterId}`;
    return base({
      action: "go-surah",
      reply: `Opening ${name}.`,
      chapterId,
      suggestions: ["Play this surah", "Next surah", "Open tafsir"],
    });
  }
  if (chapterId && text.split(" ").length <= 4) {
    const name = surahById(chapterId)?.name ?? `Surah ${chapterId}`;
    return base({
      action: "go-surah",
      reply: `Opening ${name}.`,
      chapterId,
      suggestions: ["Play this surah", "Open tafsir"],
    });
  }

  if (how && /\b(bookmark|favou?rite)\b/.test(text)) {
    return base({
      action: "guide",
      reply: "The star on an ayah bookmarks it. I can do that for the ayah you're on.",
      suggestions: ["Bookmark this ayah", "Show bookmarks"],
    });
  }
  if (how && /\bnotes?\b/.test(text)) {
    return base({
      action: "guide",
      reply: "Notes attach to the ayah you're on. I can open the note box.",
      suggestions: ["Add a note", "Show my notes"],
    });
  }
  if (how && /\b(highlight)\b/.test(text)) {
    return base({
      action: "guide",
      reply: "Highlight paints the ayah with your current pen. I can do that for this ayah.",
      suggestions: ["Highlight this ayah", "Show highlights"],
    });
  }
  if (how && /\b(audio|play|reciter)\b/.test(text)) {
    return base({
      action: "lesson",
      lesson: "audio",
      reply: "Play surah starts at the beginning. On an ayah, Ayah plays just that verse.",
      suggestions: ["Play this surah", "Play this ayah"],
    });
  }
  if (/\b(audio|listen|reciter)\b/.test(text)) {
    return base({
      action: "lesson",
      lesson: "audio",
      reply: "The player sits under the mushaf. Tell me to play, pause, or change the reciter.",
      suggestions: ["Play this surah", "Change reciter to Mishari"],
    });
  }
  if (/\b(size|font|type)\b/.test(text)) {
    return base({
      action: "lesson",
      lesson: "size",
      reply: "Size is in the header. You can also tell me bigger, smaller, or a number.",
      suggestions: ["Bigger text", "Smaller text"],
    });
  }
  if (/\b(language|translation|english|arabic)\b/.test(text)) {
    return base({
      action: "lesson",
      lesson: "languages",
      reply: "Arabic stays. Other languages sit beside it. Ask me to add one, or reset to Arabic and English.",
      suggestions: ["Reset translation", "Arabic only"],
    });
  }

  return base({
    action: "none",
    reply: `I can take you to a surah, ayah, or juz, play recitation, and open notes, bookmarks, tafsir, search, and settings. I don't explain the Quran's meaning. Try one of these, or say it another way — I'm ${COMPANION_NAME}.`,
    suggestions: suggestionsFor(text),
  });
}

function goOrCurrent(
  action: "play-from",
  reply: string,
  chapterId?: number,
  verseNumber?: number | null,
  autoplay?: HelperMatch["autoplay"],
): HelperMatch {
  if (chapterId && verseNumber) return goVerse(chapterId, verseNumber, autoplay);
  return base({
    action,
    reply,
    suggestions: ["Pause", "Play this ayah"],
    chapterId,
    verseNumber: verseNumber ?? undefined,
    verseKey: chapterId && verseNumber ? verseKey(chapterId, verseNumber) : undefined,
  });
}
