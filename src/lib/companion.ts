const KEY = "al-mushaf-nur-v2";
export const NUR_SRC = "/companion/nur.png";
export const NUR_SIZE = 88;
const BASE_HUE = 166;

export type CompanionPose = {
  left: number | null;
  top: number | null;
  hidden: boolean;
};

export const defaultPose: CompanionPose = { left: null, top: null, hidden: false };

let cache = defaultPose;
let cacheKey = "";

function parsePose(raw: string): CompanionPose {
  try {
    const value = JSON.parse(raw) as Partial<CompanionPose>;
    return {
      left: typeof value.left === "number" ? value.left : null,
      top: typeof value.top === "number" ? value.top : null,
      hidden: Boolean(value.hidden),
    };
  } catch {
    return defaultPose;
  }
}

export function loadCompanionPose(): CompanionPose {
  if (typeof window === "undefined") return defaultPose;
  const raw = window.localStorage.getItem(KEY) ?? "";
  if (raw !== cacheKey) {
    cacheKey = raw;
    cache = raw ? parsePose(raw) : defaultPose;
  }
  if (cache.left == null || cache.top == null) return cache;
  const clamped = clampPose(cache.left, cache.top);
  if (clamped.left === cache.left && clamped.top === cache.top) return cache;
  cache = { ...cache, ...clamped };
  return cache;
}

export function saveCompanionPose(value: CompanionPose) {
  cache = value;
  cacheKey = JSON.stringify(value);
  window.localStorage.setItem(KEY, cacheKey);
}

export function defaultCorner(size = NUR_SIZE) {
  const xl = window.innerWidth >= 1280;
  const mobile = !xl;
  const rightGutter = xl ? 372 : 16;
  const left = window.innerWidth - size - rightGutter;
  const top = window.innerHeight - size - (mobile ? 152 : 24);
  return clampPose(left, top, size);
}

export function clampPose(left: number, top: number, size = NUR_SIZE) {
  const maxLeft = Math.max(8, window.innerWidth - size - 8);
  const maxTop = Math.max(8, window.innerHeight - size - 8);
  return {
    left: Math.min(maxLeft, Math.max(8, left)),
    top: Math.min(maxTop, Math.max(8, top)),
  };
}

function parseCssColor(input: string) {
  const value = input.trim();
  if (!value) return null;
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((part) => part + part)
            .join("")
        : hex.slice(0, 6);
    if (full.length !== 6) return null;
    return {
      r: Number.parseInt(full.slice(0, 2), 16) / 255,
      g: Number.parseInt(full.slice(2, 4), 16) / 255,
      b: Number.parseInt(full.slice(4, 6), 16) / 255,
    };
  }
  const rgb = value.match(/rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)/i);
  if (!rgb) return null;
  return { r: Number(rgb[1]) / 255, g: Number(rgb[2]) / 255, b: Number(rgb[3]) / 255 };
}

function rgbToHsl(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}

export function companionFilterFromGold(gold: string, canvas = "") {
  const rgb = parseCssColor(gold);
  if (!rgb) return "none";
  const { h, s } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const canvasRgb = parseCssColor(canvas);
  const lightBg = canvasRgb ? rgbToHsl(canvasRgb.r, canvasRgb.g, canvasRgb.b).l > 0.42 : true;
  if (s < 0.12) {
    return lightBg
      ? "grayscale(0.12) contrast(1.28) brightness(0.7) saturate(0.3)"
      : "grayscale(0.35) contrast(1.12) brightness(0.92) saturate(0.4)";
  }
  const rotate = Math.round(h - BASE_HUE);
  if (lightBg) {
    return `hue-rotate(${rotate}deg) saturate(1.65) brightness(0.74) contrast(1.24)`;
  }
  return `hue-rotate(${rotate}deg) saturate(1.38) brightness(1.06)`;
}
