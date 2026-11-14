import { defaultSwatches } from "@/lib/highlights";
import type { Highlight, HighlightSwatch } from "@/lib/quran/types";

export const SWATCH_NAME_MAX = 24;

/** Word and text marks mix the pen into the surface at this amount. */
export const HIGHLIGHT_MARK_MIX = 0.4;

/** Whole-ayah wash. Lighter than a word mark, still checked for contrast. */
export const HIGHLIGHT_AYAH_MIX = 0.28;

const LIGHT_SURFACE = "#FFFFFF";
const LIGHT_INK = "#0B1220";
const DARK_SURFACE = "#161222";
const DARK_INK = "#F8F5FF";

export const SWATCH_PRESETS: { name: string; color: string }[] = [
  { name: "Yellow", color: "#F5D76E" },
  { name: "Green", color: "#86EFAC" },
  { name: "Sky", color: "#7DD3FC" },
  { name: "Rose", color: "#F9A8D4" },
  { name: "Orange", color: "#FDBA74" },
  { name: "Lilac", color: "#C4B5FD" },
  { name: "Mint", color: "#5EEAD4" },
  { name: "Coral", color: "#FDA4AF" },
  { name: "Gold", color: "#E8C872" },
  { name: "Aqua", color: "#67E8F9" },
];

export type SwatchDeleteAction = { kind: "recolor"; toId: string } | { kind: "remove" };

export function normalizeHex(value: string): string | null {
  const raw = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split("")
      .map((char) => char + char)
      .join("")
      .toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return null;
}

/** Keep saved order. Drop broken entries. An empty list stays empty. */
export function cleanSwatches(value: unknown): HighlightSwatch[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const next: HighlightSwatch[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Partial<HighlightSwatch>;
    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    const name = typeof raw.name === "string" ? raw.name.trim().slice(0, SWATCH_NAME_MAX) : "";
    const color = typeof raw.color === "string" ? normalizeHex(raw.color) : null;
    if (!id || !name || !color || seen.has(id)) continue;
    seen.add(id);
    next.push({ id, name, color });
  }
  return next;
}

export function swatchesOrDefaults(list: HighlightSwatch[]): HighlightSwatch[] {
  return list.length ? list : defaultSwatches.map((item) => ({ ...item }));
}

export function swatchNameError(swatches: HighlightSwatch[], name: string, exceptId?: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Name the colour.";
  if (trimmed.length > SWATCH_NAME_MAX) return "Use 24 characters or fewer.";
  const clash = swatches.find(
    (item) => item.id !== exceptId && item.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  if (clash) return `You already have a colour named ${clash.name}.`;
  return null;
}

export function reorderSwatch(swatches: HighlightSwatch[], id: string, direction: -1 | 1): HighlightSwatch[] {
  const index = swatches.findIndex((item) => item.id === id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= swatches.length) return swatches;
  const copy = swatches.slice();
  const [item] = copy.splice(index, 1);
  if (!item) return swatches;
  copy.splice(nextIndex, 0, item);
  return copy;
}

export function applySwatchDeletion(
  highlights: Highlight[],
  swatches: HighlightSwatch[],
  id: string,
  action: SwatchDeleteAction,
): { highlights: Highlight[]; swatches: HighlightSwatch[] } {
  if (!swatches.some((item) => item.id === id)) return { highlights, swatches };
  const remaining = swatches.filter((item) => item.id !== id);
  if (action.kind === "recolor") {
    if (!remaining.some((item) => item.id === action.toId)) return { highlights, swatches };
    return {
      swatches: remaining,
      highlights: highlights.map((item) => (item.swatchId === id ? { ...item, swatchId: action.toId } : item)),
    };
  }
  return {
    swatches: swatchesOrDefaults(remaining),
    highlights: highlights.filter((item) => item.swatchId !== id),
  };
}

export function resolveSwatch(swatches: HighlightSwatch[], id: string): { swatch: HighlightSwatch; missing: boolean } {
  const found = swatches.find((item) => item.id === id);
  if (found) return { swatch: found, missing: false };
  return { swatch: swatchesOrDefaults(swatches)[0] ?? defaultSwatches[0], missing: true };
}

function channel(hex: string, shift: number) {
  return parseInt(hex.slice(1), 16) >> shift & 255;
}

function mixHex(color: string, surface: string, amount: number) {
  const blend = (shift: number) =>
    Math.round(channel(color, shift) * amount + channel(surface, shift) * (1 - amount));
  return `#${[blend(16), blend(8), blend(0)].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function luminance(hex: string) {
  const linear = (value: number) => {
    const channelValue = value / 255;
    return channelValue <= 0.04045 ? channelValue / 12.92 : ((channelValue + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(channel(hex, 16)) + 0.7152 * linear(channel(hex, 8)) + 0.0722 * linear(channel(hex, 0));
}

export function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

/** Lowest text contrast of this pen as an ayah wash and as a word mark, in light and dark. */
export function washContrast(color: string): { ratio: number; passes: boolean } {
  const hex = normalizeHex(color);
  if (!hex) return { ratio: 1, passes: false };
  const samples = [HIGHLIGHT_AYAH_MIX, HIGHLIGHT_MARK_MIX].flatMap((amount) => [
    contrastRatio(LIGHT_INK, mixHex(hex, LIGHT_SURFACE, amount)),
    contrastRatio(DARK_INK, mixHex(hex, DARK_SURFACE, amount)),
  ]);
  const ratio = Math.min(...samples);
  return { ratio, passes: ratio >= 4.5 };
}
