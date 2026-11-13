"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { getSurah } from "@/lib/quran/client";
import { requestedAyahNumber, seedMatchesReading, type SurahSeed } from "@/lib/quran/surah-seed";
import type { Chapter, Verse } from "@/lib/quran/types";

const SurahSeedContext = createContext<SurahSeed | null>(null);

export function SurahSeedProvider({
  seed,
  children,
}: {
  seed: SurahSeed | null;
  children: React.ReactNode;
}) {
  return (
    <SurahSeedContext.Provider value={seed}>
      <SurahSeedSync />
      {children}
    </SurahSeedContext.Provider>
  );
}

function SurahSeedSync() {
  const seed = useContext(SurahSeedContext);
  const pathname = usePathname();
  const { preferences, adoptSurahSeed, appendSurahVerses, loadSurah, reportReadingError } = useMushaf();
  const restRequested = useRef("");

  useEffect(() => {
    const chapterId = requestedSurahId(pathname);
    if (chapterId == null) return;
    const verse = requestedAyahNumber(window.location.hash, new URLSearchParams(window.location.search).get("ayah"));
    if (!seedMatchesReading(seed, chapterId, preferences.translationIds)) {
      restRequested.current = "";
      void loadSurah(chapterId, verse);
      return;
    }
    adoptSurahSeed(seed, verse);
    if (!seed.partial) return;
    const restKey = `${chapterId}:${seed.translationKey}`;
    if (restRequested.current === restKey) return;
    restRequested.current = restKey;
    void getSurah(chapterId, preferences.translationIds, preferences.recitationId)
      .then((data) => {
        appendSurahVerses(chapterId, seed.translationKey, data.verses);
      })
      .catch(() => {
        restRequested.current = "";
        reportReadingError("Could not load the rest of this surah");
      });
  }, [
    adoptSurahSeed,
    appendSurahVerses,
    loadSurah,
    pathname,
    preferences.recitationId,
    preferences.translationIds,
    reportReadingError,
    seed,
  ]);

  return null;
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
