const ARABIC_RUN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;

export function hasArabicScript(value: string) {
  return /[\u0600-\u06FF]/.test(value);
}

export function readableExcerpt(text: string, max = 720) {
  const clean = text.trim();
  if (clean.length <= max) return { excerpt: clean, truncated: false };
  const window = clean.slice(0, max);
  const paragraph = window.lastIndexOf("\n\n");
  const sentence = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("۔ "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
  );
  const cut = paragraph > 240 ? paragraph : sentence > 240 ? sentence + 1 : window.length;
  return { excerpt: clean.slice(0, cut).trim(), truncated: true };
}

export type ScriptPiece = { text: string; arabic: boolean };

export function splitScript(text: string): ScriptPiece[] {
  const pieces: ScriptPiece[] = [];
  let last = 0;
  for (const match of text.matchAll(ARABIC_RUN)) {
    const index = match.index ?? 0;
    if (index > last) pieces.push({ text: text.slice(last, index), arabic: false });
    pieces.push({ text: match[0], arabic: true });
    last = index + match[0].length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last), arabic: false });
  return pieces.filter((piece) => piece.text.length > 0);
}
