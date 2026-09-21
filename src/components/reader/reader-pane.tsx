"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { ReaderToolbar } from "@/components/reader/reader-toolbar";
import { VerseCard } from "@/components/reader/verse-card";

export function ReaderPane() {
  const {
    verses,
    loading,
    error,
    chapter,
    openSurah,
    playingVerseKey,
    mode,
    setSearchOpen,
    preferences,
    setVisibleVerseKeys,
    introduction,
  } = useMushaf();
  const scroller = useRef<HTMLDivElement>(null);
  const translationCols = preferences.showTranslation ? Math.max(preferences.translationIds.length, 0) : 0;
  const layers = Number(preferences.showArabic) + Number(preferences.showTransliteration) + translationCols;

  useEffect(() => {
    if (!playingVerseKey || !preferences.autoFollow) return;
    const node = scroller.current?.querySelector(`[data-verse-key="${playingVerseKey}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [playingVerseKey, preferences.autoFollow]);

  useEffect(() => {
    const root = scroller.current;
    if (!root || loading) {
      setVisibleVerseKeys([]);
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
  }, [loading, verses, setVisibleVerseKeys]);

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
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <ReaderToolbar />
      <div ref={scroller} id="main-reader" className="@container min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 md:px-8 lg:px-10">
        {error ? (
          <p className="rounded-3xl border border-danger/40 bg-surface p-6 text-danger">{error}</p>
        ) : null}
        {loading ? (
          <div className="space-y-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-3xl bg-surface" />
            ))}
          </div>
        ) : (
          <div
            className="reader-stream flex flex-col gap-5 pb-36"
            data-layers={layers}
            data-size={preferences.fontSize >= 34 ? "xl" : undefined}
            data-script={layers === 1 && preferences.showArabic ? "ar" : undefined}
          >
            {mode === "surah" && preferences.showIntroduction && introduction ? (
              <section className="rounded-3xl border border-line bg-surface p-5 md:p-6">
                <h3 className="section-heading text-gold-deep">Introduction</h3>
                <p className="mt-3 text-base leading-relaxed text-ink">{introduction}</p>
              </section>
            ) : null}
            {verses.map((verse, index) => {
              const prev = verses[index - 1];
              const showSurahLabel = mode === "juz" && prev?.chapterId !== verse.chapterId;
              return <VerseCard key={verse.verseKey} verse={verse} showSurahLabel={showSurahLabel} />;
            })}
            {chapter && mode === "surah" ? (
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  disabled={chapter.id <= 1}
                  onClick={() => openSurah(chapter.id - 1)}
                  className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  type="button"
                  disabled={chapter.id >= 114}
                  onClick={() => openSurah(chapter.id + 1)}
                  className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4 disabled:opacity-40"
                >
                  Next Surah <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
