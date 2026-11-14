"use client";

import { useMushaf } from "@/components/providers/mushaf-provider";
import { Modal } from "@/components/ui/modal";
import { highlightListCopy } from "@/lib/highlights";
import { SwatchRow } from "@/components/reader/swatch-row";
import { resolveSwatch, swatchNameError } from "@/lib/swatch-palette";
import { useState } from "react";

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
    preferences,
    updateSwatch,
    moveSwatch,
    deleteSwatch,
    setActiveSwatch,
  } = useMushaf();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [recolorTo, setRecolorTo] = useState("");
  if (modal !== "highlights") return null;
  const deleting = swatches.find((item) => item.id === pendingDelete) ?? null;
  const used = deleting ? highlights.filter((item) => item.swatchId === deleting.id).length : 0;
  const others = swatches.filter((item) => item.id !== deleting?.id);

  return (
    <Modal eyebrow="Study" title="Highlights" onClose={closeModal} wide>
      <section className="mb-8">
        <h3 className="kufic-label text-gold-deep">Pens</h3>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          This is the colour row used everywhere you highlight. The order here is the order in that row.
        </p>
        <div className="mt-4">
          <SwatchRow
            swatches={swatches}
            activeId={preferences.activeSwatchId}
            label="Your highlight colours"
            onPick={setActiveSwatch}
            onClose={() => undefined}
          />
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {swatches.map((pen, index) => (
            <li key={pen.id} className="qd-pad-sm flex flex-wrap items-center gap-2 rounded-2xl border border-line">
              <span aria-hidden="true" className="h-6 w-6 shrink-0 rounded-full border border-line" style={{ background: pen.color }} />
              <input
                key={`${pen.id}-${pen.name}`}
                defaultValue={pen.name}
                maxLength={24}
                aria-label={`Rename ${pen.name}`}
                onBlur={(event) => {
                  const error = swatchNameError(swatches, event.target.value, pen.id);
                  if (error || event.target.value.trim() === pen.name) {
                    event.target.value = pen.name;
                    return;
                  }
                  updateSwatch(pen.id, { name: event.target.value });
                }}
                className="h-11 min-w-40 flex-1 rounded-xl border border-line bg-transparent px-3 text-sm"
              />
              <input
                type="color"
                value={pen.color}
                aria-label={`${pen.name} colour`}
                onChange={(event) => updateSwatch(pen.id, { color: event.target.value })}
                className="h-11 w-14 cursor-pointer rounded-xl border border-line bg-transparent"
              />
              <button
                type="button"
                aria-label={`Move ${pen.name} earlier`}
                disabled={index === 0}
                onClick={() => moveSwatch(pen.id, -1)}
                className="inline-flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-full px-3 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                Up
              </button>
              <button
                type="button"
                aria-label={`Move ${pen.name} later`}
                disabled={index === swatches.length - 1}
                onClick={() => moveSwatch(pen.id, 1)}
                className="inline-flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-full px-3 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                Down
              </button>
              <button
                type="button"
                onClick={() => {
                  const count = highlights.filter((item) => item.swatchId === pen.id).length;
                  if (count === 0) {
                    deleteSwatch(pen.id, { kind: "remove" });
                    return;
                  }
                  setRecolorTo(swatches.find((item) => item.id !== pen.id)?.id ?? "");
                  setPendingDelete(pen.id);
                }}
                className="inline-flex h-11 min-h-11 cursor-pointer items-center rounded-full px-3 text-sm text-danger"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        {deleting && used > 0 ? (
          <div
            role="dialog"
            aria-labelledby="delete-colour-title"
            className="mt-4 rounded-2xl border border-line bg-canvas p-4"
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              event.stopPropagation();
              setPendingDelete(null);
            }}
          >
            <h4 id="delete-colour-title" className="text-sm font-semibold text-ink">
              {deleting.name} is used on {used} highlight{used === 1 ? "" : "s"}
            </h4>
            <p className="mt-2 text-sm text-ink-soft">Recolour those highlights, or remove them.</p>
            {others.length > 0 ? (
              <label className="mt-3 block text-sm text-ink">
                Recolour to
                <select
                  value={recolorTo}
                  onChange={(event) => setRecolorTo(event.target.value)}
                  className="mt-1 h-11 w-full rounded-2xl border border-line bg-surface px-3"
                >
                  {others.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {others.length > 0 ? (
                <button
                  type="button"
                  disabled={!recolorTo}
                  onClick={() => {
                    deleteSwatch(deleting.id, { kind: "recolor", toId: recolorTo });
                    setPendingDelete(null);
                  }}
                  className="inline-flex h-11 cursor-pointer items-center rounded-full bg-gold px-4 text-sm font-semibold text-on-gold disabled:opacity-40"
                >
                  Recolour
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  deleteSwatch(deleting.id, { kind: "remove" });
                  setPendingDelete(null);
                }}
                className="inline-flex h-11 cursor-pointer items-center rounded-full border border-danger/40 px-4 text-sm text-danger"
              >
                Remove highlights
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="inline-flex h-11 cursor-pointer items-center rounded-full px-4 text-sm text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
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
          <ul className="mt-4 flex flex-col gap-2">
            {highlights
              .slice()
              .reverse()
              .map((item) => {
                const pen = resolveSwatch(swatches, item.swatchId).swatch;
                const [chapterId, verseNumber] = item.verseKey.split(":").map(Number);
                const verse = verses.find((entry) => entry.verseKey === item.verseKey);
                const chapter = chapters.find((entry) => entry.id === chapterId);
                const copy = highlightListCopy(item, {
                  chapterName: chapter?.nameSimple,
                  translation: verse?.translation,
                  penName: item.label?.trim() || pen.name,
                });
                return (
                  <li key={item.id} className="qd-pad-sm flex items-start gap-3 rounded-2xl border border-line">
                    <span className="mt-1 h-4 w-4 shrink-0 rounded-full" style={{ background: pen.color }} />
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
  );
}
