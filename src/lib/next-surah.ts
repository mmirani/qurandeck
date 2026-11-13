/** Two 44px controls plus the 8px gap. The Sign in pill is narrower than this cluster. */
export const HEADER_CLUSTER_PX = 96;
/** Measured wider than “Sign in” at 14px plus 16px padding on each side and the border. */
export const SIGN_IN_PILL_PX = 88;
/** Equal fixed tracks. 6.5rem holds the cluster and the pill, and the title takes what remains. */
export const HEADER_SIDE_PX = 104;

export function nextSurahAction(chapterId: number, nameOf: (id: number) => string | undefined) {
  if (chapterId >= 114) {
    return { id: 1, label: `Back to ${nameOf(1) ?? "Al-Fatihah"}` };
  }
  const id = chapterId + 1;
  return { id, label: `Next: ${nameOf(id) ?? "the next surah"}` };
}

export function showPreviousSurah(chapterId: number) {
  return chapterId > 1;
}

/** Equal side tracks keep the title on the screen centre. A long title truncates; the controls do not shrink. */
export function headerSlots(viewport: number, gutter: number, titleNatural: number) {
  const inner = Math.max(0, viewport - gutter * 2);
  const side = HEADER_SIDE_PX;
  const titleRoom = Math.max(0, inner - side * 2);
  const title = Math.min(titleNatural, titleRoom);
  return {
    side,
    title,
    titleRoom,
    centered: true as const,
    controlsFit: side >= SIGN_IN_PILL_PX && side >= HEADER_CLUSTER_PX && side * 2 <= inner,
  };
}

/** Content width of the phone search field after the gutter, border, icon padding, and end padding. */
export function searchPlaceholderRoom(viewport: number, gutter = 16, padStart = 40, padEnd = 12, border = 2) {
  return Math.max(0, viewport - gutter * 2 - border - padStart - padEnd);
}
