import type { FinishedReading } from "@/lib/finished-reading";

export type KeepsakeDesign = {
  month: number;
  id: string;
  /** Internal name only — never drawn on the card. */
  name: string;
  paperTop: string;
  paperMid: string;
  paperBottom: string;
  ink: string;
  soft: string;
  muted: string;
  stem: string;
  leafFill: string;
  flower: string;
  flowerStroke: string;
  bird: string;
  frame: string;
};

/**
 * Twelve seasonal designs in QuranDeck Iris purple and cyan.
 * Seasons shift shade within that palette; motifs and compositions stay distinct.
 * Text colours are chosen for WCAG AA contrast on these light papers.
 */
export const KEEPSAKE_DESIGNS: readonly KeepsakeDesign[] = [
  {
    month: 1, id: "winter-frost", name: "Winter frost",
    paperTop: "#e4eef8", paperMid: "#f4f8fc", paperBottom: "#e8f2f8",
    ink: "#1e1b4b", soft: "#3d1779", muted: "#3f3a6a",
    stem: "#4a6a88", leafFill: "#e8f4f8", flower: "#a5f3fc", flowerStroke: "#0b6b7a",
    bird: "#7a90b0", frame: "#b4c8dc",
  },
  {
    month: 2, id: "snow-twigs", name: "Snow twigs",
    paperTop: "#e8ecf8", paperMid: "#f5f6fb", paperBottom: "#ece8f6",
    ink: "#1e1b4b", soft: "#3d1779", muted: "#3f3a6a",
    stem: "#5a6a90", leafFill: "#eef2fa", flower: "#c4b5fd", flowerStroke: "#4a1b94",
    bird: "#8a90b8", frame: "#c0c4e0",
  },
  {
    month: 3, id: "almond-blossom", name: "Almond blossom",
    paperTop: "#ece6fb", paperMid: "#f8f5ff", paperBottom: "#f4eefc",
    ink: "#1e1b4b", soft: "#3d1779", muted: "#4a3d78",
    stem: "#6a5a98", leafFill: "#eee6fa", flower: "#ddd6fe", flowerStroke: "#6d28d9",
    bird: "#9d8ab0", frame: "#c4b5fd",
  },
  {
    month: 4, id: "spring-tulips", name: "Spring tulips",
    paperTop: "#f0e6fb", paperMid: "#faf6ff", paperBottom: "#f6eef8",
    ink: "#1e1b4b", soft: "#3d1779", muted: "#4a3d78",
    stem: "#5b4a8a", leafFill: "#f0e8fa", flower: "#e9d5ff", flowerStroke: "#6d28d9",
    bird: "#a78bfa", frame: "#d0c0f0",
  },
  {
    month: 5, id: "climbing-buds", name: "Climbing buds",
    paperTop: "#eee8fc", paperMid: "#f9f6ff", paperBottom: "#efe8fa",
    ink: "#1e1b4b", soft: "#3d1779", muted: "#4a3d78",
    stem: "#5729a7", leafFill: "#eee6fa", flower: "#ddd6fe", flowerStroke: "#5b21b6",
    bird: "#9d8ab0", frame: "#c4b5fd",
  },
  {
    month: 6, id: "summer-vines", name: "Summer vines",
    paperTop: "#e6eefc", paperMid: "#f4f8ff", paperBottom: "#e8f4f6",
    ink: "#1e1b4b", soft: "#3d1779", muted: "#3f3a6a",
    stem: "#3d6a88", leafFill: "#e4f4f4", flower: "#67e8f9", flowerStroke: "#0b6b7a",
    bird: "#5a8aa0", frame: "#a8d0dc",
  },
  {
    month: 7, id: "sunflowers", name: "Sunflowers",
    paperTop: "#e4f0f6", paperMid: "#f3f8fc", paperBottom: "#ece8fb",
    ink: "#1e1b4b", soft: "#3d1779", muted: "#3f3a6a",
    stem: "#4a5a98", leafFill: "#e8f0fb", flower: "#22d3ee", flowerStroke: "#5729a7",
    bird: "#7a90b8", frame: "#b0c4e8",
  },
  {
    month: 8, id: "palm-fronds", name: "Palm fronds",
    paperTop: "#e8e6fb", paperMid: "#f6f5ff", paperBottom: "#e6f2f4",
    ink: "#1e1b4b", soft: "#3d1779", muted: "#3f3a6a",
    stem: "#3d5a88", leafFill: "#e6f2f4", flower: "#67e8f9", flowerStroke: "#4a1b94",
    bird: "#7a90b0", frame: "#b8c8e0",
  },
  {
    month: 9, id: "falling-leaves", name: "Falling leaves",
    paperTop: "#eee6f6", paperMid: "#f8f4fb", paperBottom: "#f0e8f4",
    ink: "#1e1b4b", soft: "#3d1779", muted: "#4a3d78",
    stem: "#5a3d78", leafFill: "#eee4f4", flower: "#c4b5fd", flowerStroke: "#5b21b6",
    bird: "#8a7aa8", frame: "#c8b4d8",
  },
  {
    month: 10, id: "oak-acorns", name: "Oak and acorns",
    paperTop: "#ece4f4", paperMid: "#f7f3fa", paperBottom: "#ebe4f2",
    ink: "#1e1b4b", soft: "#3d1779", muted: "#4a3d78",
    stem: "#4c1d95", leafFill: "#eee4f4", flower: "#ddd6fe", flowerStroke: "#5b21b6",
    bird: "#8a7aa8", frame: "#c4b0d8",
  },
  {
    month: 11, id: "wheat-grain", name: "Wheat and grain",
    paperTop: "#e8e0f2", paperMid: "#f5f1f9", paperBottom: "#e6e0ee",
    ink: "#1e1b4b", soft: "#3d1779", muted: "#4a3d78",
    stem: "#5b21b6", leafFill: "#ece4f4", flower: "#c4b5fd", flowerStroke: "#4a1b94",
    bird: "#8a7aa8", frame: "#c0a8d4",
  },
  {
    month: 12, id: "pine-sprigs", name: "Pine sprigs",
    paperTop: "#e4eef6", paperMid: "#f3f7fb", paperBottom: "#e6eef4",
    ink: "#1e1b4b", soft: "#3d1779", muted: "#3f3a6a",
    stem: "#3d6a80", leafFill: "#e4f0f4", flower: "#a5f3fc", flowerStroke: "#0b6b7a",
    bird: "#6a88a0", frame: "#b0c8d4",
  },
] as const;

export function keepsakeDesignForMonth(month: number): KeepsakeDesign {
  const index = Math.min(12, Math.max(1, Math.floor(month))) - 1;
  return KEEPSAKE_DESIGNS[index]!;
}

export function keepsakeDesignForDay(finishedOn: string): KeepsakeDesign {
  const month = Number(finishedOn.slice(5, 7));
  return keepsakeDesignForMonth(Number.isFinite(month) ? month : 1);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatKeepsakeDate(day: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return day;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return day;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

export function keepsakeFilename(finishedOn: string) {
  return `qurandeck-finished-quran-${finishedOn}.png`;
}

export type KeepsakeCardInput = {
  finishedOn: string;
  days: number;
  ayahs: number;
  surahs: number;
};

export function keepsakeCardFromReading(reading: Pick<FinishedReading, "finishedOn" | "days" | "ayahs" | "surahs">): KeepsakeCardInput {
  return {
    finishedOn: reading.finishedOn,
    days: reading.days,
    ayahs: reading.ayahs,
    surahs: reading.surahs,
  };
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function n(value: number) {
  return Number(value.toFixed(1));
}

function birds(d: KeepsakeDesign, x1: number, y1: number, x2: number, y2: number) {
  return `<g fill="none" stroke="${d.bird}" stroke-width="0.9" stroke-linecap="round" opacity="0.55">
    <path d="M${x1} ${y1} c7 3.5 13 3.5 18 0 c-4.5 7 -11 9 -18 7"/>
    <path d="M${x2} ${y2} c5.5 2.8 10 2.6 14.5 0 c-3.4 5.6 -9 7.2 -14.5 5.5"/>
  </g>`;
}

function blossom(d: KeepsakeDesign, cx: number, cy: number, r: number) {
  return `<g fill="${d.flower}" stroke="${d.flowerStroke}" stroke-width="0.7">
    <circle cx="${n(cx)}" cy="${n(cy - r * 0.85)}" r="${n(r * 0.72)}"/>
    <circle cx="${n(cx - r * 0.8)}" cy="${n(cy - r * 0.15)}" r="${n(r * 0.7)}"/>
    <circle cx="${n(cx + r * 0.8)}" cy="${n(cy - r * 0.15)}" r="${n(r * 0.7)}"/>
    <circle cx="${n(cx - r * 0.5)}" cy="${n(cy + r * 0.7)}" r="${n(r * 0.62)}"/>
    <circle cx="${n(cx + r * 0.5)}" cy="${n(cy + r * 0.7)}" r="${n(r * 0.62)}"/>
    <circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.32)}" fill="${d.paperMid}" stroke="none"/>
  </g>`;
}

function bud(d: KeepsakeDesign, cx: number, cy: number, r: number, angle = 0) {
  return `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(r * 0.55)}" ry="${n(r)}" transform="rotate(${n(angle)} ${n(cx)} ${n(cy)})" fill="${d.flower}" stroke="${d.flowerStroke}" stroke-width="0.7"/>`;
}

function frost(d: KeepsakeDesign, dots: Array<[number, number, number?]>) {
  return `<g fill="${d.flower}" stroke="${d.flowerStroke}" stroke-width="0.45" opacity="0.85">${dots
    .map(([x, y, r = 1.6]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}"/>`)
    .join("")}</g>`;
}

function tulip(d: KeepsakeDesign, x: number, base: number, height: number, lean = 0) {
  const head = base - height;
  const tip = head - 16;
  const mid = (base + head) / 2;
  return `<g fill="none" stroke="${d.stem}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
    <path d="M${n(x)} ${n(base)} C${n(x + lean * 0.4)} ${n(mid)}, ${n(x + lean)} ${n(head + 8)}, ${n(x + lean)} ${n(head)}"/>
    <path d="M${n(x + lean * 0.3)} ${n(mid + 8)} C${n(x + lean * 0.3 - 14)} ${n(mid)}, ${n(x + lean * 0.3 - 8)} ${n(mid - 18)}, ${n(x + lean * 0.3)} ${n(mid - 6)}"/>
  </g>
  <path d="M${n(x + lean - 7)} ${n(head + 2)} C${n(x + lean - 8)} ${n(tip + 6)}, ${n(x + lean)} ${n(tip)}, ${n(x + lean)} ${n(head - 4)} C${n(x + lean)} ${n(tip)}, ${n(x + lean + 8)} ${n(tip + 6)}, ${n(x + lean + 7)} ${n(head + 2)} C${n(x + lean + 3)} ${n(head + 8)}, ${n(x + lean - 3)} ${n(head + 8)}, ${n(x + lean - 7)} ${n(head + 2)} Z" fill="${d.flower}" stroke="${d.flowerStroke}" stroke-width="0.8" stroke-linejoin="round"/>`;
}

function sunflower(d: KeepsakeDesign, cx: number, cy: number, r: number, petals = 14) {
  const parts: string[] = [];
  for (let i = 0; i < petals; i += 1) {
    const a = (i / petals) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + Math.cos(a) * r * 0.42;
    const y1 = cy + Math.sin(a) * r * 0.42;
    const x2 = cx + Math.cos(a) * r;
    const y2 = cy + Math.sin(a) * r;
    const nx = Math.cos(a + Math.PI / 2) * r * 0.2;
    const ny = Math.sin(a + Math.PI / 2) * r * 0.2;
    parts.push(`<path d="M${n(x1 + nx)} ${n(y1 + ny)} Q${n(x2)} ${n(y2)} ${n(x1 - nx)} ${n(y1 - ny)} Z"/>`);
  }
  return `<g fill="${d.leafFill}" stroke="${d.flowerStroke}" stroke-width="0.85" stroke-linejoin="round">
    ${parts.join("")}
    <circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.36)}" fill="${d.flower}" stroke="${d.stem}" stroke-width="0.9"/>
  </g>`;
}

function mapleLeaf(d: KeepsakeDesign, x: number, y: number, scale: number, angle: number) {
  return `<path transform="translate(${n(x)} ${n(y)}) rotate(${n(angle)}) scale(${n(scale)})" d="M0-18 C3-12 6-10 5-6 L14-10 L12-4 C16-2 16 4 10 6 L8 8 C10 14 6 16 2 12 L0 16 L-2 12 C-6 16-10 14-8 8 L-10 6 C-16 4-16-2-12-4 L-14-10 L-5-6 C-6-10-3-12 0-18 Z" fill="${d.leafFill}" stroke="${d.stem}" stroke-width="${n(0.9 / Math.max(scale, 0.6))}" stroke-linejoin="round"/>`;
}

function oakLeaf(d: KeepsakeDesign, x: number, y: number, scale: number, angle: number) {
  return `<path transform="translate(${n(x)} ${n(y)}) rotate(${n(angle)}) scale(${n(scale)})" d="M0-20 C6-16 8-10 6-6 C12-8 14-2 8 0 C14 2 12 8 6 8 C8 14 4 18 0 20 C-4 18-8 14-6 8 C-12 8-14 2-8 0 C-14-2-12-8-6-6 C-8-10-6-16 0-20 Z" fill="${d.leafFill}" stroke="${d.stem}" stroke-width="${n(0.9 / Math.max(scale, 0.6))}" stroke-linejoin="round"/>`;
}

function acorn(d: KeepsakeDesign, x: number, y: number, scale: number, angle = 0) {
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(angle)}) scale(${n(scale)})" fill="${d.flower}" stroke="${d.flowerStroke}" stroke-width="${n(0.8 / Math.max(scale, 0.6))}" stroke-linejoin="round">
    <ellipse cx="0" cy="5" rx="5.2" ry="7"/>
    <path d="M-6 0 C-5-5 5-5 6 0 Z" fill="${d.leafFill}" stroke="${d.stem}"/>
    <path d="M0-5 V-9" fill="none" stroke="${d.stem}" stroke-linecap="round"/>
  </g>`;
}

function wheat(d: KeepsakeDesign, x: number, base: number, height: number, lean = 0) {
  const tip = base - height;
  const head = tip + height * 0.38;
  const grains: string[] = [];
  const steps = 7;
  for (let i = 0; i < steps; i += 1) {
    const t = i / (steps - 1);
    const y = head + (tip + 4 - head) * t;
    const xAt = x + lean * (1 - (y - tip) / height);
    const len = 6 + t * 2;
    grains.push(`<path d="M${n(xAt)} ${n(y)} L${n(xAt - len)} ${n(y - 3)}"/>`);
    grains.push(`<path d="M${n(xAt)} ${n(y)} L${n(xAt + len)} ${n(y - 3)}"/>`);
    if (i >= steps - 3) {
      grains.push(`<path d="M${n(xAt)} ${n(y)} L${n(xAt - 2)} ${n(y - 10)}"/>`);
      grains.push(`<path d="M${n(xAt)} ${n(y)} L${n(xAt + 2)} ${n(y - 10)}"/>`);
    }
  }
  return `<g fill="none" stroke="${d.stem}" stroke-width="1" stroke-linecap="round">
    <path d="M${n(x)} ${n(base)} C${n(x + lean * 0.4)} ${n((base + head) / 2)}, ${n(x + lean * 0.8)} ${n(head)}, ${n(x + lean)} ${n(tip)}"/>
    ${grains.join("")}
  </g>`;
}

function pineSprig(d: KeepsakeDesign, x: number, y: number, length: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  const ex = x + Math.cos(rad) * length;
  const ey = y + Math.sin(rad) * length;
  const needles: string[] = [];
  const count = Math.max(5, Math.round(length / 7));
  for (let i = 1; i <= count; i += 1) {
    const t = i / (count + 0.3);
    const px = x + (ex - x) * t;
    const py = y + (ey - y) * t;
    const len = 7 + (i % 3);
    const a1 = rad + 0.7;
    const a2 = rad - 0.7;
    needles.push(`<path d="M${n(px)} ${n(py)} L${n(px + Math.cos(a1) * len)} ${n(py + Math.sin(a1) * len)}"/>`);
    needles.push(`<path d="M${n(px)} ${n(py)} L${n(px + Math.cos(a2) * len)} ${n(py + Math.sin(a2) * len)}"/>`);
  }
  return `<g fill="none" stroke="${d.stem}" stroke-width="1" stroke-linecap="round">
    <path d="M${n(x)} ${n(y)} L${n(ex)} ${n(ey)}"/>
    ${needles.join("")}
  </g>`;
}

function palmFrond(d: KeepsakeDesign, x: number, y: number, length: number, angle: number, curve = 28) {
  const rad = (angle * Math.PI) / 180;
  const ex = x + Math.cos(rad) * length;
  const ey = y + Math.sin(rad) * length;
  const cx = (x + ex) / 2 + Math.cos(rad + Math.PI / 2) * curve;
  const cy = (y + ey) / 2 + Math.sin(rad + Math.PI / 2) * curve;
  const leaflets: string[] = [];
  const count = 9;
  for (let i = 1; i <= count; i += 1) {
    const t = i / (count + 0.5);
    const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * ex;
    const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * ey;
    const tx = 2 * (1 - t) * (cx - x) + 2 * t * (ex - cx);
    const ty = 2 * (1 - t) * (cy - y) + 2 * t * (ey - cy);
    const mag = Math.hypot(tx, ty) || 1;
    const nx = -ty / mag;
    const ny = tx / mag;
    const len = 16 + (1 - Math.abs(t - 0.5) * 1.4) * 10;
    leaflets.push(`<path d="M${n(px)} ${n(py)} L${n(px + nx * len)} ${n(py + ny * len)}"/>`);
    leaflets.push(`<path d="M${n(px)} ${n(py)} L${n(px - nx * len * 0.95)} ${n(py - ny * len * 0.95)}"/>`);
  }
  return `<g fill="none" stroke="${d.stem}" stroke-width="1" stroke-linecap="round">
    <path d="M${n(x)} ${n(y)} Q${n(cx)} ${n(cy)} ${n(ex)} ${n(ey)}"/>
    ${leaflets.join("")}
  </g>`;
}

function oliveLeaf(d: KeepsakeDesign, x: number, y: number, scale: number, angle: number) {
  return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(4.2 * scale)}" ry="${n(11 * scale)}" transform="rotate(${n(angle)} ${n(x)} ${n(y)})" fill="${d.leafFill}" stroke="${d.stem}" stroke-width="0.85"/>`;
}

/** Motif art must stay out of these boxes so it does not touch the stats line or the site footer. */
export const KEEPSAKE_STATS_CLEAR = { x: 48, y: 378, width: 304, height: 36 } as const;
export const KEEPSAKE_FOOTER_CLEAR = { x: 100, y: 504, width: 200, height: 36 } as const;

/** Quiet line-art motif for one month. No people, buildings, symbols, or text in the art. */
export function keepsakeMotif(design: KeepsakeDesign): string {
  const d = design;
  switch (d.month) {
    case 1:
      return `${birds(d, 240, 58, 300, 72)}
        <g fill="none" stroke="${d.stem}" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 128 C70 96, 110 128, 148 108"/>
          <path d="M70 114 L96 78"/>
          <path d="M104 118 L132 72"/>
          <path d="M88 122 L84 86"/>
          <path d="M382 470 C350 492, 340 450, 318 462"/>
          <path d="M348 478 L360 430"/>
          <path d="M332 468 L322 428"/>
          <path d="M360 486 L372 448"/>
          <path d="M382 96 C340 80, 312 118, 278 98"/>
          <path d="M340 90 L352 60"/>
          <path d="M318 100 L300 68"/>
        </g>
        ${frost(d, [[96, 76, 1.7], [132, 70, 2], [84, 84, 1.3], [148, 106, 1.5], [60, 108, 1.2], [360, 428, 1.8], [322, 426, 1.5], [372, 446, 1.4], [318, 462, 1.6], [200, 90, 1.2], [170, 64, 1.1], [370, 500, 1.3], [352, 58, 1.6], [300, 66, 1.4], [278, 96, 1.3], [330, 84, 1.2]])}`;
    case 2:
      return `${birds(d, 60, 90, 330, 100)}
        <g fill="none" stroke="${d.stem}" stroke-width="1.05" stroke-linecap="round">
          <path d="M200 42 L200 70"/>
          <path d="M200 70 L86 138"/>
          <path d="M200 70 L128 148"/>
          <path d="M200 70 L164 154"/>
          <path d="M200 70 L200 150"/>
          <path d="M200 70 L236 154"/>
          <path d="M200 70 L272 148"/>
          <path d="M200 70 L314 138"/>
          <path d="M86 138 L70 152"/>
          <path d="M314 138 L330 152"/>
          <path d="M40 500 L40 536"/>
          <path d="M58 490 L62 536"/>
          <path d="M76 506 L76 538"/>
          <path d="M324 506 L324 538"/>
          <path d="M342 490 L338 536"/>
          <path d="M360 500 L360 536"/>
        </g>
        ${frost(d, [[200, 42, 2.2], [86, 136, 1.6], [314, 136, 1.6], [164, 152, 1.3], [236, 152, 1.3], [70, 150, 1.2], [330, 150, 1.2], [40, 498, 1.4], [76, 504, 1.3], [324, 504, 1.3], [360, 498, 1.4]])}`;
    case 3:
      return `${birds(d, 40, 70, 80, 96)}
        <g fill="none" stroke="${d.stem}" stroke-width="1.05" stroke-linecap="round">
          <path d="M16 118 C90 64, 210 86, 384 70"/>
          <path d="M120 90 L108 60"/>
          <path d="M200 82 L218 52"/>
          <path d="M290 78 L278 48"/>
          <path d="M384 500 C360 468, 348 490, 332 458"/>
          <path d="M16 522 C44 498, 58 532, 76 500"/>
        </g>
        ${oliveLeaf(d, 108, 72, 0.7, -40)}${oliveLeaf(d, 218, 62, 0.65, 30)}${oliveLeaf(d, 278, 58, 0.6, -20)}
        ${blossom(d, 70, 96, 6.2)}${blossom(d, 150, 78, 5.6)}${blossom(d, 248, 68, 6.4)}${blossom(d, 340, 66, 5.8)}
        ${bud(d, 108, 58, 3.4, -20)}${bud(d, 290, 50, 3.2, 15)}${blossom(d, 350, 488, 5.2)}${blossom(d, 370, 518, 4.6)}${bud(d, 44, 512, 3, 25)}${blossom(d, 56, 488, 4.4)}`;
    case 4:
      return `${birds(d, 170, 64, 230, 52)}
        ${tulip(d, 40, 548, 96, -4)}${tulip(d, 64, 548, 110, 6)}${tulip(d, 84, 548, 78, 2)}
        ${tulip(d, 316, 548, 80, -6)}${tulip(d, 336, 548, 110, 4)}${tulip(d, 360, 548, 96, 8)}
        ${tulip(d, 52, 168, 86, 10)}${tulip(d, 348, 168, 90, -12)}
        ${bud(d, 200, 58, 3.6, 0)}`;
    case 5:
      return `${birds(d, 200, 70, 250, 58)}
        <g fill="none" stroke="${d.stem}" stroke-width="1.05" stroke-linecap="round">
          <path d="M40 530 C28 400, 58 280, 36 170 C24 110, 54 70, 44 36"/>
          <path d="M36 170 C70 150, 74 190, 50 200"/>
          <path d="M40 300 C72 284, 76 320, 48 332"/>
          <path d="M38 430 C68 414, 74 452, 46 460"/>
          <path d="M368 28 C380 110, 340 180, 372 250"/>
          <path d="M360 90 C330 80, 324 114, 352 120"/>
          <path d="M366 170 C336 158, 330 196, 358 204"/>
        </g>
        ${oliveLeaf(d, 62, 186, 0.7, 40)}${oliveLeaf(d, 64, 316, 0.75, 50)}${oliveLeaf(d, 62, 446, 0.7, 42)}
        ${oliveLeaf(d, 340, 100, 0.7, -40)}${oliveLeaf(d, 344, 186, 0.7, -48)}
        ${bud(d, 44, 40, 3.8, -10)}${blossom(d, 40, 120, 5)}${bud(d, 48, 250, 3.6, 8)}${blossom(d, 42, 370, 4.6)}${bud(d, 44, 500, 3.4, 12)}
        ${blossom(d, 368, 36, 5.6)}${blossom(d, 364, 128, 5)}${bud(d, 370, 210, 3.8, -8)}${blossom(d, 350, 488, 4.8)}${bud(d, 360, 532, 3.4, 20)}`;
    case 6:
      return `${birds(d, 150, 90, 210, 74)}
        <g fill="none" stroke="${d.stem}" stroke-width="1.1" stroke-linecap="round">
          <path d="M24 520 C18 360, 58 240, 26 120 C10 60, 48 36, 90 48 C160 64, 240 36, 320 58 C360 70, 384 100, 372 150"/>
          <path d="M26 200 C62 180, 70 224, 34 236"/>
          <path d="M30 340 C68 322, 74 366, 38 376"/>
          <path d="M28 460 C64 442, 70 486, 36 496"/>
        </g>
        ${oliveLeaf(d, 54, 80, 0.85, -30)}${oliveLeaf(d, 140, 52, 0.8, 20)}${oliveLeaf(d, 220, 46, 0.75, -15)}${oliveLeaf(d, 300, 56, 0.8, 25)}
        ${oliveLeaf(d, 50, 214, 0.8, 50)}${oliveLeaf(d, 56, 354, 0.85, 55)}${oliveLeaf(d, 54, 474, 0.8, 50)}
        ${oliveLeaf(d, 360, 130, 0.75, -40)}
        ${blossom(d, 90, 50, 4.8)}${blossom(d, 180, 44, 5.2)}${blossom(d, 270, 48, 4.4)}${blossom(d, 348, 90, 4)}
        ${blossom(d, 32, 160, 3.8)}${blossom(d, 34, 280, 4.2)}${blossom(d, 32, 400, 3.6)}
        ${blossom(d, 350, 488, 4.6)}${blossom(d, 364, 530, 3.8)}`;
    case 7:
      return `${birds(d, 200, 48, 250, 40)}
        ${sunflower(d, 96, 96, 36, 16)}
        ${sunflower(d, 330, 72, 22, 14)}
        ${sunflower(d, 340, 468, 26, 15)}
        <g fill="none" stroke="${d.stem}" stroke-width="1.05" stroke-linecap="round">
          <path d="M96 132 C36 230, 34 360, 32 520"/>
          <path d="M340 494 C352 528, 370 548, 378 520"/>
        </g>
        ${oliveLeaf(d, 58, 240, 1.15, 55)}${oliveLeaf(d, 52, 340, 1.05, -50)}`;
    case 8:
      return `${birds(d, 200, 86, 250, 70)}
        ${palmFrond(d, 28, 36, 210, 18, 36)}
        ${palmFrond(d, 8, 70, 160, 38, 22)}
        ${palmFrond(d, 382, 545, 100, -95, 18)}
        ${palmFrond(d, 394, 510, 90, -80, 14)}
        ${oliveLeaf(d, 40, 300, 0.85, 40)}${oliveLeaf(d, 36, 340, 0.8, 18)}${oliveLeaf(d, 38, 440, 0.75, 50)}`;
    case 9:
      return `${birds(d, 180, 70, 230, 56)}
        ${mapleLeaf(d, 64, 70, 1.15, -28)}
        ${mapleLeaf(d, 140, 48, 0.8, 18)}
        ${mapleLeaf(d, 260, 58, 0.7, -40)}
        ${mapleLeaf(d, 340, 86, 1.05, 22)}
        ${mapleLeaf(d, 40, 200, 0.75, -55)}
        ${mapleLeaf(d, 36, 320, 0.9, 12)}
        ${mapleLeaf(d, 360, 240, 0.7, -20)}
        ${mapleLeaf(d, 368, 360, 0.85, 40)}
        ${mapleLeaf(d, 58, 470, 1, -15)}
        ${mapleLeaf(d, 48, 515, 0.75, 20)}
        ${mapleLeaf(d, 348, 475, 0.95, -35)}
        ${mapleLeaf(d, 352, 515, 0.8, 18)}`;
    case 10:
      return `${birds(d, 40, 80, 90, 100)}
        <g fill="none" stroke="${d.stem}" stroke-width="1.15" stroke-linecap="round">
          <path d="M-4 96 C80 70, 200 118, 404 78"/>
          <path d="M120 86 L110 54"/>
          <path d="M220 100 L236 64"/>
          <path d="M310 88 L300 52"/>
        </g>
        ${oakLeaf(d, 70, 70, 0.95, -70)}
        ${oakLeaf(d, 150, 64, 0.85, -20)}
        ${oakLeaf(d, 250, 72, 1, 30)}
        ${oakLeaf(d, 350, 62, 0.9, -15)}
        ${acorn(d, 180, 118, 1.05, 8)}
        ${acorn(d, 280, 112, 0.95, -12)}
        ${acorn(d, 100, 110, 0.85, 16)}
        ${oakLeaf(d, 60, 485, 1.05, -40)}
        ${oakLeaf(d, 46, 522, 0.8, 25)}
        ${acorn(d, 350, 500, 1, -20)}`;
    case 11:
      return `${birds(d, 160, 64, 220, 52)}
        ${wheat(d, 48, 176, 130, -8)}
        ${wheat(d, 72, 168, 112, 10)}
        ${wheat(d, 328, 168, 120, -10)}
        ${wheat(d, 356, 176, 128, 8)}
        ${wheat(d, 40, 548, 118, 8)}
        ${wheat(d, 64, 548, 126, -6)}
        ${wheat(d, 86, 548, 100, 10)}
        ${wheat(d, 314, 548, 108, -10)}
        ${wheat(d, 336, 548, 126, 6)}
        ${wheat(d, 360, 548, 112, -8)}`;
    default:
      return `${birds(d, 160, 80, 220, 64)}
        ${pineSprig(d, 36, 28, 130, 58)}
        ${pineSprig(d, 20, 50, 90, 78)}
        ${pineSprig(d, 364, 28, 140, 122)}
        ${pineSprig(d, 60, 548, 90, -85)}
        ${pineSprig(d, 40, 545, 70, -70)}
        ${pineSprig(d, 340, 548, 90, -95)}
        ${pineSprig(d, 360, 545, 70, -110)}
        ${frost(d, [[70, 80, 1.5], [100, 110, 1.3], [330, 90, 1.6], [300, 120, 1.2], [50, 500, 1.4], [80, 480, 1.3], [350, 500, 1.2], [320, 480, 1.3]])}`;
  }
}

export function keepsakeSvg(input: KeepsakeCardInput, design = keepsakeDesignForDay(input.finishedOn)): string {
  const date = escapeXml(formatKeepsakeDate(input.finishedOn));
  const days = `${Math.max(1, Math.floor(input.days)).toLocaleString("en-US")} days`;
  const ayahs = `${Math.max(0, Math.floor(input.ayahs)).toLocaleString("en-US")} ayahs`;
  const surahs = `${Math.max(0, Math.floor(input.surahs)).toLocaleString("en-US")} surahs`;
  const motif = keepsakeMotif(design);
  const paperId = `keepsake-paper-${design.month}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560" width="400" height="560" role="img" aria-label="You finished the Quran">
  <defs>
    <linearGradient id="${paperId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${design.paperTop}"/>
      <stop offset="0.4" stop-color="${design.paperMid}"/>
      <stop offset="1" stop-color="${design.paperBottom}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="560" rx="28" fill="url(#${paperId})"/>
  <rect x="16" y="16" width="368" height="528" rx="20" fill="none" stroke="${design.frame}" stroke-width="1"/>
  <rect x="22" y="22" width="356" height="516" rx="16" fill="none" stroke="${design.paperBottom}" stroke-width="0.7"/>
  ${motif}
  <text x="200" y="200" text-anchor="middle" fill="${design.soft}" font-family="Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif" font-size="11" font-weight="650" letter-spacing="1.6">A READING FINISHED</text>
  <text x="200" y="248" text-anchor="middle" fill="${design.ink}" font-family="Source Serif 4, Georgia, serif" font-size="30" font-weight="600">You finished</text>
  <text x="200" y="284" text-anchor="middle" fill="${design.ink}" font-family="Source Serif 4, Georgia, serif" font-size="30" font-weight="600">the Quran</text>
  <text x="200" y="318" text-anchor="middle" fill="${design.soft}" font-family="Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif" font-size="15" font-weight="500">May Allah accept it.</text>
  <line x1="176" y1="340" x2="224" y2="340" stroke="${design.frame}" stroke-width="1"/>
  <text x="200" y="366" text-anchor="middle" fill="${design.ink}" font-family="Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif" font-size="14" font-weight="650">${date}</text>
  <text x="200" y="396" text-anchor="middle" fill="${design.soft}" font-family="Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif" font-size="12" font-weight="600">${escapeXml(days)}  ·  ${escapeXml(ayahs)}  ·  ${escapeXml(surahs)}</text>
  <text x="200" y="524" text-anchor="middle" fill="${design.muted}" font-family="Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif" font-size="10" font-weight="650" letter-spacing="0.8">qurandeck.com</text>
</svg>`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not draw the card."));
    image.src = url;
  });
}

export async function renderKeepsakePng(input: KeepsakeCardInput, scale = 3): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("The card can only be saved in the browser.");
  }
  if (typeof document.fonts?.ready === "object") await document.fonts.ready;
  const svg = keepsakeSvg(input);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = 400 * scale;
    canvas.height = 560 * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not save the card.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Could not save the card.");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareOrDownloadKeepsake(input: KeepsakeCardInput): Promise<"shared" | "downloaded" | "aborted"> {
  const filename = keepsakeFilename(input.finishedOn);
  const blob = await renderKeepsakePng(input);
  const file = new File([blob], filename, { type: "image/png" });
  const payload = { files: [file], title: "You finished the Quran", text: "A reading finished on QuranDeck. qurandeck.com" };
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      const can = typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] });
      if (can) {
        await navigator.share(payload);
        return "shared";
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "aborted";
  }
  downloadBlob(blob, filename);
  return "downloaded";
}
