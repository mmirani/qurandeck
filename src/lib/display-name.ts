const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i",
};

const STEMS = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "whore",
  "slut",
  "rape",
  "nazi",
];

const TOKENS = ["ass", "damn", "hell", "cock", "dick", "piss", "crap", "tit", "cum", "fag", "dyke"];

const ALLOWED_COMPACT = new Set([
  "classic",
  "class",
  "assassin",
  "pass",
  "bass",
  "compass",
  "scunthorpe",
  "hello",
  "shell",
  "cocktail",
  "peacock",
  "dickens",
]);

function compact(value: string) {
  const folded = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .split("")
    .map((char) => LEET[char] ?? char)
    .join("");
  return folded.replace(/[^a-z]/g, "");
}

function tokens(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .split("")
    .map((char) => LEET[char] ?? char)
    .join("")
    .split(/[^a-z]+/)
    .filter(Boolean);
}

export function containsBlockedLanguage(value: string) {
  const packed = compact(value);
  const collapsed = packed.replace(/(.)\1+/g, "$1");
  if (ALLOWED_COMPACT.has(packed) || ALLOWED_COMPACT.has(collapsed)) return false;
  if (STEMS.some((word) => packed.includes(word) || collapsed.includes(word))) return true;
  const words = tokens(value).map((word) => word.replace(/(.)\1+/g, "$1"));
  return words.some((word) => TOKENS.includes(word) || STEMS.includes(word));
}

export function cleanDisplayName(raw: string) {
  return raw.trim().replace(/\s+/g, " ");
}

export function validateDisplayName(raw: string) {
  const name = cleanDisplayName(raw);
  if (name.length < 2) return "Use at least 2 characters.";
  if (name.length > 40) return "Keep the name under 40 characters.";
  if (!/^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} .'-]*$/u.test(name)) {
    return "Use letters, numbers, spaces, apostrophes, or hyphens.";
  }
  if (containsBlockedLanguage(name)) return "Choose a name without offensive language.";
  return null;
}
