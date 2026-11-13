/** Ayah mode selects a word on the first tap and plays it on the second. */
export function wordTapShouldPlay(mode: "immediate" | "armed", alreadySelected: boolean) {
  return mode === "immediate" || alreadySelected;
}
