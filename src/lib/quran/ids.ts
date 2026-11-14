function parseBoundedId(raw: string, max: number): number | null {
  if (!/^\d{1,3}$/.test(raw)) return null;
  const id = Number(raw);
  if (!Number.isInteger(id) || String(id) !== raw || id < 1 || id > max) return null;
  return id;
}

export function parseSurahId(raw: string): number | null {
  return parseBoundedId(raw, 114);
}

export function parseJuzId(raw: string): number | null {
  return parseBoundedId(raw, 30);
}

export function surahStaticParams() {
  return Array.from({ length: 114 }, (_, index) => ({ id: String(index + 1) }));
}

export function juzStaticParams() {
  return Array.from({ length: 30 }, (_, index) => ({ id: String(index + 1) }));
}
