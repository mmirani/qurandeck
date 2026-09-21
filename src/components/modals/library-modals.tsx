"use client";

import { useMushaf } from "@/components/providers/mushaf-provider";
import { Modal } from "@/components/ui/modal";
import { highlightListCopy } from "@/lib/highlights";

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
        <ul className="space-y-2">
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
                  className="w-full cursor-pointer rounded-2xl border border-line px-4 py-3 text-left hover:bg-highlight"
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
        <ul className="space-y-3">
          {notes.map((note) => {
            const [chapterId, verseNumber] = note.verseKey.split(":").map(Number);
            return (
              <li key={note.id} className="rounded-2xl border border-line p-4">
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
                <p className="mt-1 whitespace-pre-wrap text-sm">{note.body}</p>
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
    addSwatch,
    updateSwatch,
    removeSwatch,
    setActiveSwatch,
  } = useMushaf();
  if (modal !== "highlights") return null;

  return (
    <Modal eyebrow="Study" title="Highlights" onClose={closeModal} wide>
      <section className="mb-8">
        <h3 className="kufic-label text-gold-deep">Pens</h3>
        <p className="mt-1 text-sm text-ink-soft">Name your colours. Yellow is the default pen.</p>
        <ul className="mt-4 space-y-2">
          {swatches.map((pen) => (
            <li key={pen.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-line px-3 py-2">
              <input
                type="color"
                value={pen.color}
                aria-label={`${pen.name} colour`}
                onChange={(event) => updateSwatch(pen.id, { color: event.target.value })}
                className="h-8 w-10 cursor-pointer rounded-md border border-line bg-transparent"
              />
              <input
                value={pen.name}
                onChange={(event) => updateSwatch(pen.id, { name: event.target.value })}
                className="h-9 min-w-40 flex-1 rounded-xl border border-line bg-transparent px-3 text-sm"
              />
              <button
                type="button"
                onClick={() => setActiveSwatch(pen.id)}
                className="h-9 cursor-pointer rounded-full px-3 text-xs text-gold-deep"
              >
                Use
              </button>
              {pen.id !== "yellow" ? (
                <button
                  type="button"
                  onClick={() => removeSwatch(pen.id)}
                  className="h-9 cursor-pointer rounded-full px-3 text-xs text-danger"
                >
                  Remove
                </button>
              ) : (
                <span className="text-[10px] text-muted">Default</span>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => addSwatch("New pen", "#C4B5FD")}
          className="mt-3 h-10 cursor-pointer rounded-full border border-gold/40 px-4 text-sm text-gold-deep"
        >
          Add a named colour
        </button>
      </section>
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
          <ul className="mt-3 space-y-2">
            {highlights
              .slice()
              .reverse()
              .map((item) => {
                const pen = swatches.find((swatch) => swatch.id === item.swatchId);
                const [chapterId, verseNumber] = item.verseKey.split(":").map(Number);
                const verse = verses.find((entry) => entry.verseKey === item.verseKey);
                const chapter = chapters.find((entry) => entry.id === chapterId);
                const copy = highlightListCopy(item, {
                  chapterName: chapter?.nameSimple,
                  translation: verse?.translation,
                  penName: item.label?.trim() || pen?.name,
                });
                return (
                  <li key={item.id} className="flex items-start gap-3 rounded-2xl border border-line p-3">
                    <span className="mt-1 h-4 w-4 shrink-0 rounded-full" style={{ background: pen?.color ?? "#F5D76E" }} />
                    <button
                      type="button"
                      className="min-w-0 flex-1 cursor-pointer text-left"
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
                      className="h-9 cursor-pointer rounded-full px-3 text-xs text-danger"
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
  );
}
