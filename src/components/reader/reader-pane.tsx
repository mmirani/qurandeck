"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { MushafPage } from "@/components/art/ornaments";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { useDisplayedReading } from "@/components/reader/reading-seed";
import { ReaderHint } from "@/components/reader/reader-hint";
import { QuranCredit } from "@/components/site/quran-credit";
import { MushafStream } from "@/components/reader/mushaf-stream";
import { ReaderToolbar } from "@/components/reader/reader-toolbar";
import { AyahReaderMobile } from "@/components/reader/ayah-reader-mobile";
import { NextSurahLink } from "@/components/reader/next-surah-link";
import { VerseCard } from "@/components/reader/verse-card";
import { MobileReadingProgress, PaneReadingProgress } from "@/components/reader/reading-progress";
import { introductionCredit } from "@/lib/quran/chapter-info";
import { useMobileReader } from "@/lib/use-media-query";

export function ReaderPane() {
  const {
    playingVerseKey,
    isPlaying,
    mode,
    setSearchOpen,
    preferences,
    selectedVerseKey,
    pendingScrollVerseKey,
    clearPendingScrollVerse,
    setVisibleVerseKeys,
    currentJuz,
  } = useMushaf();
  const { verses, loading, error, chapter, introduction, introductionSource } = useDisplayedReading();
  const scroller = useRef<HTMLDivElement>(null);
  const translationCols = preferences.showTranslation ? Math.max(preferences.translationIds.length, 0) : 0;
  const layers = Number(preferences.showArabic) + Number(preferences.showTransliteration) + translationCols;
  const arabicOnly = layers === 1 && preferences.showArabic;
  const traditional = arabicOnly && (preferences.traditionalPage || preferences.focusMode);
  const mobile = useMobileReader();
  const ayahMode = mobile && preferences.mobileReadingMode === "ayah" && !traditional;

  useEffect(() => {
    if (ayahMode || !playingVerseKey || !preferences.autoFollow) return;
    const node = scroller.current?.querySelector(`[data-verse-key="${playingVerseKey}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [ayahMode, playingVerseKey, preferences.autoFollow]);

  useEffect(() => {
    if (loading || !pendingScrollVerseKey) return;
    if (ayahMode) {
      clearPendingScrollVerse();
      return;
    }
    const root = scroller.current;
    if (!root) return;

    let cancelled = false;
    const scrollToTarget = () => {
      if (cancelled) return false;
      const node = root.querySelector(`[data-verse-key="${pendingScrollVerseKey}"]`);
      if (!node) return false;
      node.scrollIntoView({ behavior: "smooth", block: "start" });
      clearPendingScrollVerse();
      return true;
    };

    let frame = 0;
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        scrollToTarget();
      });
    });
    const retry = window.setTimeout(() => {
      scrollToTarget();
    }, 160);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(retry);
    };
  }, [ayahMode, clearPendingScrollVerse, loading, pendingScrollVerseKey, verses]);

  useEffect(() => {
    const root = scroller.current;
    if (!root || loading || ayahMode) {
      setVisibleVerseKeys(ayahMode && selectedVerseKey ? [selectedVerseKey] : []);
      return;
    }

    const nodes = [...root.querySelectorAll<HTMLElement>("[data-verse-key]")];
    let frame = 0;

    const publish = () => {
      const box = root.getBoundingClientRect();
      const line = box.top + Math.round(root.clientHeight * 0.32);
      const ranked: { key: string; dist: number }[] = [];
      for (const node of nodes) {
        const key = node.dataset.verseKey;
        if (!key) continue;
        const rect = node.getBoundingClientRect();
        if (rect.bottom <= box.top + 4 || rect.top >= box.bottom - 4) continue;
        const onLine = rect.top <= line && rect.bottom >= line;
        ranked.push({ key, dist: onLine ? 0 : Math.abs(rect.top - line) });
      }
      ranked.sort((a, b) => a.dist - b.dist);
      setVisibleVerseKeys(ranked.map((item) => item.key));
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(publish);
    };

    const observer = new IntersectionObserver(onScroll, {
      root,
      threshold: [0, 0.08, 0.25, 0.5, 0.75],
    });
    nodes.forEach((node) => observer.observe(node));
    root.addEventListener("scroll", onScroll, { passive: true });
    publish();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      root.removeEventListener("scroll", onScroll);
    };
  }, [ayahMode, loading, selectedVerseKey, verses, setVisibleVerseKeys]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("#quran-search") && !target?.closest("[data-search-panel]")) {
        setSearchOpen(false);
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [setSearchOpen]);

  return (
    <div data-focus={preferences.focusMode ? "on" : "off"} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <ReaderToolbar />
      <MobileReadingProgress ayahMode={ayahMode} />
      <div
        ref={scroller}
        id="main-reader"
        className={`reader-scroll-surface @container flex min-h-0 flex-1 flex-col ${
          ayahMode ? "overflow-hidden p-0" : "qd-reader-inset overflow-y-auto overscroll-contain"
        } ${traditional && preferences.focusMode ? "mushaf-desk" : ""} ${
          ayahMode ? "pb-0" : isPlaying ? "pb-28 lg:pb-8" : "pb-8"
        }`}
      >
        {!loading && !preferences.focusMode ? <ReaderHint /> : null}
        {error ? (
          <p className="qd-pad rounded-3xl border border-danger/40 bg-surface text-danger">{error}</p>
        ) : null}
        {loading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-3xl bg-surface" />
            ))}
          </div>
        ) : ayahMode ? (
          <AyahReaderMobile verses={verses} mode={mode} />
        ) : (
          <div
            className="reader-stream flex flex-col gap-4 pb-24 xl:pb-8"
            data-layers={layers}
            data-size={preferences.fontSize >= 34 ? "xl" : undefined}
            data-script={arabicOnly ? "ar" : undefined}
            data-traditional={traditional ? "on" : undefined}
          >
            {mode === "surah" && !preferences.focusMode && preferences.showIntroduction && introduction ? (
              <SurahIntroduction
                introduction={introduction}
                source={introductionSource}
                chapterId={chapter?.id}
              />
            ) : null}
            {traditional ? (
              <MushafPage
                titleArabic={mode === "surah" ? chapter?.nameArabic : undefined}
                titleLatin={
                  mode === "surah" ? chapter?.nameSimple : currentJuz ? `Juz ${currentJuz}` : undefined
                }
              >
                <MushafStream verses={verses} mode={mode} />
              </MushafPage>
            ) : (
              verses.map((verse, index) => {
                const prev = verses[index - 1];
                const showSurahLabel = mode === "juz" && prev?.chapterId !== verse.chapterId;
                return (
                  <VerseCard
                    key={verse.verseKey}
                    verse={verse}
                    showSurahLabel={showSurahLabel}
                    tourAnchor={index === 0}
                  />
                );
              })
            )}
            {chapter && mode === "surah" ? (
              <div className="flex items-center justify-between pt-4">
                {chapter.id > 1 ? (
                  <Link
                    href={`/surah/${chapter.id - 1}`}
                    className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous surah
                  </Link>
                ) : (
                  <span className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 opacity-40">
                    <ChevronLeft className="h-4 w-4" /> Previous surah
                  </span>
                )}
                {chapter.id < 114 ? (
                  <Link
                    href={`/surah/${chapter.id + 1}`}
                    className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4"
                  >
                    Next surah <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 opacity-40">
                    Next surah <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </div>
            ) : null}
            {chapter && mode === "surah" ? <NextSurahLink chapterId={chapter.id} /> : null}
            <QuranCredit className="px-1 pt-2" />
          </div>
        )}
      </div>
      <PaneReadingProgress ayahMode={ayahMode} />
    </div>
  );
}

function SurahIntroduction({
  introduction,
  source,
  chapterId,
}: {
  introduction: string;
  source: string;
  chapterId?: number;
}) {
  const [open, setOpen] = useState(false);
  const [seenChapter, setSeenChapter] = useState(chapterId);
  if (chapterId !== seenChapter) {
    setSeenChapter(chapterId);
    setOpen(false);
  }
  const credit = introductionCredit(source);

  return (
    <section className="qd-card rounded-3xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full min-h-11 cursor-pointer items-center justify-between gap-3 text-left"
      >
        <span className="section-heading text-gold-deep">Introduction</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-ink-soft transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <>
          <p className="text-base leading-relaxed text-ink">{introduction}</p>
          {credit ? <p className="text-xs leading-5 text-ink-soft">{credit}</p> : null}
        </>
      ) : null}
    </section>
  );
}
