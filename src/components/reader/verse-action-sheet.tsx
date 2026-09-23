"use client";

import { Copy, Highlighter, NotebookPen, Play, Share2, Star } from "lucide-react";
import { BottomSheet } from "@/components/shell/bottom-sheet";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { ayahHighlight, verseHighlights } from "@/lib/highlights";
import { PRODUCT_NAME } from "@/lib/brand";
import { shareOrCopy, verseShareText } from "@/lib/reading";
import type { Verse } from "@/lib/quran/types";

export function VerseActionSheet({
  verse,
  open,
  onClose,
}: {
  verse: Verse;
  open: boolean;
  onClose: () => void;
}) {
  const {
    bookmarks,
    notes,
    highlights,
    swatches,
    mode,
    playVerse,
    playFrom,
    selectVerse,
    toggleBookmarkVerse,
    highlightAyah,
    clearVerseHighlights,
    updatePreferences,
    preferences,
  } = useMushaf();

  const favorited = bookmarks.some((item) => item.type === "verse" && item.verseKey === verse.verseKey);
  const note = notes.find((item) => item.verseKey === verse.verseKey);
  const marks = verseHighlights(highlights, verse.verseKey);
  const wash = ayahHighlight(marks, verse.verseKey);

  const run = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={`Ayah ${verse.verseKey}`}>
      <div className="space-y-1 px-3 pb-6 pt-2">
        <SheetAction
          icon={<Play className="h-5 w-5" />}
          label="Play ayah audio"
          onClick={() => run(() => void playVerse(verse.verseKey))}
        />
        <SheetAction
          icon={<Play className="h-5 w-5" />}
          label={mode === "juz" ? "Play from here through juz" : "Play from here through surah"}
          onClick={() => run(() => void playFrom(verse.verseKey))}
        />
        <SheetAction
          icon={<NotebookPen className="h-5 w-5" />}
          label={preferences.showTafsir ? "Hide tafsir" : "Show tafsir & notes"}
          onClick={() =>
            run(() => {
              selectVerse(verse.verseKey);
              if (preferences.showTafsir) {
                updatePreferences({ showTafsir: false });
                return;
              }
              updatePreferences({ showTafsir: true });
              window.setTimeout(() => document.getElementById("verse-note")?.focus(), 120);
            })
          }
        />
        <SheetAction
          icon={<Copy className="h-5 w-5" />}
          label="Copy Arabic / English"
          onClick={() => run(() => void navigator.clipboard.writeText(verseShareText(verse)))}
        />
        <SheetAction
          icon={<Star className={`h-5 w-5 ${favorited ? "fill-gold text-gold" : ""}`} />}
          label={favorited ? "Remove bookmark" : "Bookmark ayah"}
          onClick={() => run(() => toggleBookmarkVerse(verse))}
        />
        <SheetAction
          icon={<Highlighter className={`h-5 w-5 ${wash ? "text-gold" : ""}`} />}
          label={wash ? "Clear ayah highlight" : "Highlight ayah"}
          onClick={() => run(() => (wash ? clearVerseHighlights(verse.verseKey) : highlightAyah(verse)))}
        />
        <SheetAction
          icon={<Share2 className="h-5 w-5" />}
          label="Share ayah"
          onClick={() => run(() => void shareOrCopy(`${PRODUCT_NAME} · ${verse.verseKey}`, verseShareText(verse)))}
        />
        {note ? (
          <p className="mx-2 mt-3 rounded-2xl border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-ink">{note.body}</p>
        ) : null}
      </div>
    </BottomSheet>
  );
}

function SheetAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-base text-ink hover:bg-highlight"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-gold-deep">
        {icon}
      </span>
      {label}
    </button>
  );
}
