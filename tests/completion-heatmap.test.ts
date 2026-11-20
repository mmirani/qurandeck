import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const CSS = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/app/globals.css"), "utf8");

const THEMES = [
  "manuscript",
  "emerald",
  "ottoman",
  "ivory",
  "iris",
  "pastels",
  "blush",
  "sepia",
  "contrast",
  "aurora",
  "obsidian",
  "midnight",
  "slate",
  "forest",
  "amethyst",
  "rose",
  "cyan",
] as const;

const NIGHT = new Set(["aurora", "obsidian", "midnight", "slate", "forest", "amethyst", "rose", "cyan"]);

const DAY_RAMP = {
  "--map-low": "#a7f3d0",
  "--map-mid": "#34d399",
  "--map-high": "#10b981",
  "--map-done": "#059669",
  "--map-sheen": "#a7f3d0",
  "--map-bloom": "#6ee7b7",
};

const NIGHT_RAMP = {
  "--map-low": "#166534",
  "--map-mid": "#15803d",
  "--map-high": "#10b981",
  "--map-done": "#6ee7b7",
  "--map-sheen": "#a7f3d0",
  "--map-bloom": "#34d399",
};

type RGB = [number, number, number];

function stripComments(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, " ");
}

function parseBlocks(css: string) {
  const out: { sel: string; body: string }[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(stripComments(css)))) out.push({ sel: match[1].trim(), body: match[2] });
  return out;
}

function varsFrom(body: string) {
  const out: Record<string, string> = {};
  for (const line of body.split(";")) {
    const match = /^\s*(--[a-z0-9-]+)\s*:\s*(.+?)\s*$/i.exec(line);
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}

function themeVars(theme: string) {
  const vars: Record<string, string> = {};
  for (const block of parseBlocks(CSS)) {
    const selectors = block.sel.split(",").map((item) => item.trim());
    const matches = selectors.some((sel) => {
      if (sel === ":root") return true;
      return sel === `[data-theme="${theme}"]` || sel === `html[data-theme="${theme}"]`;
    });
    if (matches) Object.assign(vars, varsFrom(block.body));
  }
  return vars;
}

function hexToRgb(hex: string): RGB {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

function resolve(expr: string, vars: Record<string, string>, depth = 0): RGB {
  if (depth > 12) throw new Error(`cycle resolving ${expr}`);
  const value = expr.trim();
  if (value.startsWith("#")) return hexToRgb(value);
  const asVar = /^var\((--[a-z0-9-]+)\)/i.exec(value);
  if (asVar) {
    const next = vars[asVar[1]];
    if (!next) throw new Error(`missing ${asVar[1]}`);
    return resolve(next, vars, depth + 1);
  }
  const mix = /^color-mix\(in srgb,\s*(.+?)\s+(\d+(?:\.\d+)?)%,\s*(.+)\)$/i.exec(value);
  if (mix) {
    const a = resolve(mix[1], vars, depth + 1);
    const t = Number(mix[2]) / 100;
    const b = resolve(mix[3], vars, depth + 1);
    return [a[0] * t + b[0] * (1 - t), a[1] * t + b[1] * (1 - t), a[2] * t + b[2] * (1 - t)];
  }
  throw new Error(`unresolved color: ${value}`);
}

function luminance(rgb: RGB) {
  const to = (channel: number) => {
    const c = Math.max(0, Math.min(255, channel)) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * to(rgb[0]) + 0.7152 * to(rgb[1]) + 0.0722 * to(rgb[2]);
}

function contrast(a: RGB, b: RGB) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

function mix(a: RGB, b: RGB, amount: number): RGB {
  return [a[0] * amount + b[0] * (1 - amount), a[1] * amount + b[1] * (1 - amount), a[2] * amount + b[2] * (1 - amount)];
}

describe("completion heatmap tokens", () => {
  it("defines one shared emerald ramp for every Day and Paper theme", () => {
    for (const theme of THEMES) {
      if (NIGHT.has(theme) || theme === "contrast") continue;
      const vars = themeVars(theme);
      for (const [token, hex] of Object.entries(DAY_RAMP)) {
        assert.equal(vars[token], hex, `${theme} ${token}`);
      }
      assert.equal(vars["--map-edge"], "transparent");
      assert.equal(vars["--noor"], "var(--map-bloom)");
    }
  });

  it("defines one shared luminous emerald ramp for every Night theme", () => {
    for (const theme of THEMES) {
      if (!NIGHT.has(theme)) continue;
      const vars = themeVars(theme);
      for (const [token, hex] of Object.entries(NIGHT_RAMP)) {
        assert.equal(vars[token], hex, `${theme} ${token}`);
      }
      assert.equal(vars["--noor"], "var(--map-bloom)");
    }
  });

  it("gives High Contrast a crisp, unmistakable scale", () => {
    const vars = themeVars("contrast");
    assert.equal(vars["--map-unread"], "#d0d0d0");
    assert.equal(vars["--map-done"], "#065f46");
    assert.equal(vars["--map-edge"], "#000000");
    assert.equal(vars["--map-base"], "#ffffff");
  });

  it("never derives the heat scale from theme accent, gold, or chip colors", () => {
    const mapTokens = ["--map-low", "--map-mid", "--map-high", "--map-done", "--map-sheen", "--map-bloom"];
    for (const theme of THEMES) {
      const vars = themeVars(theme);
      for (const token of mapTokens) {
        const value = vars[token] ?? "";
        assert.doesNotMatch(value, /--gold|--accent|--chip-alt|--chip-ink/, `${theme} ${token}`);
        assert.match(value, /^#[0-9a-f]{6}$/i, `${theme} ${token} should be a fixed hex`);
      }
    }
  });

  it("keeps surah labels and UI text at WCAG AA on every theme", () => {
    const failures: string[] = [];
    for (const theme of THEMES) {
      const vars = themeVars(theme);
      const ink = resolve("var(--ink)", vars);
      const inkSoft = resolve("var(--ink-soft)", vars);
      const surface = resolve("var(--surface)", vars);
      const base = resolve("var(--map-base)", vars);
      const unread = resolve("var(--map-unread)", vars);
      const bloom = resolve("var(--map-bloom)", vars);
      const warmed = mix(bloom, base, 0.2);
      const pairs: [string, RGB, RGB][] = [
        ["ink / surface", ink, surface],
        ["ink-soft / surface", inkSoft, surface],
        ["ink / map-base", ink, base],
        ["ink-soft / map-base", inkSoft, base],
        ["ink-soft / map-unread", inkSoft, unread],
        ["ink-soft / warmed map-base", inkSoft, warmed],
      ];
      for (const [name, fg, bg] of pairs) {
        const ratio = contrast(fg, bg);
        if (ratio < 4.5) failures.push(`${theme} ${name}: ${ratio.toFixed(2)}:1`);
      }
    }
    assert.deepEqual(failures, []);
  });
});
