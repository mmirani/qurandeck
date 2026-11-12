import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { create, type Font } from "fontkit";

/**
 * Satori's text shaper cannot apply Noto Naskh Arabic's joining lookups,
 * so Arabic is shaped here and painted as an SVG. The file is the same
 * Naskh family the site uses for `--font-naskh`.
 */
let fontPromise: Promise<Font> | null = null;

function loadNaskh() {
  if (!fontPromise) {
    fontPromise = readFile(join(process.cwd(), "src/assets/fonts/NotoNaskhArabic-SemiBold.ttf")).then((data) =>
      create(data),
    );
  }
  return fontPromise;
}

export async function arabicSvg(text: string, color: string, fontSize: number) {
  try {
    const font = await loadNaskh();
    const run = font.layout(text);
    const scale = fontSize / font.unitsPerEm;
    let cursor = 0;
    const commands: string[] = [];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let index = 0; index < run.glyphs.length; index += 1) {
      const glyph = run.glyphs[index];
      const position = run.positions[index];
      const path = glyph.path
        .scale(scale, -scale)
        .translate((cursor + position.xOffset) * scale, -(position.yOffset * scale));
      const drawing = path.toSVG();
      if (drawing) {
        const box = path.bbox;
        minX = Math.min(minX, box.minX);
        minY = Math.min(minY, box.minY);
        maxX = Math.max(maxX, box.maxX);
        maxY = Math.max(maxY, box.maxY);
        commands.push(drawing);
      }
      cursor += position.xAdvance;
    }

    if (!commands.length || !Number.isFinite(minX)) return null;

    const pad = Math.ceil(fontSize * 0.06);
    const width = Math.ceil(maxX - minX + pad * 2);
    const height = Math.ceil(maxY - minY + pad * 2);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g transform="translate(${pad - minX} ${pad - minY})" fill="${color}"><path d="${commands.join(" ")}"/></g></svg>`;
    return {
      src: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
      width,
      height,
    };
  } catch {
    return null;
  }
}
