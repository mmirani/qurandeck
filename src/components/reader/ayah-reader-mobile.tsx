"use client";

import { useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, NotebookPen, Play, Star } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { NextSurahLink } from "@/components/reader/next-surah-link";
import { VerseCard } from "@/components/reader/verse-card";
import { QuranCredit } from "@/components/site/quran-credit";
import { shouldStepAyahOnArrow } from "@/lib/keyboard-target";
import { focusOpenNote } from "@/lib/note-composer";
import type { Verse } from "@/lib/quran/types";

export function AyahReaderMobile({ verses, mode }: { verses: Verse[]; mode: string }) {
  const { selectedVerseKey, selectVerse, chapters, playingVerseKey, preferences, bookmarks, notes, playVerse, toggleBookmarkVerse } =
    useMushaf();

  const index = Math.max(
    0,
    verses.findIndex((item) => item.verseKey === selectedVerseKey),
  );
  const verse = verses[index] ?? verses[0];
  const prev = verses[index - 1];
  const showSurahLabel = Boolean(
    verse && mode === "juz" && prev && prev.chapterId !== verse.chapterId,
  );

  const go = useCallback(
    (nextIndex: number) => {
      const target = verses[nextIndex];
      if (target) selectVerse(target.verseKey);
    },
    [selectVerse, verses],
  );

  useEffect(() => {
    if (verses.length === 0) return;
    const found = verses.some((item) => item.verseKey === selectedVerseKey);
    if (!found) selectVerse(verses[0].verseKey);
  }, [verses, selectedVerseKey, selectVerse]);

  useEffect(() => {
    if (!playingVerseKey || !preferences.autoFollow) return;
    if (!verses.some((item) => item.verseKey === playingVerseKey)) return;
    selectVerse(playingVerseKey);
  }, [playingVerseKey, preferences.autoFollow, selectVerse, verses]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!shouldStepAyahOnArrow(event.target)) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (index < verses.length - 1) go(index + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (index > 0) go(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, verses.length]);

  if (!verse) {
    return <p className="p-6 text-center text-ink-soft">No ayahs loaded.</p>;
  }

  const chapterName = chapters.find((item) => item.id === verse.chapterId)?.nameSimple;
  const favorited = bookmarks.some((item) => item.type === "verse" && item.verseKey === verse.verseKey);
  const hasNote = notes.some((item) => item.verseKey === verse.verseKey && item.body.trim());

  return (
    <div className="reader-ayah-stage flex min-h-0 flex-1 flex-col">
      <div className="qd-gutter flex min-h-11 shrink-0 items-center justify-center gap-2 border-b border-line/50 py-2 text-xs text-ink-soft">
        <span className="font-medium text-ink">
          {mode === "juz" && chapterName ? `${chapterName} · ` : ""}
          Ayah {verse.verseKey}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {index + 1} / {verses.length}
        </span>
      </div>

      <div className="reader-ayah-body min-h-0 flex-1 overflow-hidden">
        <VerseCard verse={verse} showSurahLabel={showSurahLabel} ayahFocus tourAnchor />
      </div>

      <footer className="reader-ayah-footer shrink-0 border-t border-line/60 bg-canvas/95">
        <QuranCredit compact className="mb-[var(--space-2)] text-center" />
        <div className="flex gap-[var(--space-2)]" role="group" aria-label="Ayah actions">
          <AyahBarButton
            label="Play"
            onClick={() => void playVerse(verse.verseKey)}
          >
            <Play className="h-4 w-4" />
          </AyahBarButton>
          <AyahBarButton
            label={favorited ? "Bookmarked" : "Bookmark"}
            pressed={favorited}
            onClick={() => toggleBookmarkVerse(verse)}
          >
            <Star className={`h-4 w-4 ${favorited ? "fill-gold text-gold" : ""}`} />
          </AyahBarButton>
          <AyahBarButton
            label={hasNote ? "Edit note" : "Add note"}
            onClick={() => focusOpenNote(verse.verseKey)}
          >
            <NotebookPen className={`h-4 w-4 ${hasNote ? "text-gold" : ""}`} />
          </AyahBarButton>
        </div>
        {mode === "surah" && index >= verses.length - 1 ? (
          <NextSurahLink chapterId={verse.chapterId} />
        ) : null}
        <div className="mt-[var(--space-2)] flex gap-[var(--space-2)]">
          <button
            type="button"
            disabled={index <= 0}
            onClick={() => go(index - 1)}
            aria-label="Previous ayah"
            className="inline-flex h-11 min-h-11 min-w-11 flex-1 cursor-pointer items-center justify-center gap-[var(--space-2)] rounded-full border border-line bg-surface text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft className="h-5 w-5" />
            Previous
          </button>
          <button
            type="button"
            disabled={index >= verses.length - 1}
            onClick={() => go(index + 1)}
            aria-label="Next ayah"
            className="inline-flex h-11 min-h-11 min-w-11 flex-1 cursor-pointer items-center justify-center gap-[var(--space-2)] rounded-full bg-gold text-sm font-semibold text-on-gold disabled:cursor-not-allowed disabled:opacity-35"
          >
            Next
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}

function AyahBarButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="inline-flex h-11 min-h-11 min-w-11 flex-1 cursor-pointer items-center justify-center gap-[var(--space-2)] rounded-full border border-line bg-surface text-sm font-medium text-ink"
    >
      {children}
      {label}
    </button>
  );
}
