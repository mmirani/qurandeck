"use client";

import { createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { useMushaf } from "@/components/providers/mushaf-provider";
import type { SurahSeed } from "@/lib/quran/surah-seed";
import type { Chapter, Verse } from "@/lib/quran/types";

const SurahSeedContext = createContext<SurahSeed | null>(null);

export function SurahSeedProvider({
  seed,
  children,
}: {
  seed: SurahSeed | null;
  children: React.ReactNode;
}) {
  return <SurahSeedContext.Provider value={seed}>{children}</SurahSeedContext.Provider>;
}

function requestedSurahId(pathname: string) {
  const match = pathname.match(/^\/surah\/(\d+)/);
  if (match) {
    const id = Number(match[1]);
    return id >= 1 && id <= 114 ? id : null;
  }
  if (pathname === "/read") return 1;
  return null;
}

export function useDisplayedReading(): {
  chapter: Chapter | null;
  verses: Verse[];
  introduction: string;
  introductionSource: string;
  loading: boolean;
  error: string | null;
} {
  const mushaf = useMushaf();
  const seed = useContext(SurahSeedContext);
  const requested = requestedSurahId(usePathname());
  if (requested != null && mushaf.chapter?.id === requested && mushaf.verses.length > 0) {
    return {
      chapter: mushaf.chapter,
      verses: mushaf.verses,
      introduction: mushaf.introduction,
      introductionSource: mushaf.introductionSource,
      loading: false,
      error: mushaf.error,
    };
  }
  if (seed && requested != null && seed.chapter.id === requested) {
    return {
      chapter: seed.chapter,
      verses: seed.verses,
      introduction: seed.introduction,
      introductionSource: seed.introductionSource,
      loading: false,
      error: null,
    };
  }
  return {
    chapter: mushaf.chapter,
    verses: mushaf.verses,
    introduction: mushaf.introduction,
    introductionSource: mushaf.introductionSource,
    loading: mushaf.loading,
    error: mushaf.error,
  };
}
