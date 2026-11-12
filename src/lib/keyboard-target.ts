type ClosestTarget = {
  isContentEditable?: boolean;
  closest?: (selector: string) => unknown;
};

/** Arrow keys move the ayah only when focus is not in a text field. */
export function shouldStepAyahOnArrow(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return true;
  const element = target as ClosestTarget;
  if (element.isContentEditable) return false;
  if (typeof element.closest === "function" && element.closest("input, textarea, select, [contenteditable]")) {
    return false;
  }
  return true;
}
