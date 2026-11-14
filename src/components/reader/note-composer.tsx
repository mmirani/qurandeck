"use client";

import { useEffect, useSyncExternalStore } from "react";
import { VerseNotePanel } from "@/components/reader/verse-note-panel";
import {
  closeNoteComposer,
  getNoteComposerKey,
  subscribeNoteComposer,
} from "@/lib/note-composer";

function subscribe(onChange: () => void) {
  return subscribeNoteComposer(onChange);
}

export function NoteComposerSheet() {
  const verseKey = useSyncExternalStore(subscribe, getNoteComposerKey, () => null);

  useEffect(() => {
    if (!verseKey) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (event.defaultPrevented) return;
      const field = document.getElementById("note-composer-field");
      if (field && document.activeElement === field) return;
      closeNoteComposer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [verseKey]);

  if (!verseKey) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close note"
        className="absolute inset-0 cursor-pointer bg-black/45"
        onClick={closeNoteComposer}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-composer-title"
        className="qd-pad relative z-10 m-[var(--space-4)] flex max-h-[min(85dvh,40rem)] w-full max-w-xl flex-col gap-[var(--space-4)] overflow-y-auto rounded-3xl border border-line bg-surface shadow-[var(--shadow)]"
      >
        <VerseNotePanel verseKey={verseKey} fieldId="note-composer-field" titleId="note-composer-title" variant="sheet" />
      </div>
    </div>
  );
}
