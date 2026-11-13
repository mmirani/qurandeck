"use client";

import { useMushaf } from "@/components/providers/mushaf-provider";
import { Modal } from "@/components/ui/modal";
import { highlightListCopy } from "@/lib/highlights";
import type { SearchHit } from "@/lib/quran/types";

function jump(verseKey: string, label: string): SearchHit {
  const [chapterId, verseNumber] = verseKey.split(":").map(Number);
  return {
    verseKey,
    chapterId,
    verseNumber,
    textArabic: "",
    textTranslation: label,
    source: "jump",
  };
}

export function SavedModal() {
  const { modal, closeModal, bookmarks, notes, highlights, jumpToHit } = useMushaf();
  if (modal !== "saved") return null;

  return (
    <Modal eyebrow="Library" title="Saved" onClose={closeModal}>
      <section className="qd-stack">
        <h3 className="kufic-label text-gold-deep">Favorites</h3>
        {bookmarks.length === 0 ? (
          <p className="text-sm text-ink-soft">Star an ayah to keep it here.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {bookmarks.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => jumpToHit(jump(item.verseKey, item.label))}
                  className="qd-pad-sm min-h-11 w-full cursor-pointer rounded-2xl border border-line text-left hover:bg-highlight"
                >
                  <p className="text-xs text-gold-deep">{item.verseKey}</p>
                  <p className="text-sm text-ink">{item.label}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="qd-stack mt-6">
        <h3 className="kufic-label text-gold-deep">Notes</h3>
        {notes.length === 0 ? (
          <p className="text-sm text-ink-soft">Notes you write on an ayah stay here.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notes.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => jumpToHit(jump(note.verseKey, note.body))}
                  className="qd-pad-sm min-h-11 w-full cursor-pointer rounded-2xl border border-line text-left hover:bg-highlight"
                >
                  <p className="text-xs text-gold-deep">{note.verseKey}</p>
                  <p className="line-clamp-3 whitespace-pre-wrap text-sm text-ink">{note.body}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="qd-stack mt-6">
        <h3 className="kufic-label text-gold-deep">Highlights</h3>
        {highlights.length === 0 ? (
          <p className="text-sm text-ink-soft">Marks you paint on an ayah stay here.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {highlights.map((item) => {
              const copy = highlightListCopy(item);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => jumpToHit(jump(item.verseKey, copy.body || copy.title))}
                    className="qd-pad-sm min-h-11 w-full cursor-pointer rounded-2xl border border-line text-left hover:bg-highlight"
                  >
                    <p className="text-xs text-gold-deep">{copy.title}</p>
                    {copy.body ? <p className="text-sm text-ink">{copy.body}</p> : null}
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
