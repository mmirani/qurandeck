/** True when fixed controls, gaps, and padding stay inside the viewport. A flexible title is not counted. */
export function rowFits(viewport: number, fixedWidths: number[], gap: number, padding: number) {
  const gaps = gap * Math.max(0, fixedWidths.length - 1);
  const used = fixedWidths.reduce((sum, width) => sum + width, 0) + gaps + padding;
  return used <= viewport;
}
