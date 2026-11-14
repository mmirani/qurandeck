"use client";

import { useMushaf } from "@/components/providers/mushaf-provider";
import { Modal } from "@/components/ui/modal";
import { useState } from "react";
import { ColourManagerSheet } from "@/components/reader/colour-manager";
import { highlightListCopy, highlightsNewestFirst } from "@/lib/highlights";
import { resolveSwatch } from "@/lib/swatch-palette";

export function BookmarksModal() {
  const { modal, closeModal, bookmarks, jumpToHit } = useMushaf();
  if (modal !== "bookmarks") return null;

  return (
    <Modal eyebrow="Saved" title="Favorites" onClose={closeModal}>
      {bookmarks.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Star an ayah to favorite it, or bookmark a word. Everything you save appears here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {bookmarks.map((item) => {
            const [chapterId, verseNumber] = item.verseKey.split(":").map(Number);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() =>
                    jumpToHit({
                      verseKey: item.verseKey,
                      chapterId,
                      verseNumber,
                      textArabic: "",
                      textTranslation: item.label,
                      source: "jump",
                    })
                  }
                  className="qd-pad-sm qd-cluster min-h-11 w-full cursor-pointer rounded-2xl border border-line text-left hover:bg-highlight"
                >
                  <p className="text-xs capitalize text-gold-deep">{item.type === "verse" ? "Favorite ayah" : item.type}</p>
                  <p className="text-sm text-ink">{item.label}</p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

export function NotesModal() {
  const { modal, closeModal, notes, jumpToHit } = useMushaf();
  if (modal !== "notes") return null;

  return (
    <Modal eyebrow="Study" title="Reflections" onClose={closeModal}>
      {notes.length === 0 ? (
        <p className="text-sm text-ink-soft">Write a note on any verse. It stays attached to that ayah.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => {
            const [chapterId, verseNumber] = note.verseKey.split(":").map(Number);
            return (
              <li key={note.id} className="qd-pad-sm qd-cluster rounded-2xl border border-line">
                <button
                  type="button"
                  className="cursor-pointer text-xs text-gold-deep"
                  onClick={() =>
                    jumpToHit({
                      verseKey: note.verseKey,
                      chapterId,
                      verseNumber,
                      textArabic: "",
                      textTranslation: note.body,
                      source: "jump",
                    })
                  }
                >
                  {note.verseKey}
                </button>
                <p className="whitespace-pre-wrap text-sm leading-6">{note.body}</p>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

export function HighlightsModal() {
  const {
    modal,
    closeModal,
    highlights,
    swatches,
    chapters,
    verses,
    jumpToHit,
    deleteHighlight,
    deleteHighlights,
  } = useMushaf();
  const [coloursOpen, setColoursOpen] = useState(false);
  if (modal !== "highlights") {
    if (coloursOpen) setColoursOpen(false);
    return null;
  }
  const marks = highlightsNewestFirst(highlights);

  return (
    <>
    <Modal
      eyebrow="Study"
      title="Highlights"
      onClose={closeModal}
      wide
      actions={
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={coloursOpen}
          onClick={() => setColoursOpen(true)}
          className="inline-flex h-11 min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium text-ink"
        >
          Edit colours
        </button>
      }
    >
      <section>
        <div className="flex items-center justify-between gap-2">
          <h3 className="kufic-label text-gold-deep">All marks</h3>
          {highlights.length > 0 ? (
            <button
              type="button"
              onClick={() => deleteHighlights(highlights.map((item) => item.id))}
              className="cursor-pointer text-xs text-danger underline-offset-2 hover:underline"
            >
              Clear all
            </button>
          ) : null}
        </div>
        {highlights.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">
            Select English or transliteration, or turn on Highlight and tap Arabic words. Marks stay on this device.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {marks.map((item) => {
                const pen = resolveSwatch(swatches, item.swatchId).swatch;
                const [chapterId, verseNumber] = item.verseKey.split(":").map(Number);
                const verse = verses.find((entry) => entry.verseKey === item.verseKey);
                const chapter = chapters.find((entry) => entry.id === chapterId);
                const copy = highlightListCopy(item, {
                  chapterName: chapter?.nameSimple,
                  translation: verse?.translation,
                });
                return (
                  <li key={item.id} className="qd-pad-sm flex items-start gap-3 rounded-2xl border border-line">
                    <div className="flex h-11 shrink-0 items-center gap-2">
                      <span aria-hidden="true" className="h-4 w-4 rounded-full border border-line" style={{ background: pen.color }} />
                      <span className="text-sm text-ink">{pen.name}</span>
                    </div>
                    <button
                      type="button"
                      className="min-h-11 min-w-0 flex-1 cursor-pointer text-left"
                      onClick={() =>
                        jumpToHit({
                          verseKey: item.verseKey,
                          chapterId,
                          verseNumber,
                          textArabic: item.text,
                          textTranslation: copy.body || item.text,
                          source: "jump",
                        })
                      }
                    >
                      <p className="text-xs text-gold-deep">
                        {copy.title} · {item.layer}
                      </p>
                      {copy.body ? <p className="mt-1 line-clamp-3 text-sm">{copy.body}</p> : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteHighlight(item.id)}
                      className="h-11 min-h-11 cursor-pointer rounded-full px-3 text-xs text-danger"
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </Modal>
    <ColourManagerSheet open={coloursOpen} onClose={() => setColoursOpen(false)} backLabel="Back to highlights" />
    </>
  );
}
