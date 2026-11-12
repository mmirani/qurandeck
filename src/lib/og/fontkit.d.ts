declare module "fontkit" {
  export interface GlyphPath {
    scale(sx: number, sy: number): GlyphPath;
    translate(x: number, y: number): GlyphPath;
    toSVG(): string;
    bbox: { minX: number; minY: number; maxX: number; maxY: number };
  }

  export interface Glyph {
    id: number;
    name: string;
    path: GlyphPath;
  }

  export interface GlyphPosition {
    xAdvance: number;
    yAdvance: number;
    xOffset: number;
    yOffset: number;
  }

  export interface Font {
    unitsPerEm: number;
    layout(text: string): { glyphs: Glyph[]; positions: GlyphPosition[] };
  }

  export function create(buffer: Buffer): Font;
}
