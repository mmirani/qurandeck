"use client";

import { useEffect, useState } from "react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { useMobileReader } from "@/lib/use-media-query";
import type { Verse } from "@/lib/quran/types";

function measureScrollRatio(root: HTMLElement, verseCount: number) {
  if (verseCount <= 0) return 0;

  const nodes = [...root.querySelectorAll<HTMLElement>("[data-verse-key]")];
  if (!nodes.length) return 0;

  const box = root.getBoundingClientRect();
  const marker = box.top + root.clientHeight * 0.38;
  let idx = 0;

  for (let i = 0; i < nodes.length; i++) {
    const rect = nodes[i].getBoundingClientRect();
    if (rect.top <= marker) idx = i;
  }

  let frac = 0;
  const current = nodes[idx];
  const next = nodes[idx + 1];
  if (next) {
    const start = current.getBoundingClientRect().top;
    const end = next.getBoundingClientRect().top;
    const span = end - start;
    if (span > 0) frac = Math.min(1, Math.max(0, (marker - start) / span));
  } else {
    const scrollMax = root.scrollHeight - root.clientHeight;
    if (scrollMax > 0 && root.scrollTop >= scrollMax - 6) return 1;
    frac = 1;
  }

  return Math.min(1, Math.max(0, (idx + frac) / verseCount));
}

function ayahRatio(verses: Verse[], selectedVerseKey: string | null) {
  if (verses.length === 0) return 0;
  const idx = Math.max(0, verses.findIndex((item) => item.verseKey === selectedVerseKey));
  return Math.min(1, (idx + 1) / verses.length);
}

export function useReadingProgressRatio(ayahMode: boolean) {
  const { verses, selectedVerseKey } = useMushaf();
  const [ratio, setRatio] = useState(0);

  useEffect(() => {
    if (verses.length === 0) {
      setRatio(0);
      return;
    }

    if (ayahMode) {
      setRatio(ayahRatio(verses, selectedVerseKey));
      return;
    }

    const root = document.getElementById("main-reader");
    if (!root) return;

    let frame = 0;
    const publish = () => {
      setRatio(measureScrollRatio(root, verses.length));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(publish);
    };

    publish();
    root.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(onScroll);
    observer.observe(root);
    const nodes = root.querySelectorAll("[data-verse-key]");
    nodes.forEach((node) => observer.observe(node));

    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [ayahMode, selectedVerseKey, verses]);

  return ratio;
}

export function ReadingProgressTrack({
  ratio,
  className = "",
  ariaLabel = "Progress through loaded ayahs",
}: {
  ratio: number;
  className?: string;
  ariaLabel?: string;
}) {
  const pct = Math.round(ratio * 100);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={ariaLabel}
      className={`h-[3px] w-full overflow-hidden bg-line/45 ${className}`}
    >
      <div
        className="h-full bg-gold transition-[width] duration-150 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function progressLabel(mode: string, ratio: number, total: number) {
  const at = Math.max(1, Math.round(ratio * total));
  const count = `${at} of ${total} ayahs`;
  return mode === "juz"
    ? `Reading progress through this juz, ${count}`
    : `Reading progress through this surah, ${count}`;
}

function useProgressVisible() {
  const { verses, preferences, loading } = useMushaf();
  const translationCols = preferences.showTranslation ? Math.max(preferences.translationIds.length, 0) : 0;
  const layers = Number(preferences.showArabic) + Number(preferences.showTransliteration) + translationCols;
  const arabicOnly = layers === 1 && preferences.showArabic;
  const book = Boolean(preferences.focusMode && arabicOnly);
  return !loading && !book && verses.length > 0;
}

/** Fixed bar on phones (above footer / audio). */
export function MobileReadingProgress({ ayahMode }: { ayahMode: boolean }) {
  const mobile = useMobileReader();
  const { verses, isPlaying, mode } = useMushaf();
  const ratio = useReadingProgressRatio(ayahMode);
  const visible = useProgressVisible();

  if (!mobile || !visible) return null;

  const audioLift = isPlaying ? "4rem" : "0px";
  const ayahLift = ayahMode ? "4.35rem" : "0px";
  const bottom = `calc(env(safe-area-inset-bottom, 0px) + ${audioLift} + ${ayahLift})`;
  const label = progressLabel(mode, ratio, verses.length);

  return (
    <div className="pointer-events-none fixed inset-x-0 z-[34] md:hidden" style={{ bottom }}>
      <ReadingProgressTrack ratio={ratio} className="rounded-none" ariaLabel={label} />
    </div>
  );
}

/** Docked to the bottom of the center reader column on tablet and desktop. */
export function PaneReadingProgress({ ayahMode }: { ayahMode: boolean }) {
  const mobile = useMobileReader();
  const { verses, mode } = useMushaf();
  const ratio = useReadingProgressRatio(ayahMode);
  const visible = useProgressVisible();

  if (mobile || !visible) return null;

  const label = progressLabel(mode, ratio, verses.length);

  return (
    <div className="reader-pane-progress hidden shrink-0 border-t border-line/60 bg-surface/95 backdrop-blur-sm md:block">
      <ReadingProgressTrack ratio={ratio} ariaLabel={label} />
    </div>
  );
}
