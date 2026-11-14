"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Ellipsis, Pencil } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { formatNoteMeta } from "@/lib/notes";
import { announce } from "@/lib/reading";

const SAVE_DELAY_MS = 600;

export function VerseNotePanel({
  verseKey,
  fieldId,
  titleId,
  variant,
}: {
  verseKey?: string;
  fieldId: string;
  titleId?: string;
  variant: "rail" | "sheet";
}) {
  const { notes, saveNote, restoreNote } = useMushaf();
  const note = verseKey ? notes.find((item) => item.verseKey === verseKey) : undefined;
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [draft, setDraft] = useState(note?.body ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [expanded, setExpanded] = useState(false);
  const [canClamp, setCanClamp] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [seenKey, setSeenKey] = useState(verseKey ?? "");
  const rootRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);

  if ((verseKey ?? "") !== seenKey) {
    setSeenKey(verseKey ?? "");
    setMode("read");
    setDraft(note?.body ?? "");
    setStatus("idle");
    setExpanded(false);
    setCanClamp(false);
    setMenuOpen(false);
  }

  const beginEdit = () => {
    setDraft(note?.body ?? "");
    setStatus("idle");
    setMenuOpen(false);
    setMode("edit");
    if (verseKey) saveNote(verseKey, note?.body ?? "");
  };

  useEffect(() => {
    const node = rootRef.current;
    if (!node || variant !== "rail") return;
    const onEdit = () => {
      flushSync(() => {
        setDraft(note?.body ?? "");
        setStatus("idle");
        setMenuOpen(false);
        setMode("edit");
      });
      if (verseKey) saveNote(verseKey, note?.body ?? "");
    };
    node.addEventListener("qurandeck-note-edit", onEdit);
    return () => node.removeEventListener("qurandeck-note-edit", onEdit);
  }, [note?.body, saveNote, variant, verseKey]);

  useEffect(() => {
    if (mode !== "edit" || !verseKey) return;
    const trimmed = draft.trim();
    const saved = note?.body ?? "";
    if (!trimmed || trimmed === saved) return;
    const timer = window.setTimeout(() => {
      saveNote(verseKey, draft);
      setStatus("saved");
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [draft, mode, note?.body, saveNote, verseKey]);

  useLayoutEffect(() => {
    const node = areaRef.current;
    if (mode !== "edit" || !node) return;
    node.style.height = "0px";
    node.style.height = `${node.scrollHeight}px`;
  }, [draft, mode]);

  useEffect(() => {
    if (mode !== "edit") return;
    const node = areaRef.current;
    if (!node) return;
    node.focus();
    const end = node.value.length;
    node.setSelectionRange(end, end);
  }, [mode, verseKey]);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || mode !== "read" || !note) return;
    const measure = () => {
      const clone = el.cloneNode(true) as HTMLElement;
      clone.classList.remove("line-clamp-6");
      clone.style.position = "absolute";
      clone.style.visibility = "hidden";
      clone.style.pointerEvents = "none";
      clone.style.height = "auto";
      clone.style.width = `${el.clientWidth}px`;
      clone.style.webkitLineClamp = "unset";
      el.parentElement?.appendChild(clone);
      const line = parseFloat(getComputedStyle(el).lineHeight) || 24;
      setCanClamp(clone.scrollHeight > line * 6 + 1);
      clone.remove();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, mode, note, note?.body]);

  useEffect(() => {
    if (!menuOpen) return;
    deleteRef.current?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [menuOpen]);

  const persist = (close: boolean) => {
    if (!verseKey) return;
    const trimmed = draft.trim();
    saveNote(verseKey, draft);
    if (!close && trimmed) setStatus("saved");
    if (close) {
      setMode("read");
      setStatus("idle");
    }
  };

  const removeNote = () => {
    if (!verseKey || !note) return;
    const snapshot = note;
    saveNote(verseKey, "");
    setMenuOpen(false);
    setMode("read");
    announce("Note deleted", undefined, {
      label: "Undo",
      onAction: () => restoreNote(snapshot),
    });
  };

  const meta = note ? formatNoteMeta(note) : null;

  return (
    <div
      ref={rootRef}
      data-note-panel={variant === "rail" ? "rail" : "sheet"}
      className="flex flex-col gap-2"
      onKeyDown={(event) => {
        if (event.key === "Escape" && menuOpen) {
          event.preventDefault();
          event.stopPropagation();
          setMenuOpen(false);
          menuButtonRef.current?.focus();
          return;
        }
        if (event.key === "Escape" && mode === "edit") {
          event.preventDefault();
          event.stopPropagation();
          persist(true);
        }
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={titleId} className="section-heading text-gold">
          Notes
        </h2>
        {note && mode === "read" ? (
          <div className="flex items-center">
            <button
              type="button"
              aria-label="Edit note"
              onClick={beginEdit}
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-surface"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <div className="relative" ref={menuRef}>
              <button
                ref={menuButtonRef}
                type="button"
                aria-label="Note actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-surface"
              >
                <Ellipsis className="h-5 w-5" />
              </button>
              {menuOpen ? (
                <div role="menu" className="absolute right-0 z-20 mt-1 min-w-40 rounded-2xl border border-line bg-surface p-1 shadow-[var(--shadow)]">
                  <button
                    ref={deleteRef}
                    type="button"
                    role="menuitem"
                    onClick={removeNote}
                    className="min-h-11 w-full cursor-pointer rounded-xl px-3 text-left text-sm text-danger hover:bg-highlight"
                  >
                    Delete note
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {mode === "edit" ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId} className="sr-only">
            Note on {verseKey ?? "—"}
          </label>
          <textarea
            ref={areaRef}
            id={fieldId}
            value={draft}
            rows={3}
            placeholder="Write a personal note about this ayah…"
            onChange={(event) => {
              const value = event.target.value;
              setDraft(value);
              const trimmed = value.trim();
              setStatus(trimmed && trimmed !== (note?.body ?? "") ? "saving" : "idle");
            }}
            onBlur={() => persist(false)}
            className="min-h-24 w-full resize-none overflow-hidden rounded-2xl border border-line bg-surface px-3 py-3 text-base leading-6 text-ink [overflow-wrap:anywhere]"
          />
          <div className="flex items-center justify-between gap-2">
            <p aria-live="polite" className="min-h-5 text-xs text-muted">
              {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : ""}
            </p>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-muted md:inline">Esc to close</span>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => persist(true)}
                className="inline-flex min-h-11 cursor-pointer items-center px-2 text-sm font-medium text-gold-deep"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : note ? (
        <div className="flex min-w-0 flex-col gap-1">
          <button
            ref={bodyRef}
            type="button"
            onClick={beginEdit}
            className={`w-full min-w-0 cursor-pointer whitespace-pre-wrap text-left text-base leading-6 text-ink [overflow-wrap:anywhere] ${
              expanded ? "" : "line-clamp-6"
            }`}
          >
            {note.body}
          </button>
          {canClamp ? (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
              className="inline-flex min-h-11 cursor-pointer items-center self-start text-sm font-medium text-gold-deep"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          ) : null}
          {meta ? (
            <p className="text-xs leading-5 text-muted">
              <time dateTime={meta.created.dateTime}>{meta.created.text}</time>
              {meta.edited ? (
                <>
                  <span aria-hidden="true"> · </span>
                  <time dateTime={meta.edited.dateTime}>{meta.edited.text}</time>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={beginEdit}
          disabled={!verseKey}
          className="flex min-h-11 w-full cursor-pointer flex-col items-start gap-1 rounded-2xl border border-dashed border-line bg-surface px-3 py-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-sm font-medium text-ink">Add a note</span>
          <span className="text-base text-muted">Write a personal note about this ayah…</span>
        </button>
      )}
    </div>
  );
}
