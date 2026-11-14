/** Chapter, then verse. Does not use reading-line distance. */
export function compareVerseKeys(a: string, b: string) {
  const [aChapter, aVerse] = a.split(":").map(Number);
  const [bChapter, bVerse] = b.split(":").map(Number);
  const chapter = (Number.isFinite(aChapter) ? aChapter : 0) - (Number.isFinite(bChapter) ? bChapter : 0);
  if (chapter !== 0) return chapter;
  return (Number.isFinite(aVerse) ? aVerse : 0) - (Number.isFinite(bVerse) ? bVerse : 0);
}

/** First and last ayah in reading order. `keys` may be ranked by distance to the reading line. */
export function verseRangeLabel(keys: string[]) {
  if (keys.length === 0) return "Scroll the mushaf";
  const sorted = [...keys].sort(compareVerseKeys);
  if (sorted.length === 1) return `In view · ${sorted[0]}`;
  return `In view · ${sorted[0]} – ${sorted[sorted.length - 1]}`;
}
