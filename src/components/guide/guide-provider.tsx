"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { useReaderChrome } from "@/components/shell/reader-chrome";
import { LESSONS, WELCOME_TOUR, type TourId, type TourStep } from "@/lib/guide/catalog";
import { matchHelper } from "@/lib/guide/commands";
import { performHelper, type PendingJob } from "@/lib/guide/perform";
import {
  GUIDE_EVENT,
  defaultGuideProgress,
  loadGuideProgress,
  markLessonSeen,
  markWelcomeDone,
  type GuideProgress,
} from "@/lib/guide/progress";
import { defaultCorner, loadCompanionPose, saveCompanionPose } from "@/lib/companion";
import { downloadLibraryJson, downloadStatsCsv } from "@/lib/export-library";
import { sanaCommandName } from "@/lib/usage-catalog";
import { trackUsage } from "@/lib/usage-client";

type GuideKind = "welcome" | "lesson" | null;

type GuideContextValue = {
  progress: GuideProgress;
  active: boolean;
  kind: GuideKind;
  steps: TourStep[];
  index: number;
  step: TourStep | null;
  reply: string | null;
  suggestions: string[];
  startWelcome: () => void;
  startLesson: (id: TourId) => void;
  next: () => void;
  back: () => void;
  skip: () => void;
  ask: (text: string) => void;
};

const GuideContext = createContext<GuideContextValue | null>(null);

export function useGuide() {
  const value = useContext(GuideContext);
  if (!value) throw new Error("useGuide needs GuideProvider");
  return value;
}

export function GuideProvider({ children }: { children: ReactNode }) {
  const {
    preferences,
    updatePreferences,
    verses,
    selectedVerseKey,
    mode,
    currentJuz,
    selectedWord,
    playFrom,
    playVerse,
    playWord,
    togglePlay,
    isPlaying,
    openSurah,
    openJuz,
    selectVerse,
    toggleBookmarkVerse,
    highlightAyah,
    clearVerseHighlights,
    saveNote,
    runSearch,
    setSearchQuery,
    openModal,
    highlights,
    swatches,
    bookmarks,
    notes,
    translations,
    recitations,
    user,
    progress: readingProgress,
    loading,
    chapter,
  } = useMushaf();
  const { openStudy } = useReaderChrome();
  const [progress, setProgress] = useState<GuideProgress>(defaultGuideProgress);
  const autoStarted = useRef(false);
  const [kind, setKind] = useState<GuideKind>(null);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [reply, setReply] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(["Play this surah", "Go to 2:255", "Add a note", "Where is search"]);
  const pendingRef = useRef<PendingJob | null>(null);

  const openSteps = useCallback((nextSteps: TourStep[], nextKind: GuideKind, startAt = 0) => {
    updatePreferences({ focusMode: false, showNavRail: true, showStudyRail: true });
    const pose = loadCompanionPose();
    if (pose.hidden) saveCompanionPose({ ...defaultCorner(), hidden: false });
    setSteps(nextSteps);
    setKind(nextKind);
    setIndex(startAt);
  }, [updatePreferences]);

  const startWelcome = useCallback(() => {
    trackUsage({ name: "tour_started" });
    openSteps(WELCOME_TOUR, "welcome");
  }, [openSteps]);

  const startLesson = useCallback(
    (id: TourId) => {
      const lesson = LESSONS.find((item) => item.id === id);
      if (!lesson) return;
      openSteps([lesson], "lesson");
    },
    [openSteps],
  );

  const finish = useCallback((completed: boolean) => {
    if (completed) trackUsage({ name: "tour_completed" });
    setProgress((current) => {
      const next = kind === "welcome" ? markWelcomeDone(current) : current;
      const step = steps[index];
      return step ? markLessonSeen(next, step.id) : next;
    });
    setKind(null);
    setSteps([]);
    setIndex(0);
  }, [index, kind, steps]);

  const next = useCallback(() => {
    const step = steps[index];
    if (step) setProgress((current) => markLessonSeen(current, step.id));
    if (index >= steps.length - 1) finish(kind === "welcome");
    else setIndex((value) => value + 1);
  }, [finish, index, kind, steps]);

  const back = useCallback(() => {
    setIndex((value) => Math.max(0, value - 1));
  }, []);

  const skip = useCallback(() => {
    finish(false);
  }, [finish]);

  const ask = useCallback((text: string) => {
    const match = matchHelper(text);
    if (match.action === "refuse") trackUsage({ name: "sana_refusal" });
    else if (match.action === "none") trackUsage({ name: "sana_unknown" });
    else {
      const command = sanaCommandName(match.action);
      if (command) trackUsage({ name: "sana_command", command });
      else trackUsage({ name: "sana_unknown" });
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const replyText = performHelper(match, {
      verses,
      chapterId: chapter?.id ?? null,
      mode,
      currentJuz,
      selectedVerseKey,
      selectedWord,
      isPlaying,
      fontSize: preferences.fontSize,
      focusMode: preferences.focusMode,
      showTafsir: preferences.showTafsir,
      showTransliteration: preferences.showTransliteration,
      translationIds: preferences.translationIds,
      signedIn: Boolean(user),
      notes,
      bookmarks,
      translations,
      recitations,
      versesRead: readingProgress.versesRead.length,
      surahsFinished: readingProgress.surahsRead.length,
      streak: readingProgress.streak,
      openSurah,
      openJuz,
      selectVerse,
      playFrom: (key) => void playFrom(key),
      playVerse: (key) => void playVerse(key),
      playWord: (word) => void playWord(word),
      togglePlay,
      updatePreferences,
      openModal,
      toggleBookmark: toggleBookmarkVerse,
      highlightAyah,
      clearHighlights: clearVerseHighlights,
      saveNote,
      runSearch: (query) => {
        setSearchQuery(query);
        void runSearch(query);
      },
      focusSearch: () => {
        window.setTimeout(() => document.getElementById("quran-search")?.focus(), 80);
      },
      focusNote: (verseKey) => {
        selectVerse(verseKey);
        updatePreferences({ showStudyRail: true, focusMode: false });
        openStudy();
        window.setTimeout(() => document.getElementById("verse-note")?.focus(), 180);
      },
      openStudy: () => {
        updatePreferences({ showStudyRail: true, focusMode: false });
        openStudy();
      },
      startWelcome,
      startLesson,
      rest: () => saveCompanionPose({ ...loadCompanionPose(), hidden: true }),
      download: (kind) => {
        const input = {
          progress: readingProgress,
          bookmarks,
          notes,
          highlights,
          swatches,
          preferences,
          user,
        };
        if (kind === "stats") downloadStatsCsv(input);
        else downloadLibraryJson(input);
      },
      schedule: (job) => {
        pendingRef.current = job;
      },
      reveal: (verseNumber) => {
        window.setTimeout(() => {
          document.getElementById(`ayah-${verseNumber}`)?.scrollIntoView({
            block: "center",
            behavior: reduce ? "auto" : "smooth",
          });
        }, 60);
      },
    });
    setReply(replyText);
    setSuggestions(match.suggestions);
  }, [
    bookmarks,
    chapter?.id,
    clearVerseHighlights,
    currentJuz,
    highlightAyah,
    highlights,
    isPlaying,
    mode,
    notes,
    openJuz,
    openModal,
    openStudy,
    openSurah,
    playFrom,
    playVerse,
    playWord,
    preferences,
    readingProgress,
    recitations,
    runSearch,
    saveNote,
    selectVerse,
    selectedVerseKey,
    selectedWord,
    setSearchQuery,
    startLesson,
    startWelcome,
    swatches,
    toggleBookmarkVerse,
    togglePlay,
    translations,
    updatePreferences,
    user,
    verses,
  ]);

  useEffect(() => {
    const job = pendingRef.current;
    if (!job || verses.length === 0) return;
    if (job.kind === "play-first") {
      pendingRef.current = null;
      void playFrom(verses[0].verseKey);
      return;
    }
    const verse = verses.find((item) => item.verseKey === job.verseKey);
    if (!verse) return;
    pendingRef.current = null;
    selectVerse(verse.verseKey);
    if (job.kind === "play-verse") void playVerse(verse.verseKey);
    else if (job.kind === "play-from") void playFrom(verse.verseKey);
    else if (job.kind === "bookmark") toggleBookmarkVerse(verse);
    else if (job.kind === "highlight") highlightAyah(verse);
    else if (job.kind === "clear-highlight") clearVerseHighlights(verse.verseKey);
    else if (job.kind === "tafsir") updatePreferences({ showTafsir: true });
    else if (job.kind === "save-note" && job.noteBody) saveNote(verse.verseKey, job.noteBody);
    else if (job.kind === "focus-note") {
      updatePreferences({ showStudyRail: true, focusMode: false });
      openStudy();
      window.setTimeout(() => document.getElementById("verse-note")?.focus(), 180);
    }
  }, [clearVerseHighlights, highlightAyah, openStudy, playFrom, playVerse, saveNote, selectVerse, toggleBookmarkVerse, updatePreferences, verses]);

  useEffect(() => {
    const boot = (force = false) => {
      const current = loadGuideProgress();
      setProgress(current);
      if (!current.pendingWelcome || current.completedWelcome) return;
      if (!force && autoStarted.current) return;
      autoStarted.current = true;
      startWelcome();
    };
    boot();
    const onGuide = () => boot(true);
    window.addEventListener(GUIDE_EVENT, onGuide);
    return () => window.removeEventListener(GUIDE_EVENT, onGuide);
  }, [startWelcome]);

  useEffect(() => {
    if (!kind) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [kind, skip]);

  const value = useMemo<GuideContextValue>(
    () => ({
      progress,
      active: Boolean(kind) && !loading,
      kind,
      steps,
      index,
      step: steps[index] ?? null,
      reply,
      suggestions,
      startWelcome,
      startLesson,
      next,
      back,
      skip,
      ask,
    }),
    [ask, back, index, kind, loading, next, progress, reply, skip, startLesson, startWelcome, steps, suggestions],
  );

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}
