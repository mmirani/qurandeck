type Listener = () => void;

let verseKey: string | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

export function getNoteComposerKey() {
  return verseKey;
}

export function subscribeNoteComposer(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function openNoteComposer(key: string) {
  verseKey = key;
  emit();
}

export function closeNoteComposer() {
  if (!verseKey) return;
  verseKey = null;
  emit();
}

export function noteFieldIsVisible(rect: { width: number; height: number } | null | undefined) {
  return Boolean(rect && rect.width > 8 && rect.height > 8);
}

/** Sana may say the box is ready only after this returns true. */
export function noteComposerReply(verseKey: string, focused: boolean) {
  return focused ? `The note box for ${verseKey} is ready.` : `Opening the note for ${verseKey}.`;
}

/**
 * Focus the study-rail note field when it is actually on screen.
 * Otherwise open the composer sheet. Returns true only when the field received focus.
 */
export function focusOpenNote(key: string): boolean {
  if (typeof document !== "undefined") {
    const panels = [...document.querySelectorAll<HTMLElement>("[data-note-panel='rail']")];
    const panel = panels.find((node) => noteFieldIsVisible(node.getBoundingClientRect()));
    if (panel) {
      panel.dispatchEvent(new CustomEvent("qurandeck-note-edit"));
      const field = panel.querySelector("textarea");
      if (field instanceof HTMLElement && noteFieldIsVisible(field.getBoundingClientRect())) {
        field.focus();
        return document.activeElement === field;
      }
      return false;
    }
  }
  openNoteComposer(key);
  return false;
}
