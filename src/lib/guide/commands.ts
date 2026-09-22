import { COMPANION_NAME } from "@/lib/brand";
import { HELPER_HINTS, type TourId } from "./catalog";

export type HelperAction =
  | "tour"
  | "lesson"
  | "play-surah"
  | "play-from"
  | "pause"
  | "bigger"
  | "smaller"
  | "highlight"
  | "study"
  | "focus"
  | "search"
  | "rest"
  | "none";

export type HelperMatch = {
  action: HelperAction;
  reply: string;
  lesson?: TourId;
};

const RULES: Array<{ action: HelperAction; lesson?: TourId; reply: string; tests: RegExp[] }> = [
  {
    action: "tour",
    reply: "Let’s walk through the mushaf together. Skip anytime.",
    tests: [/\b(tour|walk\s*me|show\s*me\s*around|guide|onboard|how\s+do\s+i\s+use)\b/i],
  },
  {
    action: "lesson",
    lesson: "search",
    reply: "Search is the top box. Type a word, a theme, or 2:255.",
    tests: [/\b(search|find|look\s*up)\b/i],
  },
  {
    action: "lesson",
    lesson: "languages",
    reply: "Arabic stays. Add other languages beside it. The circular arrow resets to Arabic and English.",
    tests: [/\b(language|translation|english|arabic|reset)\b/i],
  },
  {
    action: "play-surah",
    reply: "Playing this surah from the start.",
    tests: [/\b(play\s+(this\s+)?(surah|chapter)|start\s+(the\s+)?(surah|recitation)|recite)\b/i],
  },
  {
    action: "play-from",
    reply: "Playing from this ayah through the rest.",
    tests: [/\b(rest\s+of\s+(the\s+)?(surah|juz)|from\s+here|continue\s+playing)\b/i],
  },
  {
    action: "pause",
    reply: "Paused.",
    tests: [/\b(pause|stop\s+playing|silence)\b/i],
  },
  {
    action: "bigger",
    reply: "A little larger.",
    tests: [/\b(bigger|larger|increase\s+(the\s+)?(size|text|font)|zoom\s*in)\b/i],
  },
  {
    action: "smaller",
    reply: "A little smaller.",
    tests: [/\b(smaller|decrease\s+(the\s+)?(size|text|font)|zoom\s*out)\b/i],
  },
  {
    action: "highlight",
    reply: "Highlighted this ayah with your current pen.",
    tests: [/\b(highlight|mark|pen)\b/i],
  },
  {
    action: "study",
    reply: "Opening your study desk.",
    tests: [/\b(study|desk|notes?|word\s*by\s*word)\b/i],
  },
  {
    action: "lesson",
    lesson: "ayah",
    reply: "Tap an ayah for play, note, star, and highlight.",
    tests: [/\b(ayah|verse|ayat)\b/i],
  },
  {
    action: "focus",
    reply: "Toggling focus so the mushaf can fill the room.",
    tests: [/\b(focus|distraction|full\s*screen|hide\s+side)\b/i],
  },
  {
    action: "search",
    reply: "Search is ready. Type a word or 2:255.",
    tests: [/\b(where\s+is\s+search)\b/i],
  },
  {
    action: "rest",
    reply: "I’ll wait in the corner until you call me.",
    tests: [/\b(hide|rest|go\s+away|dismiss)\b/i],
  },
  {
    action: "lesson",
    lesson: "account",
    reply: "Sign in is free, private, and stays on this device.",
    tests: [/\b(account|sign\s*in|sign\s*up|private|login)\b/i],
  },
  {
    action: "lesson",
    lesson: "audio",
    reply: "Play surah starts at the beginning. Rest of Surah continues from the ayah you picked.",
    tests: [/\b(audio|listen|reciter)\b/i],
  },
  {
    action: "lesson",
    lesson: "size",
    reply: "Size is in the header. You can also tell me bigger or smaller.",
    tests: [/\b(size|font|type)\b/i],
  },
];

export function matchHelper(raw: string): HelperMatch {
  const text = raw.trim();
  if (!text) {
    return {
      action: "none",
      reply: `Try ${HELPER_HINTS.slice(0, 3).join(", ")}.`,
    };
  }
  for (const rule of RULES) {
    if (rule.tests.some((test) => test.test(text))) {
      return { action: rule.action, reply: rule.reply, lesson: rule.lesson };
    }
  }
  return {
    action: "none",
    reply: `I can walk you through, play this surah, change size, or highlight this ayah. Ask in plain words — I’m ${COMPANION_NAME}.`,
  };
}
