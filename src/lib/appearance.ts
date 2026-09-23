import type { AppearanceThemeId, MushafInkId } from "./quran/types";

export const HOME_THEME: AppearanceThemeId = "iris";
export const LUMEN_CANVAS = "#e7ecf2";
export const LUMEN_GOLD = "#34baab";

export const APPEARANCE_THEMES: Array<{
  id: AppearanceThemeId;
  name: string;
  group: "day" | "paper" | "night";
  description: string;
  swatches: [string, string, string];
}> = [
  {
    id: "iris",
    name: "Noor",
    group: "day",
    description: "Lavender light, purple chips, cyan marks",
    swatches: ["#E4DCFF", "#7C3AED", "#06B6D4"],
  },
  {
    id: "pastels",
    name: "Pastels",
    group: "day",
    description: "White room with blush, lilac, and mint — soft, feminine daylight",
    swatches: ["#FFF9FC", "#E8A0B8", "#C5E8D5"],
  },
  {
    id: "manuscript",
    name: "Lumen",
    group: "day",
    description: "Bright studio light, teal marks, easy daytime reading",
    swatches: ["#E7ECF2", "#0F766E", "#0B1220"],
  },
  {
    id: "emerald",
    name: "Mint",
    group: "day",
    description: "Leaf-green daylight, stronger contrast than Lumen",
    swatches: ["#D8F3E6", "#047857", "#022C22"],
  },
  {
    id: "ivory",
    name: "Sky",
    group: "day",
    description: "Cool blue wash with a clear blue accent",
    swatches: ["#DBE7F6", "#1D4ED8", "#0F172A"],
  },
  {
    id: "blush",
    name: "Blush",
    group: "day",
    description: "Rose-petal daylight, pink chips, a feminine reading room",
    swatches: ["#F8D7E8", "#C2185B", "#3B1024"],
  },
  {
    id: "ottoman",
    name: "Ember",
    group: "paper",
    description: "Warm terracotta paper, tighter corners",
    swatches: ["#F6DFD2", "#C2410C", "#1C1917"],
  },
  {
    id: "sepia",
    name: "Sand",
    group: "paper",
    description: "Quiet warm paper for long sessions",
    swatches: ["#EADCC4", "#B45309", "#1C1917"],
  },
  {
    id: "contrast",
    name: "High Contrast",
    group: "paper",
    description: "Black and white, large marks, easier to see",
    swatches: ["#FFFFFF", "#000000", "#111111"],
  },
  {
    id: "aurora",
    name: "Aurora",
    group: "night",
    description: "True black with purple, pink, and cyan",
    swatches: ["#050508", "#E879F9", "#22D3EE"],
  },
  {
    id: "obsidian",
    name: "Obsidian",
    group: "night",
    description: "OLED black, warm gold, easy night reading",
    swatches: ["#000000", "#F5F5F5", "#E8C872"],
  },
  {
    id: "midnight",
    name: "Midnight",
    group: "night",
    description: "Deep navy with gold and play-green",
    swatches: ["#0B1020", "#F1F5F9", "#E4C37A"],
  },
  {
    id: "slate",
    name: "Slate",
    group: "night",
    description: "Cool charcoal with sky-blue marks",
    swatches: ["#0B0D12", "#F1F5F9", "#7DD3FC"],
  },
  {
    id: "forest",
    name: "Forest Night",
    group: "night",
    description: "Black-green study lamp, mint accents",
    swatches: ["#06110C", "#F3F7F2", "#86EFAC"],
  },
  {
    id: "amethyst",
    name: "Amethyst",
    group: "night",
    description: "Violet night, lilac highlights",
    swatches: ["#120A1C", "#F8F4FF", "#D8B4FE"],
  },
  {
    id: "rose",
    name: "Rose Night",
    group: "night",
    description: "Charcoal rose with soft pink marks",
    swatches: ["#140A0F", "#FFF7FA", "#F9A8D4"],
  },
  {
    id: "cyan",
    name: "Cyan Night",
    group: "night",
    description: "Teal night, cyan chrome, quiet body text",
    swatches: ["#061418", "#ECFEFF", "#67E8F9"],
  },
];

export function appliedTheme(pathname: string, theme: AppearanceThemeId): AppearanceThemeId {
  return pathname === "/" ? HOME_THEME : theme;
}

export const FONT_SIZE_MIN = 14;
export const FONT_SIZE_MAX = 36;

export const MUSHAF_INKS: Array<{
  id: MushafInkId;
  name: string;
  swatch: string;
}> = [
  { id: "green", name: "Madinah green", swatch: "#0f3d2e" },
  { id: "gold", name: "Gilded ochre", swatch: "#b8860b" },
  { id: "crimson", name: "Ottoman crimson", swatch: "#7a1c28" },
  { id: "navy", name: "Indigo night", swatch: "#13233f" },
  { id: "teal", name: "Lumen teal", swatch: "#115e59" },
];

export function asMushafInk(value: unknown): MushafInkId {
  return MUSHAF_INKS.some((ink) => ink.id === value) ? (value as MushafInkId) : "green";
}

export function layoutSignals(prefs: {
  fontSize: number;
  showArabic: boolean;
  showTranslation: boolean;
  showTransliteration: boolean;
  translationIds?: number[];
}) {
  const translationCols = prefs.showTranslation ? Math.max(prefs.translationIds?.length ?? 1, 1) : 0;
  const layers = Number(prefs.showArabic) + Number(prefs.showTransliteration) + translationCols;
  return {
    layers,
    size: prefs.fontSize >= 34 ? "xl" : prefs.fontSize >= 26 ? "lg" : prefs.fontSize <= 16 ? "sm" : "md",
    script: layers === 1 && prefs.showArabic ? "ar" : layers === 1 ? "latin" : "mixed",
  } as const;
}
