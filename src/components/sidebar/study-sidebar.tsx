"use client";

import { useEffect, useMemo, useState } from "react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { ArabesqueDivider } from "@/components/art/ornaments";
import { AccountRailCard } from "@/components/account/account-dashboard";
import { VerseNotePanel } from "@/components/reader/verse-note-panel";
import { anchorBox, HighlightPopover } from "@/components/reader/swatch-row";
import { highlightListCopy } from "@/lib/highlights";
import { verseRangeLabel } from "@/lib/verse-range";
import type { Highlight } from "@/lib/quran/types";

export function StudySidebar() {
  const {
    selectedVerseKey,
    selectedWord,
    verses,
    highlights,
    visibleVerseKeys,
    playWord,
    bookmarkWord,
    openModal,
    deleteHighlights,
    preferences,
  } = useMushaf();
  const verse = verses.find((item) => item.verseKey === selectedVerseKey) ?? verses[0];
  const viewKeys = visibleVerseKeys.length ? visibleVerseKeys : selectedVerseKey ? [selectedVerseKey] : [];
  const viewMarks = useMemo(() => {
    const keys = visibleVerseKeys.length ? visibleVerseKeys : selectedVerseKey ? [selectedVerseKey] : [];
    return keys.flatMap((key) => highlights.filter((item) => item.verseKey === key));
  }, [highlights, selectedVerseKey, visibleVerseKeys]);
  const words = verse?.words.filter((item) => item.charType === "word") ?? [];

  return (
    <aside className="mushaf-rail qd-pad flex h-full min-h-0 flex-col overflow-hidden" data-tour="study">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain">
      <AccountRailCard />
      <section className="rail-card qd-card rounded-2xl">
        <VerseNotePanel verseKey={verse?.verseKey} fieldId="verse-note" variant="rail" />
      </section>
      <section className="rail-card qd-card rounded-2xl">
        <div className="flex items-center justify-between gap-2">
          <h2 className="section-heading text-gold">Highlights</h2>
          <div className="flex items-center gap-3">
            {viewMarks.length > 0 ? (
              <button
                type="button"
                onClick={() => deleteHighlights(viewMarks.map((item) => item.id))}
                className="inline-flex min-h-11 cursor-pointer items-center text-sm text-danger underline-offset-2 hover:underline"
              >
                Clear
              </button>
            ) : null}
            <button type="button" onClick={() => openModal("highlights")} className="inline-flex min-h-11 cursor-pointer items-center text-sm text-gold underline-offset-2 hover:underline">
              See all
            </button>
          </div>
        </div>
        <p className="text-sm leading-6 text-ink-soft">{verseRangeLabel(viewKeys)}</p>
        <HighlightFeed marks={viewMarks} />
      </section>
      {preferences.showWordByWord ? (
      <section className="rail-card qd-card rounded-2xl">
        <h2 className="section-heading text-gold">Word by word</h2>
        <p className="text-sm leading-6 text-ink-soft">
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
                className={`qd-pad-sm block w-full min-h-11 cursor-pointer rounded-2xl text-left ${active ? "bg-highlight" : "hover:bg-canvas"}`}
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
            className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center text-xs text-gold"
          >
            Bookmark this word
          </button>
        ) : null}
      </section>
      ) : null}
      </div>
    </aside>
  );
}

function HighlightFeed({ marks }: { marks: Highlight[] }) {
  const { swatches, jumpToHit, verses, chapters, deleteHighlight, recolorHighlight } = useMushaf();
  const [menu, setMenu] = useState<null | {
    id: string;
    activeId: string;
    anchor: ReturnType<typeof anchorBox>;
    trigger: HTMLElement;
  }>(null);
  const [shown, setShown] = useState(marks);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const same =
      shown.length === marks.length && shown.every((item, index) => item.id === marks[index]?.id);
    if (same) return;
    const frame = requestAnimationFrame(() => setUpdating(true));
    const timer = window.setTimeout(() => {
      setShown(marks);
      setUpdating(false);
    }, 160);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [marks, shown]);

  if (shown.length === 0) {
    return (
      <div className={`highlight-feed ${updating ? "is-updating" : ""}`}>
        <p className="text-xs text-muted">Marks on the ayahs in view will appear here.</p>
      </div>
    );
  }

  return (
    <>
    <ul className={`highlight-feed flex flex-col gap-2 ${updating ? "is-updating" : ""}`}>
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
          <li key={item.id} className="qd-pad-sm flex items-start gap-2 rounded-2xl bg-surface">
            <button
              type="button"
              data-highlight-trigger=""
              aria-label={`Change ${pen?.name ?? "highlight"} colour`}
              onClick={(event) => {
                const el = event.currentTarget;
                setMenu((current) =>
                  current?.id === item.id
                    ? null
                    : { id: item.id, activeId: item.swatchId, anchor: anchorBox(el), trigger: el },
                );
              }}
              className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full"
            >
              <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ background: pen?.color ?? "#F5D76E" }} />
            </button>
            <button
              type="button"
              className="min-h-11 min-w-0 flex-1 cursor-pointer py-1 text-left"
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
              <p className="text-xs text-gold">{copy.title}</p>
              {copy.body ? <p className="line-clamp-2 text-xs">{copy.body}</p> : null}
            </button>
            <button
              type="button"
              aria-label={`Remove highlight ${copy.title}`}
              onClick={() => deleteHighlight(item.id)}
              className="shrink-0 cursor-pointer rounded-full px-2 py-1 text-xs text-danger hover:bg-canvas"
            >
              Remove
            </button>
          </li>
        );
      })}
    </ul>
    {menu ? (
      <HighlightPopover
        key={menu.id}
        menuId="sidebar-highlight-color-menu"
        anchor={menu.anchor}
        returnFocus={menu.trigger}
        swatches={swatches}
        activeId={menu.activeId}
        eraseLabel="Remove"
        onPick={(swatchId) => {
          recolorHighlight(menu.id, swatchId);
          setMenu(null);
        }}
        onErase={() => {
          deleteHighlight(menu.id);
          setMenu(null);
        }}
        onClose={() => setMenu(null)}
      />
    ) : null}
    </>
  );
}
