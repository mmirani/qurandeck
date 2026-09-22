"use client";

import { useEffect, useMemo, useState } from "react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { AudioPlayer } from "@/components/audio/audio-player";
import { ArabesqueDivider } from "@/components/art/ornaments";
import { highlightListCopy } from "@/lib/highlights";
import type { Highlight } from "@/lib/quran/types";
import { AccountRailCard } from "@/components/account/account-dashboard";

export function StudySidebar() {
  const {
    selectedVerseKey,
    selectedWord,
    verses,
    notes,
    highlights,
    visibleVerseKeys,
    saveNote,
    playWord,
    bookmarkWord,
    openModal,
    deleteHighlights,
    preferences,
  } = useMushaf();
  const verse = verses.find((item) => item.verseKey === selectedVerseKey) ?? verses[0];
  const note = notes.find((item) => item.verseKey === verse?.verseKey);
  const viewKeys = visibleVerseKeys.length ? visibleVerseKeys : selectedVerseKey ? [selectedVerseKey] : [];
  const viewMarks = useMemo(() => {
    const keys = visibleVerseKeys.length ? visibleVerseKeys : selectedVerseKey ? [selectedVerseKey] : [];
    return keys.flatMap((key) => highlights.filter((item) => item.verseKey === key));
  }, [highlights, selectedVerseKey, visibleVerseKeys]);
  const [draft, setDraft] = useState(note?.body ?? "");
  const [savedAgo, setSavedAgo] = useState("Unsaved");

  useEffect(() => {
    setDraft(note?.body ?? "");
    setSavedAgo(note ? "Saved" : "Unsaved");
  }, [note, verse?.verseKey]);

  const words = verse?.words.filter((item) => item.charType === "word") ?? [];

  return (
    <aside className="mushaf-rail flex h-full min-h-0 flex-col overflow-hidden p-4" data-tour="study">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain">
      <AccountRailCard />
      <section className="rail-card rounded-2xl p-4">
        <h2 className="section-heading text-gold">Notes</h2>
        <p className="mt-1 text-base">Ayah {verse?.verseKey ?? "—"}</p>
        {note ? (
          <p className="mt-1 rounded-xl bg-gold/15 px-2 py-1 text-xs text-gold">This ayah has a saved note</p>
        ) : (
          <p className="text-xs text-muted">{savedAgo}</p>
        )}
        <textarea
          id="verse-note"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a personal note about this ayah…"
          className="mt-3 h-28 w-full resize-none rounded-2xl border border-gold/20 bg-transparent p-3 text-sm"
        />
        <button
          type="button"
          disabled={!verse}
          onClick={() => {
            if (!verse) return;
            saveNote(verse.verseKey, draft);
            setSavedAgo("Saved just now");
          }}
          className="mt-3 h-11 w-full cursor-pointer rounded-full bg-gold/20 text-base text-gold"
        >
          Save note
        </button>
      </section>
      <section className="rail-card rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="section-heading text-gold">Highlights</h2>
          <div className="flex items-center gap-3">
            {viewMarks.length > 0 ? (
              <button
                type="button"
                onClick={() => deleteHighlights(viewMarks.map((item) => item.id))}
                className="cursor-pointer text-sm text-danger underline-offset-2 hover:underline"
              >
                Clear
              </button>
            ) : null}
            <button type="button" onClick={() => openModal("highlights")} className="cursor-pointer text-sm text-gold underline-offset-2 hover:underline">
              See all
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm text-ink-soft">{rangeLabel(viewKeys)}</p>
        <HighlightFeed marks={viewMarks} />
      </section>
      {preferences.showWordByWord ? (
      <section className="rail-card rounded-2xl p-4">
        <h2 className="section-heading text-gold">Word by word</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Tap a word in the verse to hear it, without starting the whole chapter.
        </p>
        <ArabesqueDivider className="my-3 text-gold/50" />
        <div className="space-y-3">
          {words.map((word) => {
            const active = selectedWord?.location === word.location;
            return (
              <button
                key={word.location || word.position}
                type="button"
                onClick={() => playWord(word)}
                className={`block w-full cursor-pointer rounded-2xl px-3 py-2 text-left ${active ? "bg-highlight" : "hover:bg-canvas"}`}
              >
                <p dir="rtl" lang="ar" className="font-arabic text-xl">
                  {word.textUthmani}
                </p>
                <p className="text-xs italic text-ink-soft">{word.transliteration}</p>
                <p className="text-sm">{word.translation}</p>
              </button>
            );
          })}
        </div>
        {verse && selectedWord ? (
          <button
            type="button"
            onClick={() => bookmarkWord(verse, selectedWord)}
            className="mt-3 w-full cursor-pointer text-xs text-gold"
          >
            Bookmark this word
          </button>
        ) : null}
      </section>
      ) : null}
      </div>
      <div className="mt-4 shrink-0">
        <AudioPlayer />
      </div>
    </aside>
  );
}

function rangeLabel(keys: string[]) {
  if (keys.length === 0) return "Scroll the mushaf";
  if (keys.length === 1) return `In view · ${keys[0]}`;
  return `In view · ${keys[0]} – ${keys[keys.length - 1]}`;
}

function HighlightFeed({ marks }: { marks: Highlight[] }) {
  const { swatches, jumpToHit, verses, chapters, deleteHighlight } = useMushaf();
  const [shown, setShown] = useState(marks);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const same =
      shown.length === marks.length && shown.every((item, index) => item.id === marks[index]?.id);
    if (same) return;
    setUpdating(true);
    const timer = window.setTimeout(() => {
      setShown(marks);
      setUpdating(false);
    }, 160);
    return () => window.clearTimeout(timer);
  }, [marks, shown]);

  if (shown.length === 0) {
    return (
      <div className={`highlight-feed mt-3 ${updating ? "is-updating" : ""}`}>
        <p className="text-xs text-muted">Marks on the ayahs in view will appear here.</p>
      </div>
    );
  }

  return (
    <ul className={`highlight-feed mt-3 space-y-2 ${updating ? "is-updating" : ""}`}>
      {shown.map((item) => {
        const pen = swatches.find((swatch) => swatch.id === item.swatchId);
        const verse = verses.find((entry) => entry.verseKey === item.verseKey);
        const chapter = chapters.find((entry) => entry.id === Number(item.verseKey.split(":")[0]));
        const copy = highlightListCopy(item, {
          chapterName: chapter?.nameSimple,
          translation: verse?.translation,
          penName: item.label?.trim() || pen?.name,
        });
        return (
          <li key={item.id} className="flex items-start gap-2 rounded-2xl bg-surface px-3 py-2">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: pen?.color ?? "#F5D76E" }} />
            <button
              type="button"
              className="min-w-0 flex-1 cursor-pointer text-left"
              onClick={() => {
                const [chapterId, verseNumber] = item.verseKey.split(":").map(Number);
                jumpToHit({
                  verseKey: item.verseKey,
                  chapterId,
                  verseNumber,
                  textArabic: item.text,
                  textTranslation: copy.body || item.text,
                  source: "jump",
                });
              }}
            >
              <p className="text-[10px] text-gold">{copy.title}</p>
              {copy.body ? <p className="line-clamp-2 text-xs">{copy.body}</p> : null}
            </button>
            <button
              type="button"
              aria-label={`Remove highlight ${copy.title}`}
              onClick={() => deleteHighlight(item.id)}
              className="shrink-0 cursor-pointer rounded-full px-2 py-1 text-[10px] text-danger hover:bg-canvas"
            >
              Remove
            </button>
          </li>
        );
      })}
    </ul>
  );
}
