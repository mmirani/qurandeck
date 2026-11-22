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
  stem: string;
  leafFill: string;
  flower: string;
  flowerStroke: string;
  bird: string;
  frame: string;
};

export const KEEPSAKE_DESIGNS: readonly KeepsakeDesign[] = [
  { month: 1, id: "winter-twigs", name: "Winter twigs", paperTop: "#f3eef8", paperMid: "#faf7f4", paperBottom: "#f4eee8", ink: "#2a1838", soft: "#5a2e4a", stem: "#8a6574", leafFill: "#f3e4e6", flower: "#e8bec3", flowerStroke: "#b56b78", bird: "#9d8ab0", frame: "#d4b8c4" },
  { month: 2, id: "rose-buds", name: "Rose buds", paperTop: "#f8eef2", paperMid: "#fbf6f4", paperBottom: "#f6ebe6", ink: "#2a1838", soft: "#5a2e4a", stem: "#8a5d6c", leafFill: "#f6e4e8", flower: "#e4a8b4", flowerStroke: "#b45a6a", bird: "#c4a0b4", frame: "#e0c0cc" },
  { month: 3, id: "opening-branch", name: "Opening branch", paperTop: "#f2eef8", paperMid: "#faf7f2", paperBottom: "#f3efe6", ink: "#2a1838", soft: "#5a2e4a", stem: "#7e6570", leafFill: "#efe6dc", flower: "#efc4c8", flowerStroke: "#b56b78", bird: "#9d8ab0", frame: "#d4b8c4" },
  { month: 4, id: "spring-wreath", name: "Spring wreath", paperTop: "#f4eef8", paperMid: "#faf6f1", paperBottom: "#f7ebe6", ink: "#2a1838", soft: "#5a2e4a", stem: "#8a6574", leafFill: "#f3e4e6", flower: "#e8bec3", flowerStroke: "#b56b78", bird: "#9d8ab0", frame: "#d4b8c4" },
  { month: 5, id: "tall-sprays", name: "Tall sprays", paperTop: "#f0eef6", paperMid: "#f8f6f1", paperBottom: "#f3efe8", ink: "#2a1838", soft: "#5a2e4a", stem: "#7a6860", leafFill: "#efe6da", flower: "#e6c0b8", flowerStroke: "#a87470", bird: "#9d8ab0", frame: "#d4c0bc" },
  { month: 6, id: "june-garland", name: "June garland", paperTop: "#f3eef6", paperMid: "#faf7f2", paperBottom: "#f6eee8", ink: "#2a1838", soft: "#5a2e4a", stem: "#7e6a68", leafFill: "#f0e4dc", flower: "#e8b8c0", flowerStroke: "#b56b78", bird: "#9d8ab0", frame: "#d8c0c4" },
  { month: 7, id: "open-corners", name: "Open corners", paperTop: "#f6f0f6", paperMid: "#fbf8f4", paperBottom: "#f7f0ea", ink: "#2a1838", soft: "#5a2e4a", stem: "#8a6574", leafFill: "#f3e4e6", flower: "#e8bec3", flowerStroke: "#b56b78", bird: "#9d8ab0", frame: "#dcc8d0" },
  { month: 8, id: "late-berries", name: "Late berries", paperTop: "#f6eef2", paperMid: "#faf6f2", paperBottom: "#f4ebe6", ink: "#2a1838", soft: "#5a2e4a", stem: "#7a5e62", leafFill: "#f0e0dc", flower: "#c97880", flowerStroke: "#a0505c", bird: "#b090a4", frame: "#d4b8c0" },
  { month: 9, id: "drooping-leaves", name: "Drooping leaves", paperTop: "#f5efe8", paperMid: "#faf6f1", paperBottom: "#f3e8e0", ink: "#2a1838", soft: "#5a2e4a", stem: "#7a6558", leafFill: "#edd8c8", flower: "#d8a090", flowerStroke: "#a07060", bird: "#a0909c", frame: "#d4c0b4" },
  { month: 10, id: "autumn-gate", name: "Autumn gate", paperTop: "#f4eee8", paperMid: "#faf6f1", paperBottom: "#f2e8e2", ink: "#2a1838", soft: "#5a2e4a", stem: "#7a5e58", leafFill: "#e8d0c4", flower: "#d4a098", flowerStroke: "#a06860", bird: "#a08890", frame: "#d4c0b8" },
  { month: 11, id: "bookplate", name: "Bookplate", paperTop: "#f4eef8", paperMid: "#faf6f1", paperBottom: "#f7ebe6", ink: "#2a1838", soft: "#5a2e4a", stem: "#8a6574", leafFill: "#f3e4e6", flower: "#e8bec3", flowerStroke: "#b56b78", bird: "#9d8ab0", frame: "#d4b8c4" },
  { month: 12, id: "evergreen-sprigs", name: "Evergreen sprigs", paperTop: "#eef0f6", paperMid: "#f7f6f4", paperBottom: "#f0ebe8", ink: "#2a1838", soft: "#5a2e4a", stem: "#5e6a68", leafFill: "#dce6e0", flower: "#c8b8c4", flowerStroke: "#8a7078", bird: "#8a90a4", frame: "#c8c4cc" },
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

function birds(d: KeepsakeDesign, x1: number, y1: number, x2: number, y2: number) {
  return `<g fill="none" stroke="${d.bird}" stroke-width="0.9" stroke-linecap="round" opacity="0.55">
    <path d="M${x1} ${y1} c7 3.5 13 3.5 18 0 c-4.5 7 -11 9 -18 7"/>
    <path d="M${x2} ${y2} c5.5 2.8 10 2.6 14.5 0 c-3.4 5.6 -9 7.2 -14.5 5.5"/>
  </g>`;
}

function flower(d: KeepsakeDesign, cx: number, cy: number, r: number) {
  return `<g fill="${d.flower}" stroke="${d.flowerStroke}" stroke-width="0.7">
    <circle cx="${cx}" cy="${cy - r * 0.85}" r="${r * 0.72}"/>
    <circle cx="${cx - r * 0.8}" cy="${cy - r * 0.15}" r="${r * 0.7}"/>
    <circle cx="${cx + r * 0.8}" cy="${cy - r * 0.15}" r="${r * 0.7}"/>
    <circle cx="${cx - r * 0.5}" cy="${cy + r * 0.7}" r="${r * 0.62}"/>
    <circle cx="${cx + r * 0.5}" cy="${cy + r * 0.7}" r="${r * 0.62}"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.32}" fill="#f7ece8" stroke="none"/>
  </g>`;
}

function berry(d: KeepsakeDesign, cx: number, cy: number, r: number) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${d.flower}" stroke="${d.flowerStroke}" stroke-width="0.6"/>`;
}

/** Quiet line-art motif for one month. No people, buildings, symbols, or text in the art. */
export function keepsakeMotif(design: KeepsakeDesign): string {
  const d = design;
  const leaf = `fill="${d.leafFill}" stroke="${d.stem}" stroke-width="0.9" stroke-linejoin="round"`;
  switch (d.month) {
    case 1:
      return `${birds(d, 150, 72, 242, 64)}
        <g fill="none" stroke="${d.stem}" stroke-width="1.05" stroke-linecap="round">
          <path d="M70 140 C90 80, 130 70, 160 110"/>
          <path d="M330 140 C310 80, 270 70, 240 110"/>
          <path d="M90 430 C120 500, 170 520, 200 470"/>
          <path d="M310 430 C280 500, 230 520, 200 470"/>
        </g>
        <g ${leaf}>
          <path d="M96 100 C90 88, 108 84, 110 96 Z"/>
          <path d="M300 100 C306 88, 288 84, 286 96 Z"/>
          <path d="M118 460 C110 474, 128 478, 130 466 Z"/>
          <path d="M282 460 C290 474, 272 478, 270 466 Z"/>
        </g>
        ${flower(d, 200, 78, 4.2)}`;
    case 2:
      return `${birds(d, 128, 80, 250, 70)}
        <g fill="none" stroke="${d.stem}" stroke-width="1.05" stroke-linecap="round">
          <path d="M200 50 C150 90, 110 120, 88 150"/>
          <path d="M200 50 C250 90, 290 120, 312 150"/>
          <path d="M200 510 C150 470, 110 440, 88 410"/>
          <path d="M200 510 C250 470, 290 440, 312 410"/>
        </g>
        ${flower(d, 200, 58, 6.4)}${flower(d, 118, 118, 5)}${flower(d, 282, 118, 5)}
        ${flower(d, 200, 508, 5.4)}${flower(d, 118, 442, 4.4)}${flower(d, 282, 442, 4.4)}
        <g ${leaf}>
          <path d="M150 90 C142 76, 162 72, 164 86 Z"/>
          <path d="M250 90 C258 76, 238 72, 236 86 Z"/>
        </g>`;
    case 3:
      return `${birds(d, 220, 70, 280, 86)}
        <g fill="none" stroke="${d.stem}" stroke-width="1.1" stroke-linecap="round">
          <path d="M40 150 C120 70, 220 55, 350 120"/>
          <path d="M40 410 C120 490, 220 505, 350 440"/>
        </g>
        <g ${leaf}>
          <path d="M110 110 C98 96, 122 88, 128 104 Z"/>
          <path d="M200 72 C190 56, 214 54, 216 70 Z"/>
          <path d="M110 450 C98 464, 122 472, 128 456 Z"/>
          <path d="M200 488 C190 504, 214 506, 216 490 Z"/>
        </g>
        ${flower(d, 300, 80, 5.2)}${flower(d, 160, 90, 4.2)}${flower(d, 250, 480, 4.6)}`;
    case 4:
      return `${birds(d, 154, 78, 230, 70)}
        <g fill="none" stroke="${d.stem}" stroke-width="1.05" stroke-linecap="round">
          <path d="M58 128 C110 58, 290 58, 342 128"/>
          <path d="M58 432 C110 502, 290 502, 342 432"/>
        </g>
        <g ${leaf}>
          <path d="M90 108 C80 92, 102 86, 108 102 Z"/>
          <path d="M140 80 C132 64, 154 62, 156 78 Z"/>
          <path d="M200 64 C194 50, 214 50, 214 64 Z"/>
          <path d="M260 80 C268 64, 246 62, 244 78 Z"/>
          <path d="M310 108 C320 92, 298 86, 292 102 Z"/>
          <path d="M90 452 C80 468, 102 474, 108 458 Z"/>
          <path d="M140 480 C132 496, 154 498, 156 482 Z"/>
          <path d="M200 496 C194 510, 214 510, 214 496 Z"/>
          <path d="M260 480 C268 496, 246 498, 244 482 Z"/>
          <path d="M310 452 C320 468, 298 474, 292 458 Z"/>
        </g>
        ${flower(d, 200, 62, 6.2)}${flower(d, 86, 112, 4.4)}${flower(d, 314, 112, 4.4)}
        ${flower(d, 200, 498, 5.4)}${flower(d, 90, 448, 4.2)}${flower(d, 310, 448, 4.2)}`;
    case 5:
      return `${birds(d, 160, 68, 236, 60)}
        <g fill="none" stroke="${d.stem}" stroke-width="1.05" stroke-linecap="round">
          <path d="M80 500 C70 360, 90 200, 80 80"/>
          <path d="M320 500 C330 360, 310 200, 320 80"/>
          <path d="M80 80 C120 60, 160 90, 200 70"/>
          <path d="M320 80 C280 60, 240 90, 200 70"/>
        </g>
        <g ${leaf}>
          <path d="M70 200 C58 186, 80 174, 86 190 Z"/>
          <path d="M96 300 C84 286, 108 276, 112 292 Z"/>
          <path d="M330 200 C342 186, 320 174, 314 190 Z"/>
          <path d="M304 300 C316 286, 292 276, 288 292 Z"/>
          <path d="M70 400 C56 388, 78 374, 86 390 Z"/>
          <path d="M330 400 C344 388, 322 374, 314 390 Z"/>
        </g>
        ${flower(d, 200, 68, 5)}${flower(d, 80, 80, 4.4)}${flower(d, 320, 80, 4.4)}
        ${flower(d, 80, 500, 3.8)}${flower(d, 320, 500, 3.8)}`;
    case 6:
      return `${birds(d, 148, 86, 248, 78)}
        <g fill="none" stroke="${d.stem}" stroke-width="1.1" stroke-linecap="round">
          <path d="M40 160 C120 80, 280 80, 360 160"/>
          <path d="M40 400 C120 480, 280 480, 360 400"/>
          <path d="M60 180 C40 240, 40 320, 60 380"/>
          <path d="M340 180 C360 240, 360 320, 340 380"/>
        </g>
        <g ${leaf}>
          <path d="M100 120 C88 104, 112 96, 118 114 Z"/>
          <path d="M200 90 C190 74, 218 74, 216 92 Z"/>
          <path d="M300 120 C312 104, 288 96, 282 114 Z"/>
          <path d="M100 440 C88 456, 112 464, 118 446 Z"/>
          <path d="M200 470 C190 486, 218 486, 216 468 Z"/>
          <path d="M300 440 C312 456, 288 464, 282 446 Z"/>
        </g>
        ${flower(d, 200, 86, 5.8)}${flower(d, 70, 150, 4.2)}${flower(d, 330, 150, 4.2)}
        ${flower(d, 200, 474, 5)}${flower(d, 70, 410, 4)}${flower(d, 330, 410, 4)}`;
    case 7:
      return `${birds(d, 170, 90, 226, 82)}
        <g fill="none" stroke="${d.stem}" stroke-width="1" stroke-linecap="round">
          <path d="M36 36 C70 40, 86 80, 70 110"/>
          <path d="M364 36 C330 40, 314 80, 330 110"/>
          <path d="M36 524 C70 520, 86 480, 70 450"/>
          <path d="M364 524 C330 520, 314 480, 330 450"/>
        </g>
        <g ${leaf}>
          <path d="M58 70 C50 56, 70 52, 72 66 Z"/>
          <path d="M342 70 C350 56, 330 52, 328 66 Z"/>
          <path d="M58 490 C50 504, 70 508, 72 494 Z"/>
          <path d="M342 490 C350 504, 330 508, 328 494 Z"/>
        </g>
        ${flower(d, 64, 48, 4.2)}${flower(d, 336, 48, 4.2)}
        ${flower(d, 64, 512, 3.8)}${flower(d, 336, 512, 3.8)}`;
    case 8:
      return `${birds(d, 150, 76, 240, 68)}
        <g fill="none" stroke="${d.stem}" stroke-width="1.05" stroke-linecap="round">
          <path d="M70 130 C130 70, 200 90, 200 150"/>
          <path d="M330 130 C270 70, 200 90, 200 150"/>
          <path d="M70 430 C130 490, 200 470, 200 410"/>
          <path d="M330 430 C270 490, 200 470, 200 410"/>
        </g>
        <g ${leaf}>
          <path d="M110 110 C100 96, 122 92, 124 106 Z"/>
          <path d="M290 110 C300 96, 278 92, 276 106 Z"/>
          <path d="M110 450 C100 464, 122 468, 124 454 Z"/>
          <path d="M290 450 C300 464, 278 468, 276 454 Z"/>
        </g>
        ${berry(d, 90, 128, 3.2)}${berry(d, 120, 148, 2.6)}${berry(d, 310, 128, 3.2)}${berry(d, 280, 148, 2.6)}
        ${berry(d, 90, 432, 3.2)}${berry(d, 120, 412, 2.6)}${berry(d, 310, 432, 3.2)}${berry(d, 280, 412, 2.6)}
        ${flower(d, 200, 70, 4.6)}`;
    case 9:
      return `${birds(d, 156, 74, 234, 66)}
        <g fill="none" stroke="${d.stem}" stroke-width="1.05" stroke-linecap="round">
          <path d="M80 80 C100 160, 60 240, 120 300"/>
          <path d="M320 80 C300 160, 340 240, 280 300"/>
          <path d="M100 360 C80 430, 130 500, 200 520"/>
          <path d="M300 360 C320 430, 270 500, 200 520"/>
        </g>
        <g ${leaf}>
          <path d="M96 140 C110 128, 122 150, 106 154 Z"/>
          <path d="M70 220 C86 210, 96 234, 78 236 Z"/>
          <path d="M304 140 C290 128, 278 150, 294 154 Z"/>
          <path d="M330 220 C314 210, 304 234, 322 236 Z"/>
          <path d="M110 430 C96 444, 122 456, 126 438 Z"/>
          <path d="M290 430 C304 444, 278 456, 274 438 Z"/>
        </g>
        ${flower(d, 200, 520, 4.8)}${flower(d, 80, 80, 4)}${flower(d, 320, 80, 4)}`;
    case 10:
      return `${birds(d, 164, 86, 228, 76)}
        <g fill="none" stroke="${d.stem}" stroke-width="1.15" stroke-linecap="round">
          <path d="M70 500 C80 300, 120 140, 200 80"/>
          <path d="M330 500 C320 300, 280 140, 200 80"/>
        </g>
        <g ${leaf}>
          <path d="M110 200 C96 186, 120 172, 128 190 Z"/>
          <path d="M290 200 C304 186, 280 172, 272 190 Z"/>
          <path d="M90 340 C76 328, 100 312, 108 330 Z"/>
          <path d="M310 340 C324 328, 300 312, 292 330 Z"/>
          <path d="M80 440 C66 428, 90 414, 98 432 Z"/>
          <path d="M320 440 C334 428, 310 414, 302 432 Z"/>
        </g>
        ${flower(d, 200, 76, 5.2)}`;
    case 11:
      return `${birds(d, 154, 78, 230, 70)}
        <g fill="none" stroke="${d.stem}" stroke-width="1.05" stroke-linecap="round">
          <path d="M58 128 C110 58, 290 58, 342 128"/>
          <path d="M58 432 C110 502, 290 502, 342 432"/>
          <path d="M36 36 C70 44, 80 80, 64 108"/>
          <path d="M364 36 C330 44, 320 80, 336 108"/>
          <path d="M36 524 C70 516, 80 480, 64 452"/>
          <path d="M364 524 C330 516, 320 480, 336 452"/>
        </g>
        <g ${leaf}>
          <path d="M90 108 C80 92, 102 86, 108 102 Z"/>
          <path d="M140 80 C132 64, 154 62, 156 78 Z"/>
          <path d="M260 80 C268 64, 246 62, 244 78 Z"/>
          <path d="M310 108 C320 92, 298 86, 292 102 Z"/>
          <path d="M58 70 C50 56, 70 52, 72 66 Z"/>
          <path d="M342 70 C350 56, 330 52, 328 66 Z"/>
          <path d="M90 452 C80 468, 102 474, 108 458 Z"/>
          <path d="M310 452 C320 468, 298 474, 292 458 Z"/>
          <path d="M58 490 C50 504, 70 508, 72 494 Z"/>
          <path d="M342 490 C350 504, 330 508, 328 494 Z"/>
        </g>
        ${flower(d, 200, 62, 6.2)}${flower(d, 86, 112, 4.4)}${flower(d, 314, 112, 4.4)}
        ${flower(d, 200, 498, 5.4)}${flower(d, 90, 448, 4.2)}${flower(d, 310, 448, 4.2)}`;
    default:
      return `${birds(d, 150, 80, 244, 70)}
        <g fill="none" stroke="${d.stem}" stroke-width="1.1" stroke-linecap="round">
          <path d="M80 130 C90 90, 130 70, 160 100"/>
          <path d="M70 150 L90 90 L78 70"/>
          <path d="M90 150 L100 80 L114 64"/>
          <path d="M320 130 C310 90, 270 70, 240 100"/>
          <path d="M330 150 L310 90 L322 70"/>
          <path d="M310 150 L300 80 L286 64"/>
          <path d="M80 430 C90 470, 130 490, 160 460"/>
          <path d="M70 410 L90 470 L78 490"/>
          <path d="M320 430 C310 470, 270 490, 240 460"/>
          <path d="M330 410 L310 470 L322 490"/>
        </g>
        <g ${leaf}>
          <path d="M100 88 L96 70 L104 70 Z"/>
          <path d="M300 88 L296 70 L304 70 Z"/>
        </g>
        ${flower(d, 200, 72, 4.4)}`;
  }
}

export function keepsakeSvg(input: KeepsakeCardInput, design = keepsakeDesignForDay(input.finishedOn)): string {
  const date = escapeXml(formatKeepsakeDate(input.finishedOn));
  const days = `${Math.max(1, Math.floor(input.days)).toLocaleString("en-US")} days`;
  const ayahs = `${Math.max(0, Math.floor(input.ayahs)).toLocaleString("en-US")} ayahs`;
  const surahs = `${Math.max(0, Math.floor(input.surahs)).toLocaleString("en-US")} surahs`;
  const motif = keepsakeMotif(design);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560" width="400" height="560" role="img" aria-label="You finished the Quran">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${design.paperTop}"/>
      <stop offset="0.4" stop-color="${design.paperMid}"/>
      <stop offset="1" stop-color="${design.paperBottom}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="560" rx="28" fill="url(#paper)"/>
  <rect x="16" y="16" width="368" height="528" rx="20" fill="none" stroke="${design.frame}" stroke-width="1"/>
  <rect x="22" y="22" width="356" height="516" rx="16" fill="none" stroke="${design.paperBottom}" stroke-width="0.7"/>
  ${motif}
  <text x="200" y="200" text-anchor="middle" fill="${design.flowerStroke}" font-family="Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif" font-size="11" font-weight="650" letter-spacing="1.6">A READING FINISHED</text>
  <text x="200" y="248" text-anchor="middle" fill="${design.ink}" font-family="Source Serif 4, Georgia, serif" font-size="30" font-weight="600">You finished</text>
  <text x="200" y="284" text-anchor="middle" fill="${design.ink}" font-family="Source Serif 4, Georgia, serif" font-size="30" font-weight="600">the Quran</text>
  <text x="200" y="318" text-anchor="middle" fill="${design.soft}" font-family="Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif" font-size="15" font-weight="500">May Allah accept it.</text>
  <line x1="176" y1="340" x2="224" y2="340" stroke="${design.frame}" stroke-width="1"/>
  <text x="200" y="366" text-anchor="middle" fill="#3d1779" font-family="Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif" font-size="14" font-weight="650">${date}</text>
  <text x="200" y="396" text-anchor="middle" fill="${design.soft}" font-family="Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif" font-size="12" font-weight="600">${escapeXml(days)}  ·  ${escapeXml(ayahs)}  ·  ${escapeXml(surahs)}</text>
  <text x="200" y="524" text-anchor="middle" fill="#7a5a6c" font-family="Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif" font-size="10" font-weight="650" letter-spacing="0.8">qurandeck.com</text>
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
