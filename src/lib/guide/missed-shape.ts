import { matcherVocabulary, normalizeCommand, themeNames } from "./commands";
import { SURAH_NAMES } from "./surahs";

/**
 * The only thing QuranDeck keeps about a command Sana did not understand is its "shape":
 * known command words, with every number, surah name, and theme name replaced by a placeholder,
 * and every other word replaced by [w]. The words someone typed are never sent or stored.
 *
 *   "Take me to Al-Kahf tonight"  ->  "take me to [surah] [w]"
 *
 * This file runs in the browser (to build the shape) and on the server (to re-check it),
 * so a request that carries anything other than a clean shape is refused.
 */

export const SHAPE_MAX_TOKENS = 6;
export const SHAPE_MAX_LENGTH = 80;
const RAW_MAX_LENGTH = 120;

export const PLACEHOLDERS = ["[n]", "[surah]", "[theme]", "[w]"] as const;
const PLACEHOLDER_SET = new Set<string>(PLACEHOLDERS);

/** Command verbs and UI words people use with a reading companion. None of them can name a person. */
const UI_WORDS = [
  "go", "goto", "take", "jump", "navigate", "bring", "head", "turn", "read", "view", "see", "find", "look", "list",
  "close", "set", "enable", "disable", "on", "off", "up", "down", "out", "at", "by", "or", "not", "no", "yes",
  "all", "any", "some", "more", "less", "now", "here", "there", "just", "again", "back", "forward", "last", "first",
  "top", "bottom", "beginning", "end", "page", "pages", "home", "menu", "settings", "setting", "help", "commands",
  "command", "repeat", "loop", "speed", "slower", "faster", "slow", "fast", "louder", "quieter", "volume", "sound",
  "mute", "unmute", "voice", "reciter", "qari", "recitation", "big", "small", "large", "zoom", "letters", "color",
  "colour", "colors", "colours", "bright", "brighter", "darker", "lighter", "dim", "white", "black", "day", "screen",
  "full", "phone", "desktop", "tablet", "sync", "share", "copy", "link", "print", "save", "saved", "delete", "undo",
  "login", "logout", "signin", "signout", "up", "password", "email", "which", "who", "should", "will", "are", "am",
  "was", "did", "these", "those", "hi", "hey", "thank", "thanks", "mushaf", "quran", "verses", "ayahs", "surahs",
  "words", "hizb", "ruku", "para", "number", "translate", "transliteration", "audio", "bookmarks", "highlights",
  "favorites", "favourites", "whats", "wheres", "hows", "cant", "dont", "wont", "isnt", "doesnt", "im", "its",
  "left", "leave", "where", "continue", "last", "place", "pick", "resume", "stop", "keep", "time", "today",
];

const NUMBER_WORDS = new Set([
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen",
  "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty", "thirty", "forty", "fifty",
  "sixty", "seventy", "eighty", "ninety", "hundred", "first", "second", "third",
]);

let vocabulary: Set<string> | null = null;
let phrases: { words: string[]; token: string }[] | null = null;

export function shapeVocabulary() {
  vocabulary ??= new Set([...matcherVocabulary(), ...UI_WORDS]);
  return vocabulary;
}

function clean(value: string) {
  return normalizeCommand(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Surah and theme names, longest first. A name made only of everyday words ("the light") is left as words. */
function namedPhrases() {
  if (phrases) return phrases;
  const vocab = shapeVocabulary();
  const out = new Map<string, string>();
  for (const surah of SURAH_NAMES) {
    for (const name of [surah.name, ...surah.aliases]) {
      const key = clean(name);
      if (key && key.split(" ").some((word) => !vocab.has(word))) out.set(key, "[surah]");
    }
  }
  for (const name of themeNames()) {
    const key = clean(name);
    if (key && !out.has(key)) out.set(key, "[theme]");
  }
  phrases = [...out.entries()]
    .map(([key, token]) => ({ words: key.split(" "), token }))
    .sort((a, b) => b.words.length - a.words.length || b.words.join(" ").length - a.words.join(" ").length);
  return phrases;
}

function looksPrivate(raw: string) {
  if (/\S+@\S+/.test(raw)) return true;
  if (/\b(?:https?:\/\/|www\.)/i.test(raw)) return true;
  if (/\b[a-z0-9-]+\.(?:com|org|net|io|co|app|me|uk|ca|us|info|edu|gov)\b/i.test(raw)) return true;
  // A long run of digits is a phone number or a code, not a verse.
  if (/\d[\d\s().-]{7,}\d/.test(raw)) return true;
  return false;
}

/**
 * The shape of a missed command, or null when it should not be kept at all:
 * empty, too long, an email, link, or phone number, more than six words, or no known word left.
 */
export function missedShape(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > RAW_MAX_LENGTH) return null;
  if (looksPrivate(trimmed)) return null;

  const words = clean(trimmed).split(" ").filter(Boolean);
  if (words.length === 0) return null;

  const tokens: string[] = [];
  const named = namedPhrases();
  for (let i = 0; i < words.length; ) {
    const word = words[i];
    if (/\d/.test(word) || NUMBER_WORDS.has(word)) {
      if (tokens.at(-1) !== "[n]" || /\d/.test(word)) tokens.push("[n]");
      i += 1;
      continue;
    }
    const phrase = named.find((item) => item.words.every((part, offset) => words[i + offset] === part));
    if (phrase) {
      tokens.push(phrase.token);
      i += phrase.words.length;
      continue;
    }
    tokens.push(word);
    i += 1;
  }
  if (tokens.length > SHAPE_MAX_TOKENS) return null;

  const vocab = shapeVocabulary();
  const shaped: string[] = [];
  for (const token of tokens) {
    const value = PLACEHOLDER_SET.has(token) || vocab.has(token) ? token : "[w]";
    // A run of unknown words becomes one [w], so its length says nothing either.
    if (value === "[w]" && shaped.at(-1) === "[w]") continue;
    shaped.push(value);
  }
  const shape = shaped.join(" ");
  return isSafeShape(shape) ? shape : null;
}

/** Server-side check: every token is a known word or a placeholder, and the shape is short. */
export function isSafeShape(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!value || value.length > SHAPE_MAX_LENGTH) return false;
  const tokens = value.split(" ");
  if (tokens.length === 0 || tokens.length > SHAPE_MAX_TOKENS) return false;
  const vocab = shapeVocabulary();
  let known = false;
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "[w]") {
      if (tokens[i - 1] === "[w]") return false;
      continue;
    }
    if (!PLACEHOLDER_SET.has(token) && !vocab.has(token)) return false;
    known = true;
  }
  return known;
}
