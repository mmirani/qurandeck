"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FONT_SIZE_MAX, FONT_SIZE_MIN } from "@/lib/appearance";
import { useMushaf } from "@/components/providers/mushaf-provider";
import { LESSONS, WELCOME_TOUR, type TourId, type TourStep } from "@/lib/guide/catalog";
import { matchHelper } from "@/lib/guide/commands";
import {
  GUIDE_EVENT,
  defaultGuideProgress,
  loadGuideProgress,
  markLessonSeen,
  markWelcomeDone,
  type GuideProgress,
} from "@/lib/guide/progress";
import { defaultCorner, loadCompanionPose, saveCompanionPose } from "@/lib/companion";

type GuideKind = "welcome" | "lesson" | null;

type GuideContextValue = {
  progress: GuideProgress;
  active: boolean;
  kind: GuideKind;
  steps: TourStep[];
  index: number;
  step: TourStep | null;
  reply: string | null;
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
    playFrom,
    togglePlay,
    isPlaying,
    highlightAyah,
    loading,
  } = useMushaf();
  const [progress, setProgress] = useState<GuideProgress>(defaultGuideProgress);
  const autoStarted = useRef(false);
  const [kind, setKind] = useState<GuideKind>(null);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [reply, setReply] = useState<string | null>(null);

  const openSteps = useCallback((nextSteps: TourStep[], nextKind: GuideKind, startAt = 0) => {
    updatePreferences({ focusMode: false, showNavRail: true, showStudyRail: true });
    const pose = loadCompanionPose();
    if (pose.hidden) saveCompanionPose({ ...defaultCorner(), hidden: false });
    setSteps(nextSteps);
    setKind(nextKind);
    setIndex(startAt);
    setReply(null);
  }, [updatePreferences]);

  const startWelcome = useCallback(() => {
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

  const finish = useCallback(() => {
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
    if (index >= steps.length - 1) finish();
    else setIndex((value) => value + 1);
  }, [finish, index, steps]);

  const back = useCallback(() => {
    setIndex((value) => Math.max(0, value - 1));
  }, []);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const ask = useCallback(
    (text: string) => {
      const match = matchHelper(text);
      setReply(match.reply);
      if (match.action === "tour") startWelcome();
      else if (match.action === "lesson" && match.lesson) startLesson(match.lesson);
      else if (match.action === "play-surah" && verses[0]) void playFrom(verses[0].verseKey);
      else if (match.action === "play-from") {
        const key = selectedVerseKey ?? verses[0]?.verseKey;
        if (key) void playFrom(key);
      } else if (match.action === "pause" && isPlaying) togglePlay();
      else if (match.action === "bigger") {
        updatePreferences({ fontSize: Math.min(FONT_SIZE_MAX, preferences.fontSize + 2) });
      } else if (match.action === "smaller") {
        updatePreferences({ fontSize: Math.max(FONT_SIZE_MIN, preferences.fontSize - 2) });
      } else if (match.action === "highlight") {
        const verse = verses.find((item) => item.verseKey === selectedVerseKey) ?? verses[0];
        if (verse) highlightAyah(verse);
      } else if (match.action === "study") {
        updatePreferences({ showStudyRail: true, focusMode: false });
        startLesson("study");
      } else if (match.action === "focus") {
        updatePreferences({ focusMode: !preferences.focusMode });
      } else if (match.action === "search") {
        startLesson("search");
        window.setTimeout(() => document.getElementById("quran-search")?.focus(), 200);
      } else if (match.action === "rest") {
        saveCompanionPose({ ...loadCompanionPose(), hidden: true });
      }
    },
    [
      highlightAyah,
      isPlaying,
      playFrom,
      preferences.focusMode,
      preferences.fontSize,
      selectedVerseKey,
      startLesson,
      startWelcome,
      togglePlay,
      updatePreferences,
      verses,
    ],
  );

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
      startWelcome,
      startLesson,
      next,
      back,
      skip,
      ask,
    }),
    [ask, back, index, kind, loading, next, progress, reply, skip, startLesson, startWelcome, steps],
  );

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}
