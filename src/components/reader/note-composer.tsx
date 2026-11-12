"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import {
  closeNoteComposer,
  getNoteComposerKey,
  subscribeNoteComposer,
} from "@/lib/note-composer";

function subscribe(onChange: () => void) {
  return subscribeNoteComposer(onChange);
}

export function NoteComposerForm({
  verseKey,
  id,
  onSaved,
  onCancel,
}: {
  verseKey: string;
  id: string;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const { notes, saveNote } = useMushaf();
  const saved = notes.find((item) => item.verseKey === verseKey)?.body ?? "";
  const [draftKey, setDraftKey] = useState(`${verseKey}\0${saved}`);
  const [draft, setDraft] = useState(saved);
  const nextKey = `${verseKey}\0${saved}`;
  if (draftKey !== nextKey) {
    setDraftKey(nextKey);
    setDraft(saved);
  }

  return (
    <form
      className="qd-stack"
      onSubmit={(event) => {
        event.preventDefault();
        saveNote(verseKey, draft);
        onSaved?.();
      }}
    >
      <label htmlFor={id} className="text-sm font-medium text-ink">
        Note on {verseKey}
      </label>
      <textarea
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Write a personal note about this ayah…"
        className="min-h-28 w-full resize-none rounded-2xl border border-line bg-canvas p-[var(--space-3)] text-base text-ink"
      />
      <div className="flex gap-[var(--space-2)]">
        <button
          type="submit"
          className="h-11 min-h-11 flex-1 cursor-pointer rounded-full bg-gold text-sm font-semibold text-on-gold"
        >
          Save note
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="h-11 min-h-11 min-w-11 cursor-pointer rounded-full border border-line px-[var(--space-4)] text-sm font-medium text-ink"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function NoteComposerSheet() {
  const verseKey = useSyncExternalStore(subscribe, getNoteComposerKey, () => null);
  const { notes } = useMushaf();
  const editing = Boolean(verseKey && notes.some((item) => item.verseKey === verseKey && item.body.trim()));

  useEffect(() => {
    if (!verseKey) return;
    const focus = window.setTimeout(() => document.getElementById("note-composer-field")?.focus(), 0);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeNoteComposer();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focus);
      window.removeEventListener("keydown", onKey);
    };
  }, [verseKey]);

  if (!verseKey) return null;
  const title = editing ? "Edit note" : "Add note";

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
        className="qd-pad relative z-10 m-[var(--space-4)] flex w-full max-w-xl flex-col gap-[var(--space-4)] rounded-3xl border border-line bg-surface shadow-[var(--shadow)]"
      >
        <h2 id="note-composer-title" className="font-display text-2xl font-semibold text-ink">
          {title}
        </h2>
        <NoteComposerForm
          verseKey={verseKey}
          id="note-composer-field"
          onSaved={closeNoteComposer}
          onCancel={closeNoteComposer}
        />
      </div>
    </div>
  );
}
