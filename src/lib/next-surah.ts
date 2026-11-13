export function nextSurahAction(chapterId: number, nameOf: (id: number) => string | undefined) {
  if (chapterId >= 114) {
    return { id: 1, label: `Back to ${nameOf(1) ?? "Al-Fatihah"}` };
  }
  const id = chapterId + 1;
  return { id, label: `Next: ${nameOf(id) ?? "the next surah"}` };
}

/** Equal side tracks keep the title on the screen centre. */
export function headerSlots(viewport: number, gutter: number, sideMin: number, titleNatural: number) {
  const inner = Math.max(0, viewport - gutter * 2);
  const room = Math.max(0, inner - sideMin * 2);
  const title = Math.min(titleNatural, room);
  const extra = Math.max(0, inner - sideMin * 2 - title);
  const side = sideMin + extra / 2;
  return { side, title, centered: true as const };
}
