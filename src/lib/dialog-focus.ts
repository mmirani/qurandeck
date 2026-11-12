const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function dialogFocusables(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => {
    if (element.getAttribute("aria-hidden") === "true") return false;
    if (element.tabIndex < 0) return false;
    return true;
  });
}

/** Prefer the first control that is not the header close button. */
export function initialDialogIndex(count: number, closeIndex: number): number {
  if (count <= 0) return -1;
  if (closeIndex < 0 || count === 1) return 0;
  return closeIndex === 0 ? 1 : 0;
}

/**
 * Next index when Tab would leave the dialog.
 * `current` is -1 when focus is outside the list.
 */
export function trapTabIndex(current: number, count: number, shift: boolean): number {
  if (count <= 0) return 0;
  if (current < 0) return shift ? count - 1 : 0;
  if (shift) return current <= 0 ? count - 1 : current - 1;
  if (current >= count - 1) return 0;
  return current + 1;
}
