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
